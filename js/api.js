/**
 * Transport Google Apps Script: JSONP GET + POST dispatch + batch response.
 */
// =========================
// API EKSTERNAL GOOGLE APPS SCRIPT
// =========================
const GAS_WEBAPP_BASE='https://script.google.com';
let activeApiUrl='';

function normalizeDeploymentId(value){
  let v=String(value||'').trim();

  // Jika tanpa sengaja ditempel URL, ambil Deployment ID saja.
  const match=v.match(/\/s\/(AKfy[a-zA-Z0-9_-]+)\/(?:exec|dev)(?:[?#].*)?$/i);
  if(match) v=match[1];

  return /^AKfy[a-zA-Z0-9_-]+$/.test(v) ? v : '';
}

function normalizeWorkspaceDomain(value){
  return String(value||'')
    .trim()
    .replace(/^https?:\/\//i,'')
    .replace(/^script\.google\.com\/a\//i,'')
    .replace(/^\/+|\/+$/g,'');
}

function getApiCandidates(){
  const id=normalizeDeploymentId(APP.DEPLOYMENT_ID);
  if(!id) return [];

  const domain=normalizeWorkspaceDomain(APP.WORKSPACE_DOMAIN);
  const urls=[];

  // URL produksi standar diprioritaskan. Jalur Workspace hanya fallback.
  urls.push(`${GAS_WEBAPP_BASE}/macros/s/${id}/exec`);

  if(domain){
    urls.push(`${GAS_WEBAPP_BASE}/a/${encodeURIComponent(domain)}/macros/s/${id}/exec`);
  }

  return [...new Set(urls)];
}

function getApiUrl(){
  if(activeApiUrl) return activeApiUrl;
  return getApiCandidates()[0]||'';
}

function isApiConfigured(){
  return getApiCandidates().length>0;
}

function jsonpRequest_(base,action,params={},timeoutMs=18000){
  return new Promise((resolve,reject)=>{
    const callback='__gasJsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    let settled=false;

    const timer=setTimeout(()=>{
      finish(new Error('Koneksi API timeout.'));
    },timeoutMs);

    function cleanup(){
      clearTimeout(timer);
      if(script.parentNode) script.parentNode.removeChild(script);
      try{ delete window[callback]; }catch(_){ window[callback]=undefined; }
    }

    function finish(err,data){
      if(settled) return;
      settled=true;
      cleanup();
      err ? reject(err) : resolve(data);
    }

    window[callback]=(data)=>finish(null,data);
    script.onerror=()=>finish(new Error('Endpoint Web App tidak dapat dimuat.'));

    const query=new URLSearchParams({
      action,
      callback,
      _:String(Date.now())
    });

    Object.entries(params||{}).forEach(([key,value])=>{
      if(value!==undefined && value!==null) query.set(key,String(value));
    });

    script.src=base + '?' + query.toString();
    document.head.appendChild(script);
  });
}

async function resolveApiUrl(){
  if(activeApiUrl) return activeApiUrl;

  const candidates=getApiCandidates();
  if(!candidates.length){
    throw new Error('Deployment ID Google Apps Script belum valid.');
  }

  const errors=[];

  for(const base of candidates){
    try{
      const ping=await jsonpRequest_(base,'ping',{},15000);
      if(ping && ping.ok){
        activeApiUrl=base;
        return activeApiUrl;
      }
      errors.push(base+' → ping tidak valid');
    }catch(err){
      errors.push(base+' → '+(err?.message||'gagal'));
    }
  }

  console.error('Semua kandidat Web App gagal:',errors);

  throw new Error(
    'Tidak dapat mengakses Web App. Pastikan DEPLOYMENT_ID berasal dari URL produksi /exec, bukan /dev, dan deployment dapat diakses oleh Anyone.'
  );
}

async function apiGet(action,params={}){
  const candidates=getApiCandidates();
  if(!candidates.length){
    throw new Error('Sistem belum terhubung ke server data.');
  }

  if(activeApiUrl){
    try{
      return await jsonpRequest_(activeApiUrl,action,params,45000);
    }catch(err){
      activeApiUrl='';
    }
  }

  let lastError=null;

  if(action==='ping'){
    for(const base of candidates){
      try{
        const data=await jsonpRequest_(base,action,params,18000);
        if(data?.ok){
          activeApiUrl=base;
          return data;
        }
        lastError=new Error(data?.message||'Respons ping tidak valid.');
      }catch(err){
        lastError=err;
      }
    }
  }else{
    const base=await resolveApiUrl();
    return jsonpRequest_(base,action,params,45000);
  }

  throw new Error(
    'Tidak dapat mengakses Web App. Pastikan DEPLOYMENT_ID berasal dari URL /exec, bukan /dev. '+
    (lastError?.message||'')
  );
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

async function readPostResult(requestId,timeoutMs=180000,shouldContinue=null){
  const started=Date.now();
  const chunks=[];
  let nextChunk=0;
  let serverReached=false;

  while(Date.now()-started < timeoutMs){
    if(typeof shouldContinue==='function' && !shouldContinue()){
      apiGet('postclear',{requestId}).catch(()=>{});
      throw new Error('REQUEST_CANCELLED');
    }

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

    if(typeof shouldContinue==='function' && !shouldContinue()){
      apiGet('postclear',{requestId}).catch(()=>{});
      throw new Error('REQUEST_CANCELLED');
    }

    apiGet('postclear',{requestId}).catch(()=>{});
    return parsed;
  }

  if(serverReached){
    throw new Error('Request sudah diterima Apps Script, tetapi pengambilan data belum selesai.');
  }

  throw new Error('Request POST belum mencapai Apps Script. Periksa deployment Web App.');
}

async function apiPost(action,payload,tokenOverride){
  // Jangan melakukan ping preflight sebelum POST.
  // Ini menghilangkan satu eksekusi GAS/cold-start dari jalur login.
  const requestToken=tokenOverride!==undefined
    ? String(tokenOverride||'')
    : String(state.auth?.token||'');

  const guardSession=!['loginbootstrap','logout'].includes(String(action||'').toLowerCase())
    && !!requestToken;

  const shouldContinue=()=>!guardSession || String(state.auth?.token||'')===requestToken;

  const candidates=getApiCandidates();
  if(!candidates.length){
    throw new Error('Deployment ID Google Apps Script belum valid.');
  }

  const base=activeApiUrl || candidates[0];
  activeApiUrl=base;

  const requestId=makeApiRequestId();
  const body=new URLSearchParams({
    action:String(action||''),
    requestId,
    token:requestToken,
    payload:JSON.stringify(payload ?? {})
  });

  let dispatchError=null;

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

  const timeout=['import','exportdata'].includes(action)
    ? 180000
    : 120000;

  // Beri doPost sedikit waktu agar marker/result tersedia sebelum polling GET.
  await sleepApi(action==='loginbootstrap' ? 250 : 120);

  try{
    return await readPostResult(requestId,timeout,shouldContinue);
  }catch(err){
    if(dispatchError){
      throw new Error('Request POST tidak dapat dikirim ke Google Apps Script.');
    }
    throw err;
  }
}

