/**
 * Transport Google Apps Script: JSONP GET + POST dispatch + batch response.
 */
// =========================
// API EKSTERNAL GOOGLE APPS SCRIPT
// =========================
const GAS_WEBAPP_BASE='https://script.google.com/macros/s/';

function getApiUrl(){
  const id=String(APP.DEPLOYMENT_ID||'').trim();
  if(!/^AKfy[a-zA-Z0-9_-]+$/.test(id)) return '';
  return GAS_WEBAPP_BASE + id + '/exec';
}

function isApiConfigured(){
  return !!getApiUrl();
}

function apiGet(action,params={}){
  return new Promise((resolve,reject)=>{
    const base=getApiUrl();
    if(!base){ reject(new Error('Sistem belum terhubung ke server data.')); return; }

    const callback='__gasJsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const timer=setTimeout(()=>finish(new Error('Koneksi API timeout.')),45000);

    function cleanup(){
      clearTimeout(timer);
      if(script.parentNode) script.parentNode.removeChild(script);
      try{ delete window[callback]; }catch(_){ window[callback]=undefined; }
    }
    function finish(err,data){
      cleanup();
      err ? reject(err) : resolve(data);
    }

    window[callback]=(data)=>finish(null,data);
    script.onerror=()=>finish(new Error('Tidak dapat terhubung ke API Google Apps Script. Pastikan deployment dapat diakses oleh Anyone.'));
    const query=new URLSearchParams({action,callback,_:String(Date.now())});
    Object.entries(params||{}).forEach(([key,value])=>{
      if(value!==undefined && value!==null) query.set(key,String(value));
    });
    const sep=base.includes('?')?'&':'?';
    script.src=base + sep + query.toString();
    document.head.appendChild(script);
  });
}

function makeApiRequestId(){
  try{
    const bytes=new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return 'req_'+Date.now().toString(36)+'_'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }catch(_){
    return 'req_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
  }
}

function sleepApi(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

async function readPostResult(requestId,timeoutMs=180000){
  const started=Date.now();
  const chunks=[];
  let nextChunk=0;
  let serverReached=false;

  while(Date.now()-started < timeoutMs){
    const res=await apiGet('postresultbatch',{
      requestId,
      start:nextChunk,
      batch:6
    });

    if(res?.pending){
      if(res?.processing) serverReached=true;
      await sleepApi(500);
      continue;
    }

    if(!res?.ok){
      throw new Error(res?.message || 'Gagal mengambil respons server.');
    }

    if(!res?.ready){
      await sleepApi(500);
      continue;
    }

    const start=Math.max(Number(res.start)||0,0);
    const total=Math.max(Number(res.total)||1,1);
    const batch=Array.isArray(res.chunks)?res.chunks:[];

    if(!batch.length && start<total){
      await sleepApi(400);
      continue;
    }

    batch.forEach((part,i)=>{
      chunks[start+i]=String(part??'');
    });

    nextChunk=start+batch.length;

    if(nextChunk<total){
      continue;
    }

    // Pastikan semua bagian benar-benar sudah ada.
    const missingIndex=chunks
      .slice(0,total)
      .findIndex(part=>typeof part!=='string');

    if(missingIndex>=0){
      nextChunk=missingIndex;
      await sleepApi(350);
      continue;
    }

    const raw=chunks.slice(0,total).join('');
    let parsed;

    try{
      parsed=JSON.parse(raw);
    }catch(err){
      console.error('Respons mentah GAS:',raw.slice(0,500));
      throw new Error('Respons server tidak dapat dibaca.');
    }

    apiGet('postclear',{requestId}).catch(()=>{});
    return parsed;
  }

  if(serverReached){
    throw new Error('Request sudah diterima Apps Script, tetapi pengambilan data belum selesai.');
  }

  throw new Error('Request POST belum mencapai Apps Script. Periksa deployment Web App.');
}

async function testPostRuntime(){
  const res=await apiPost('posttest',{},'');
  if(res?.__processing){
    throw new Error('Marker sementara terbaca sebagai hasil akhir. Muat ulang index.html versi terbaru.');
  }
  console.log('POST Runtime FINAL:',res);
  return res;
}

function apiPost(action,payload,tokenOverride){
  return new Promise((resolve,reject)=>{
    const base=getApiUrl();
    if(!base){
      reject(new Error('Sistem belum terhubung ke server data.'));
      return;
    }

    const requestId=makeApiRequestId();
    const body=new URLSearchParams({
      action:String(action||''),
      requestId,
      token:tokenOverride!==undefined ? String(tokenOverride||'') : String(state.auth?.token||''),
      payload:JSON.stringify(payload ?? {})
    });

    let dispatchError=null;

    // Request dibuat sebagai "simple request" sehingga tidak memerlukan
    // CORS response header dari Apps Script. Respons fetch bersifat opaque;
    // hasil sebenarnya tetap dibaca lewat endpoint JSONP postresultbatch.
    fetch(base,{
      method:'POST',
      mode:'no-cors',
      credentials:'omit',
      cache:'no-store',
      redirect:'follow',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body:body.toString()
    }).catch(err=>{
      console.error('Pengiriman POST GAS gagal:',err);
      dispatchError=err;
    });

    const timeout=['import','exportdata'].includes(action) ? 180000 : 120000;

    readPostResult(requestId,timeout)
      .then(resolve)
      .catch(err=>{
        if(dispatchError){
          reject(new Error('Request POST tidak dapat dikirim ke Google Apps Script.'));
        }else{
          reject(err);
        }
      });
  });
}
