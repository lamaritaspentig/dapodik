/**
 * Login, logout, sesi, profile, role UI, navigasi, dan bootstrap Data Saya.
 */
function bindProfileControls(){
  const btn=document.getElementById('changePasswordBtn');if(btn)btn.addEventListener('click',()=>{document.getElementById('passwordForm').reset();bootstrap.Modal.getOrCreateInstance(document.getElementById('passwordModal')).show();});
  const form=document.getElementById('passwordForm');if(form)form.addEventListener('submit',async e=>{e.preventDefault();if(!validateRequiredFields(form))return;const oldPassword=document.getElementById('oldPassword').value,newPassword=document.getElementById('newPassword').value,confirmPassword=document.getElementById('confirmPassword').value;if(newPassword.length<8){toast('Kata sandi baru minimal 8 karakter.','warning');document.getElementById('newPassword').focus();return;}if(newPassword!==confirmPassword){toast('Ulangi kata sandi baru dengan benar.','warning');return;}try{setLoading(true,'Menyimpan kata sandi...');const res=await apiPost('changepassword',{oldPassword,newPassword});if(!res?.ok)throw new Error(res?.message||'Kata sandi belum berhasil diganti.');bootstrap.Modal.getOrCreateInstance(document.getElementById('passwordModal')).hide();toast(res.message,'success');}catch(err){handleError(err);}finally{setLoading(false);}});
}
function bindAuthControls(){
  document.getElementById('loginForm').addEventListener('submit',doLogin);
  document.getElementById('logoutBtn').addEventListener('click',doLogout);
  document.getElementById('toggleLoginPassword').addEventListener('click',()=>{
    const el=document.getElementById('loginPassword');
    const btn=document.getElementById('toggleLoginPassword');
    const showing=el.type==='password';
    el.type=showing?'text':'password';
    btn.innerHTML=showing?'<i class="bi bi-eye-slash"></i>':'<i class="bi bi-eye"></i>';
    btn.setAttribute('aria-label',showing?'Sembunyikan kata sandi':'Tampilkan kata sandi');
  });
}

function restoreSession(){
  try{
    state.auth.token=localStorage.getItem('rekap_pd_token')||'';
    state.auth.user=JSON.parse(localStorage.getItem('rekap_pd_user')||'null');
  }catch(_){ state.auth={token:'',user:null}; }
  if(state.auth.token){
    showApp();
    loadData();
  }else showLogin();
}

async function doLogin(e){
  e.preventDefault();
  setLoginMessage('');
  if(!getApiUrl()){
    setLoginMessage('Sistem belum terhubung ke database. Hubungi administrator.','danger');
    return;
  }
  const form=document.getElementById('loginForm');
  if(!validateRequiredFields(form)) return;
  const username=document.getElementById('loginUsername').value.trim();
  const password=document.getElementById('loginPassword').value;
  const btn=document.getElementById('loginSubmitBtn');
  btn.disabled=true;
  btn.innerHTML='<span class="spinner-border spinner-border-sm me-2"></span>Memverifikasi...';
  try{
    const res=await apiPost('loginbootstrap',{
      username,
      password,
      page:{
        page:1,
        pageSize:25,
        q:'',
        kelas:'',
        jk:'',
        full:false
      }
    },'');

    if(!res?.ok) throw new Error(res?.message||'Gagal masuk.');

    state.auth.token=res.token;
    state.auth.user=res.user;
    localStorage.setItem('rekap_pd_token',res.token);
    localStorage.setItem('rekap_pd_user',JSON.stringify(res.user));
    document.getElementById('loginPassword').value='';

    showApp();
    applyBootstrapResponse(res);
    updateDbStatus(true,'Online');
    setLoginMessage('','');
  }catch(err){
    setLoginMessage(formatLoginError(err?.message),'danger');
  }finally{
    btn.disabled=false;
    btn.innerHTML='<i class="bi bi-box-arrow-in-right me-2"></i>Masuk';
  }
}

function setLoginMessage(message,type='danger'){
  const box=document.getElementById('loginAlert');
  const text=document.getElementById('loginAlertText');
  if(!box||!text) return;
  if(!message){ box.classList.remove('show','danger','success'); text.textContent=''; return; }
  box.classList.remove('danger','success');
  box.classList.add('show',type==='success'?'success':'danger');
  text.textContent=message;
}

