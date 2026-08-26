/**
 * Helper UI umum: loading, error, confirm modal, validasi, toast.
 */
function updateDbStatus(online,text){
  const status=document.querySelector('.db-status');
  if(!status) return;
  const dot=status.querySelector('.db-dot');
  const label=status.querySelector('span:last-child');
  if(dot) dot.style.background=online?'#10b981':'#ef4444';
  if(label) label.textContent=text || (online?'Online':'Offline');
  status.style.background=online?'#ecfdf5':'#fef2f2';
  status.style.color=online?'#047857':'#b91c1c';
}

// =========================
// HELPERS
// =========================
function setLoading(show,text='Memproses permintaan...'){
  document.getElementById('loadingText').textContent=text;
  document.getElementById('loadingLayer').classList.toggle('show',!!show);
}

function handleError(err){
  setLoading(false);
  if(authExpired(err?.message)){ clearSession(); showLogin(); toast('Sesi Anda telah berakhir. Silakan masuk kembali.','warning'); return; }
  const message=err?.message || String(err) || 'Terjadi kesalahan.';
  toast(message,'danger');
  console.error(err);
}


let appConfirmResolver = null;

function appConfirm(message,options={}){
  const modalEl=document.getElementById('appConfirmModal');
  const titleEl=document.getElementById('appConfirmTitle');
  const messageEl=document.getElementById('appConfirmMessage');
  const okBtn=document.getElementById('appConfirmOk');
  const cancelBtn=document.getElementById('appConfirmCancel');
  const icon=document.getElementById('appConfirmIcon');

  const type=options.type||'warning';
  const title=options.title||'Konfirmasi';
  const okText=options.okText||'Lanjutkan';
  const cancelText=options.cancelText||'Batal';

  modalEl.classList.remove('is-danger','is-warning','is-success');
  modalEl.classList.add(`is-${type}`);
  titleEl.textContent=title;
  messageEl.textContent=String(message||'');
  okBtn.textContent=okText;
  cancelBtn.textContent=cancelText;

  okBtn.className='btn ' + (type==='danger'?'btn-danger':type==='success'?'btn-success':'btn-primary');
  icon.innerHTML=type==='danger'
    ? '<i class="bi bi-trash3"></i>'
    : type==='success'
      ? '<i class="bi bi-check2-circle"></i>'
      : '<i class="bi bi-exclamation-circle"></i>';

  return new Promise(resolve=>{
    if(appConfirmResolver) appConfirmResolver(false);
    appConfirmResolver=resolve;

    const modal=bootstrap.Modal.getOrCreateInstance(modalEl,{backdrop:'static',keyboard:true});

    const cleanup=result=>{
      if(!appConfirmResolver) return;
      const r=appConfirmResolver;
      appConfirmResolver=null;
      okBtn.onclick=null;
      cancelBtn.onclick=null;
      modalEl.removeEventListener('hidden.bs.modal',hiddenHandler);
      r(result);
    };
    const hiddenHandler=()=>cleanup(false);

    okBtn.onclick=()=>{ modal.hide(); cleanup(true); };
    cancelBtn.onclick=()=>{ modal.hide(); cleanup(false); };
    modalEl.addEventListener('hidden.bs.modal',hiddenHandler,{once:true});
    modal.show();
  });
}

function validateRequiredFields(form){
  if(!form) return true;
  const required=[...form.querySelectorAll('[required]')].filter(el=>!el.disabled);
  const invalid=required.find(el=>!String(el.value??'').trim());
  if(!invalid) return true;

  let label='';
  if(invalid.id){
    const lbl=form.querySelector(`label[for="${CSS.escape(invalid.id)}"]`);
    if(lbl) label=lbl.textContent.trim();
  }
  if(!label){
    const group=invalid.closest('.mb-3,.form-field,.col,.col-12,[class*="col-"]');
    const lbl=group?.querySelector('label');
    if(lbl) label=lbl.textContent.trim();
  }
  toast(`${label||'Kolom ini'} wajib diisi.`,'warning');
  invalid.focus();
  return false;
}

function toast(message,type='info'){
  const config={
    success:{title:'Berhasil',icon:'bi-check2',css:'toast-success'},
    danger:{title:'Tidak Berhasil',icon:'bi-exclamation-triangle',css:'toast-danger'},
    warning:{title:'Perhatian',icon:'bi-exclamation-circle',css:'toast-warning'},
    info:{title:'Informasi',icon:'bi-info-circle',css:'toast-info'}
  };
  const cfg=config[type]||config.info;
  const container=document.getElementById('toastContainer');
  if(!container) return;

  // Batasi toast yang menumpuk agar layar tetap bersih.
  const existing=container.querySelectorAll('.app-toast');
  if(existing.length>=3) existing[0].remove();

  const el=document.createElement('div');
  el.className=`toast app-toast ${cfg.css}`;
  el.setAttribute('role',type==='danger'?'alert':'status');
  el.setAttribute('aria-live',type==='danger'?'assertive':'polite');
  el.setAttribute('aria-atomic','true');
  el.innerHTML=`
    <div class="app-toast-inner">
      <div class="app-toast-icon"><i class="bi ${cfg.icon}"></i></div>
      <div class="app-toast-copy">
        <div class="app-toast-title">${cfg.title}</div>
        <div class="app-toast-message">${esc(message)}</div>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Tutup"></button>
    </div>
    <div class="app-toast-progress"><span></span></div>`;

  container.appendChild(el);
  const instance=new bootstrap.Toast(el,{delay:4800,autohide:true});
  el.addEventListener('hidden.bs.toast',()=>el.remove());
  instance.show();
}