function formatLoginError(message){
  const m=String(message||'Gagal masuk.');
  if(/NISN atau password salah|Username atau password salah/i.test(m)) return 'Username/NISN atau kata sandi tidak sesuai.';
  if(/Tanggal lahir siswa belum tersedia/i.test(m)) return 'Tanggal lahir belum tersedia pada data Anda. Hubungi administrator sekolah.';
  if(/timeout/i.test(m)) return 'Server belum merespons. Silakan coba lagi.';
  if(/Anyone|terhubung ke API/i.test(m)) return 'Sistem belum dapat terhubung ke server data. Silakan coba lagi.';
  return m;
}

function doLogout(){
  const logoutToken=String(state.auth.token||'');

  // UI logout instan: jangan menunggu respons GAS.
  clearSession();
  showLogin();

  // Server logout tetap dijalankan di belakang layar.
  if(logoutToken){
    apiPost('logout',{},logoutToken).catch(err=>{
      console.warn('Logout server tidak selesai, tetapi sesi lokal sudah ditutup.',err);
    });
  }
}

function clearSession(){
  state.auth={token:'',user:null};
  state.students=[];
  state.studentTotal=0;
  state.studentClasses=[];
  state.dashboard=null;
  state.activities=[];
  state.requests=[];
  state.conflicts=[];
  state.pendingRequests=[];
  localStorage.removeItem('rekap_pd_token');
  localStorage.removeItem('rekap_pd_user');
}

function showLogin(){
  setLoading(false);
  setLoginMessage('');

  document.getElementById('loginScreen').classList.remove('d-none');
  document.getElementById('appShell').classList.add('d-none');

  const pass=document.getElementById('loginPassword');
  if(pass){
    pass.type='password';
    pass.value='';
  }

  const toggle=document.getElementById('toggleLoginPassword');
  if(toggle) toggle.innerHTML='<i class="bi bi-eye"></i>';

  const username=document.getElementById('loginUsername');
  if(username){
    requestAnimationFrame(()=>username.focus({preventScroll:true}));
  }
}

function showApp(){
  document.getElementById('loginScreen').classList.add('d-none');
  document.getElementById('appShell').classList.remove('d-none');
  applyRoleUI();

  // Aktifkan shell halaman tanpa memicu request data tambahan.
  if(state.auth.user?.role==='SISWA'){
    showView('students',{skipEnsure:true});
  }else{
    showView('dashboard',{skipEnsure:true});
  }
}

function applyRoleUI(){
  const u=state.auth.user||{};
  const isAdmin=u.role==='ADMIN';
  const isStudent=u.role==='SISWA';

  document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('d-none',!isAdmin));
  document.getElementById('userName').textContent=u.nama||u.username||'Akun';

  const pn=document.getElementById('profileName');
  const pm=document.getElementById('profileMeta');
  if(pn) pn.textContent=u.nama||u.username||'Akun';
  if(pm) pm.textContent=isAdmin?'Administrator':`Siswa • NISN ${u.nisn||'-'}`;

  document.getElementById('userRole').textContent=isAdmin?'ADMIN':'SISWA';
  document.getElementById('userAvatar').textContent=(u.nama||u.username||'U').charAt(0).toUpperCase();

  const studentLink=document.querySelector('[data-view="students"] span');
  if(studentLink) studentLink.textContent=isAdmin?'Data Peserta Didik':'Data Saya';

  ['addStudentBtn','exportBtn','toggleFullTableBtn'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle('d-none',!isAdmin);
  });

  const studentView=document.getElementById('view-students');
  if(studentView) studentView.classList.toggle('student-readonly',!isAdmin);

  const backBtn=document.getElementById('backStudentForm');
  if(backBtn) backBtn.classList.toggle('d-none',isStudent);

  const cancelBtn=document.getElementById('cancelStudentForm');
  if(cancelBtn){
    cancelBtn.textContent=isStudent?'Batalkan Perubahan':'Batal';
  }

  // Role siswa tidak memiliki halaman daftar.
  // Panel daftar disembunyikan permanen dan Data Saya menjadi halaman utama.
  const listPanel=document.getElementById('studentListPanel');
  if(listPanel && isStudent) listPanel.classList.add('d-none');

}

function authExpired(message){
  return /AUTH_REQUIRED|SESSION_EXPIRED/i.test(String(message||''));
}

function applyApiInfo(){
  const versionEl=document.getElementById('loginVersion');
  if(versionEl){
    versionEl.textContent='v'+String(APP.VERSION||'').split('.')[0];
    versionEl.title='Backend '+String(APP.VERSION||'');
  }

  const configured=isApiConfigured();
  const status=document.querySelector('.db-status');

  if(status){
    status.title=configured
      ? 'Koneksi akan diperiksa saat aplikasi mengakses data'
      : 'Deployment ID Google Apps Script belum valid';
  }

  if(!configured){
    updateLoginApiStatus('offline','Deployment ID belum valid');
    updateDbStatus(false,'Belum terhubung');
    setLoginMessage('','');
    return;
  }

  // Tidak melakukan ping/health-check pasif saat halaman dibuka.
  // Request nyata (login/bootstrap) menjadi sumber status koneksi.
  updateLoginApiStatus('', 'Koneksi diperiksa saat masuk');
  setLoginMessage('','');
}

function updateLoginApiStatus(stateName,text){
  const el=document.getElementById('loginApiStatus');
  const label=document.getElementById('loginApiText');
  if(!el||!label) return;

  el.classList.remove('online','offline','checking');

  if(stateName==='online') el.classList.add('online');
  else if(stateName==='offline') el.classList.add('offline');
  else if(stateName==='checking') el.classList.add('checking');

  const message=text||'';
  label.textContent=message;
  el.title=message;
  el.setAttribute('aria-label',message);
}

function bindNavigation(){
  document.querySelectorAll('.side-link').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  document.getElementById('mobileToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

function showView(view,options={}){
  const isStudent=state.auth.user?.role==='SISWA';

  // Siswa hanya boleh berada di Data Saya.
  if(isStudent) view='students';

  if(!isStudent && view!=='students') closeStudentForm();

  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const target=document.getElementById('view-'+view);
  if(target) target.classList.add('active');

  document.querySelectorAll('.side-link').forEach(b=>{
    b.classList.toggle('active',b.dataset.view===view);
  });

  document.getElementById('pageTitle').textContent=
    isStudent && view==='students' ? 'Data Saya' : titles[view][0];

  document.getElementById('pageSubtitle').textContent=
    isStudent && view==='students'
      ? 'Tinjau data Anda dan sesuaikan bila diperlukan.'
      : titles[view][1];

  document.getElementById('sidebar').classList.remove('open');

  if(isStudent && view==='students'){
    if(!options.skipEnsure) ensureStudentSelfForm();
    return;
  }

  if(view==='dashboard') scheduleDashboardRender();
  if(view==='gender') scheduleGenderRender();
  if(view==='religion') renderReligionRecap();

  if(view==='conflicts') loadConflicts();
  if(view==='activities') loadActivities(false,true);
  if(view==='requests') loadRequests(false);
  if(view==='import' && state.auth.user?.role==='ADMIN') loadBackupInfo(true);
  if(view==='students' && state.auth.user?.role==='ADMIN' && !state.students.length) loadStudentPage(true);
}

let studentSelfReloadPromise=null;

function ensureStudentSelfForm(){
  if(state.auth.user?.role!=='SISWA') return;

  const listPanel=document.getElementById('studentListPanel');
  if(listPanel) listPanel.classList.add('d-none');

  const own=Array.isArray(state.students) ? state.students[0] : null;
  const formPanel=document.getElementById('studentFormPanel');

  // Jika form sudah terbuka, jangan reset input yang sedang diedit.
  if(own && formPanel && !formPanel.classList.contains('d-none')){
    return;
  }

  if(own){
    openStudentForm(own);
    setTimeout(showStudentPendingNotice,0);
    return;
  }

  // State belum tersedia, misalnya showApp() dipanggil sebelum bootstrap selesai.
  // Hindari request ganda dan muat Data Saya sekali saja.
  if(studentSelfReloadPromise) return;

  studentSelfReloadPromise=(async()=>{
    try{
      setLoading(true,'Mengambil data Anda...');
      const res=await apiPost('bootstrap',{},state.auth.token);

      if(!res?.ok) throw new Error(res?.message||'Data Anda belum dapat dimuat.');

      if(res.user){
        state.auth.user=res.user;
        localStorage.setItem('rekap_pd_user',JSON.stringify(res.user));
      }

      const student=res.student||null;
      state.students=student?[student]:[];
      state.studentTotal=student?1:0;
      state.pendingRequests=Array.isArray(res.pendingRequests)?res.pendingRequests:[];

      if(!student){
        throw new Error('Informasi peserta didik untuk akun ini tidak ditemukan.');
      }

      openStudentForm(student);
      setTimeout(showStudentPendingNotice,0);
      updateDbStatus(true,'Online');
    }catch(err){
      handleError(err);
    }finally{
      setLoading(false);
      studentSelfReloadPromise=null;
    }
  })();
}

function resetStudentSelfForm(){
  if(state.auth.user?.role!=='SISWA') return false;

  const own=Array.isArray(state.students) ? state.students[0] : null;
  if(own){
    openStudentForm(own);
    setTimeout(showStudentPendingNotice,0);
  }else{
    ensureStudentSelfForm();
  }

  return true;
}
