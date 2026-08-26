/**
 * Form peserta didik, kelengkapan, tabel, pagination, detail, simpan, hapus.
 */
function completenessInfo(student){
  const requiredFields=COMPLETENESS_FIELDS.filter(k=>!OPTIONAL_COMPLETENESS_FIELDS.includes(k));
  const missing=requiredFields.filter(k=>!String(student?.[k]??'').trim());
  const percent=requiredFields.length
    ? Math.round(((requiredFields.length-missing.length)/requiredFields.length)*100)
    : 100;
  return {percent,missing};
}
function collectStudentFormData(){const out={};STUDENT_FIELDS.forEach(k=>out[k]=field(k));return out;}
function updateCompletionCard(student){
  const source=student||collectStudentFormData();
  const info=completenessInfo(source);
  const value=document.getElementById('completionValue');
  const bar=document.getElementById('completionBar');
  const text=document.getElementById('completionText');

  if(value) value.textContent=info.percent+'%';
  if(bar) bar.style.width=info.percent+'%';
  if(text){
    text.textContent=info.missing.length
      ? `${info.missing.length} data utama masih perlu dilengkapi.`
      : 'Data utama sudah lengkap.';
  }

  // Bersihkan penanda lama.
  document.querySelectorAll('#studentFormPanel .form-field-wrap.field-missing')
    .forEach(el=>el.classList.remove('field-missing'));

  // Tandai hanya field yang termasuk data utama.
  // Field Data Wali tidak pernah masuk daftar ini.
  info.missing.forEach(key=>{
    const input=document.getElementById('f-'+key.replace(/_/g,'-'));
    const wrap=input?.closest('.form-field-wrap');
    if(wrap) wrap.classList.add('field-missing');
  });

  const card=document.getElementById('completionCard');
  if(card){
    card.classList.toggle('has-missing-data',info.missing.length>0);
  }
}

function renderStudentFormFields(){
  const root=document.getElementById('studentFormFields');
  root.innerHTML=FORM_SECTIONS.map(section=>`<div class="form-section-title">${esc(section.title)}</div><div class="row g-3">${section.fields.map(renderFormField).join('')}</div>`).join('');
  root.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('input',()=>updateCompletionCard());
    el.addEventListener('change',()=>updateCompletionCard());
  });
}

function renderFormField(f){
  const id='f-'+f.key.replace(/_/g,'-'),span=f.span||4,req=f.required?' required':'',cls=`form-control${f.upper?' text-uppercase':''}`;
  let control='';
  if(f.type==='select'){
    const options=OPTION_SETS[f.options]||[];
    control=`<select class="form-select" id="${id}"${req}><option value="">- Pilih -</option>${options.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select>`;
  }else if(f.type==='textarea'){
    control=`<textarea class="${cls}" id="${id}" rows="2"${req}></textarea>`;
  }else{
    const type=f.type||'text',step=type==='number'?' step="any" min="0"':'';
    control=`<input type="${type}" class="${cls}" id="${id}"${step}${req}>`;
  }
  const xlSpan = Math.min(Math.max(span,1),12);
  let mdSpan = xlSpan;
  if(xlSpan<=2) mdSpan=3;
  else if(xlSpan===3) mdSpan=4;
  else if(xlSpan===4) mdSpan=6;
  else if(xlSpan>=5 && xlSpan<=6) mdSpan=6;
  else mdSpan=12;

  return `<div class="col-12 col-md-${mdSpan} col-xl-${xlSpan}">
    <div class="form-field-wrap">
      <label class="form-label" for="${id}">${esc(f.label)}${f.required?' *':''}</label>
      ${control}
    </div>
  </div>`;
}

function currentStudentPageParams(){
  return {
    page:Math.max(1,Number(state.page)||1),
    pageSize:Math.max(10,Math.min(100,Number(state.pageSize)||25)),
    q:(document.getElementById('searchInput')?.value||'').trim(),
    kelas:document.getElementById('classFilter')?.value||'',
    jk:document.getElementById('genderFilter')?.value||'',
    full:!!state.tableFull
  };
}

function applyBootstrapResponse(res){
  if(!res || res.ok===false){
    throw new Error(res?.message||'Data awal belum dapat dimuat.');
  }

  if(res.user){
    state.auth.user=res.user;
    localStorage.setItem('rekap_pd_user',JSON.stringify(res.user));
  }

  if(state.auth.user?.role==='SISWA'){
    const own=res.student||null;
    state.students=own?[own]:[];
    state.studentTotal=own?1:0;
    state.pendingRequests=Array.isArray(res.pendingRequests)?res.pendingRequests:[];
    state.dashboard=null;

    applyRoleUI();
    showView('students',{skipEnsure:true});

    if(own){
      openStudentForm(own);
      setTimeout(showStudentPendingNotice,0);
    }else{
      const listPanel=document.getElementById('studentListPanel');
      if(listPanel) listPanel.classList.add('d-none');
      toast('Informasi peserta didik untuk akun ini tidak ditemukan.','warning');
    }

    return;
  }

  state.dashboard=res.dashboard||{};
  state.activities=Array.isArray(state.dashboard.recentActivities)
    ? state.dashboard.recentActivities
    : [];

  state.students=Array.isArray(res.students)?res.students:[];
  state.studentTotal=Number(res.total)||0;
  state.studentClasses=Array.isArray(res.classes)?res.classes:[];
  state.page=Math.max(1,Number(res.page)||1);
  state.pageSize=Math.max(10,Number(res.pageSize)||25);

  renderAll();
  applyRoleUI();

  if(res.dashboardPending){
    setTimeout(()=>refreshDashboardSummary(),0);
  }
}


async function loadData(options={}){
  if(!getApiUrl()){
    setLoading(false);
    toast('Sistem belum terhubung ke database. Hubungi administrator.','danger');
    updateDbStatus(false,'Belum terhubung');
    return;
  }

  if(!state.auth.token){
    showLogin();
    return;
  }

  const isStudent=state.auth.user?.role==='SISWA';
  const background=!!options.background;

  if(!background){
    setLoading(true,isStudent?'Mengambil data Anda...':'Memuat ringkasan...');
  }

  try{
    const res=await apiPost('bootstrap',currentStudentPageParams(),state.auth.token);
    applyBootstrapResponse(res);
    updateDbStatus(true,'Online');
  }catch(err){
    if(authExpired(err?.message)){
      clearSession();
      showLogin();
      toast('Sesi Anda telah berakhir. Silakan masuk kembali.','warning');
      return;
    }
    handleError(err);
  }finally{
    if(!background) setLoading(false);
  }
}

async function loadStudentPage(silent=false){
  if(state.auth.user?.role!=='ADMIN') return;

  const seq=++state.studentPageRequestSeq;
  const params=currentStudentPageParams();

  try{
    if(!silent){
      const info=document.getElementById('tableInfo');
      if(info) info.textContent='Memuat data...';
    }

    const res=await apiPost('studentpage',params);
    if(seq!==state.studentPageRequestSeq) return;
    updateDbStatus(true,'Online');
    if(!res?.ok) throw new Error(res?.message||'Data peserta didik belum dapat dimuat.');

    state.students=Array.isArray(res.students)?res.students:[];
    state.studentTotal=Number(res.total)||0;
    state.page=Math.max(1,Number(res.page)||1);
    state.pageSize=Math.max(10,Number(res.pageSize)||state.pageSize);

    if(Array.isArray(res.classes)){
      state.studentClasses=res.classes;
      renderStudentFilters();
    }

    renderStudentTable();
  }catch(err){
    if(seq!==state.studentPageRequestSeq) return;
    if(/REQUEST_CANCELLED/i.test(String(err?.message||''))) return;
    handleError(err);
  }
}

async function refreshDashboardSummary(){
  if(state.auth.user?.role!=='ADMIN') return;
  try{
    const res=await apiPost('dashboard',{});
    if(!res?.ok) return;
    state.dashboard=res.dashboard||state.dashboard||{};
    state.activities=Array.isArray(state.dashboard.recentActivities)
      ? state.dashboard.recentActivities
      : state.activities;
    renderStats();
    renderActivityPreview();
    if(document.getElementById('view-dashboard')?.classList.contains('active')) scheduleDashboardRender();
    if(document.getElementById('view-gender')?.classList.contains('active')) scheduleGenderRender();
    if(document.getElementById('view-religion')?.classList.contains('active')) renderReligionRecap();
  }catch(_){}
}

function renderAll(){
  renderStats();
  renderStudentFilters();
  renderStudentTable();
  if(document.getElementById('view-dashboard')?.classList.contains('active')) scheduleDashboardRender();
  if(document.getElementById('view-gender')?.classList.contains('active')) scheduleGenderRender();
  if(document.getElementById('view-religion')?.classList.contains('active')) renderReligionRecap();
  renderActivityPreview();
}

function renderStats(){
  const d=state.dashboard||{};

  document.getElementById('statTotal').textContent=formatNumber(Number(d.total)||0);
  document.getElementById('statL').textContent=formatNumber(Number(d.l)||0);
  document.getElementById('statP').textContent=formatNumber(Number(d.p)||0);
  document.getElementById('statRombel').textContent=formatNumber(Number(d.rombel)||0);

  const set=(id,v)=>{
    const el=document.getElementById(id);
    if(el) el.textContent=formatNumber(Number(v)||0);
  };

  set('statPendingRequests',d.pendingRequests);
  set('statConflicts',d.conflicts);
  set('statIncomplete',d.incomplete);
  set('statTodayActivities',d.todayActivities);
}
function bindStudentControls(){
  let searchTimer=null;

  ['searchInput','classFilter','genderFilter','pageSize'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;

    el.addEventListener(id==='searchInput'?'input':'change',()=>{
      state.page=1;
      state.pageSize=Number(document.getElementById('pageSize')?.value)||25;

      if(id==='searchInput'){
        clearTimeout(searchTimer);
        searchTimer=setTimeout(()=>loadStudentPage(true),350);
      }else{
        loadStudentPage(true);
      }
    });
  });

  document.getElementById('addStudentBtn').addEventListener('click',()=>{
    if(state.auth.user?.role==='ADMIN') openStudentForm();
  });
  document.getElementById('backStudentForm').addEventListener('click',closeStudentForm);
  document.getElementById('cancelStudentForm').addEventListener('click',closeStudentForm);
  document.getElementById('studentForm').addEventListener('submit',saveStudent);

  document.getElementById('deleteStudentFormBtn').addEventListener('click',()=>{
    const id=field('id');
    if(id) removeStudent(id);
  });

  document.getElementById('exportBtn').addEventListener('click',exportExcel);

  document.getElementById('toggleFullTableBtn').addEventListener('click',()=>{
    state.tableFull=!state.tableFull;
    state.page=1;
    loadStudentPage(true);
  });

}
function renderStudentFilters(){
  const select=document.getElementById('classFilter');
  if(!select) return;

  const current=select.value;
  const classes=Array.isArray(state.studentClasses)?state.studentClasses:[];

  select.innerHTML='<option value="">Semua Kelas</option>'+
    classes.map(v=>`<option value="${esc(v)}">Kelas ${esc(v)}</option>`).join('');

  if(classes.includes(current)) select.value=current;
}

function studentNameCell(s){
  return `<div class="student-name-action">
    <button type="button"
      class="student-name-trigger"
      onclick="selectStudentAction('${jsEsc(s.id)}')"
      title="Klik nama untuk menampilkan tombol ubah">
      ${esc(s.nama||'-')}
    </button>
  </div>`;
}

function studentNumberCell(s,number){
  const selected=state.selectedStudentActionId===s.id;
  if(selected){
    return `<td class="student-number-cell">
      <button type="button"
        class="student-number-edit"
        onclick="event.stopPropagation();editStudent('${jsEsc(s.id)}')"
        title="Ubah data ${esc(s.nama)}"
        aria-label="Ubah data ${esc(s.nama)}">
        <i class="bi bi-pencil"></i>
      </button>
    </td>`;
  }
  return `<td class="student-number-cell">${number}</td>`;
}

function selectStudentAction(id){
  state.selectedStudentActionId = state.selectedStudentActionId===id ? '' : id;
  renderStudentTable();
}

function renderStudentTable(){
  const tbody=document.getElementById('studentTableBody');
  const thead=document.getElementById('studentTableHead');
  const toggle=document.getElementById('toggleFullTableBtn');
  const total=Math.max(0,Number(state.studentTotal)||0);
  const totalPages=Math.max(1,Math.ceil(total/state.pageSize));
  if(state.page>totalPages) state.page=totalPages;
  const start=(state.page-1)*state.pageSize;
  const rows=Array.isArray(state.students)?state.students:[];

  if(state.tableFull){
    const cols=EXCEL_COLUMNS.filter(c=>c.key);
    thead.innerHTML=`<tr><th>No</th>${cols.map(c=>`<th>${esc(c.group?`${c.label} ${c.group.replace('Data ','')}`:c.label)}</th>`).join('')}<th>Status</th></tr>`;
    toggle.innerHTML='<i class="bi bi-list me-1"></i>Tabel Ringkas';
    if(!rows.length){
      tbody.innerHTML=`<tr><td colspan="${cols.length+2}"><div class="empty-state"><div class="empty-icon"><i class="bi bi-inbox"></i></div>Tidak ada data peserta didik.</div></td></tr>`;
    }else{
      tbody.innerHTML=rows.map((s,i)=>{
        const cells=cols.map(c=>{
          if(c.key==='nama') return `<td>${studentNameCell(s)}</td>`;
          const value=c.key==='tanggal_lahir'?(formatDateId(s[c.key])||'-'):(s[c.key]||'-');
          return `<td>${esc(value)}</td>`;
        }).join('');
        return `<tr class="${state.selectedStudentActionId===s.id?'student-row-selected':''}">${studentNumberCell(s,start+i+1)}${cells}<td>${statusBadge(s.status)}</td></tr>`;
      }).join('');
    }
  }else{
    thead.innerHTML=`<tr><th>No</th><th>Nama</th><th>Kelas</th><th>NIPD</th><th>NISN</th><th>JK</th><th>Tempat Lahir</th><th>Tanggal Lahir</th><th>Agama</th><th>Alamat</th><th>Ayah</th><th>Ibu</th><th>Wali</th><th>Status</th></tr>`;
    toggle.innerHTML='<i class="bi bi-layout-three-columns me-1"></i>Semua Kolom';
    if(!rows.length){
      tbody.innerHTML=`<tr><td colspan="14"><div class="empty-state"><div class="empty-icon"><i class="bi bi-inbox"></i></div>Tidak ada data peserta didik.</div></td></tr>`;
    }else{
      tbody.innerHTML=rows.map((s,i)=>`<tr class="${state.selectedStudentActionId===s.id?'student-row-selected':''}">
        ${studentNumberCell(s,start+i+1)}
        <td>${studentNameCell(s)}</td>
        <td>${esc(s.kelas||'-')}</td>
        <td>${esc(s.nipd||'-')}</td>
        <td>${esc(s.nisn)}</td>
        <td>${genderBadge(s.jk)}</td>
        <td>${esc(s.tempat_lahir||'-')}</td>
        <td>${esc(formatDateId(s.tanggal_lahir)||'-')}</td>
        <td>${esc(s.agama||'-')}</td>
        <td>${esc(fullAddress(s)||'-')}</td>
        <td>${esc(s.nama_ayah||'-')}</td>
        <td>${esc(s.nama_ibu||'-')}</td>
        <td>${esc(s.nama_wali||'-')}</td>
        <td>${statusBadge(s.status)}</td>
      </tr>`).join('');
    }
  }
  const end=Math.min(start+state.pageSize,total);
  document.getElementById('tableInfo').textContent=total?`Menampilkan ${start+1}-${end} dari ${formatNumber(total)} data`:'0 peserta didik';
  renderPagination(totalPages);
}

function renderPagination(totalPages){
  const el = document.getElementById('pagination');
  if(totalPages <= 1){ el.innerHTML=''; return; }

  let pages = [];
  const from = Math.max(1,state.page-2);
  const to = Math.min(totalPages,state.page+2);

  pages.push(`<li class="page-item ${state.page===1?'disabled':''}">
    <button class="page-link" onclick="changePage(${state.page-1})">&laquo;</button></li>`);

  if(from > 1) pages.push(`<li class="page-item"><button class="page-link" onclick="changePage(1)">1</button></li>`);
  if(from > 2) pages.push(`<li class="page-item disabled"><span class="page-link">…</span></li>`);

  for(let p=from;p<=to;p++){
    pages.push(`<li class="page-item ${p===state.page?'active':''}">
      <button class="page-link" onclick="changePage(${p})">${p}</button></li>`);
  }

  if(to < totalPages-1) pages.push(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
  if(to < totalPages) pages.push(`<li class="page-item"><button class="page-link" onclick="changePage(${totalPages})">${totalPages}</button></li>`);

  pages.push(`<li class="page-item ${state.page===totalPages?'disabled':''}">
    <button class="page-link" onclick="changePage(${state.page+1})">&raquo;</button></li>`);

  el.innerHTML = pages.join('');
}

function changePage(page){
  const totalPages=Math.max(1,Math.ceil((Number(state.studentTotal)||0)/state.pageSize));
  state.page=Math.max(1,Math.min(totalPages,page));
  loadStudentPage(true);
}

function openStudentForm(student=null){
  const isAdmin=state.auth.user?.role==='ADMIN';
  const isStudent=state.auth.user?.role==='SISWA';
  if(!isAdmin && !(isStudent && student)) return;
  document.getElementById('studentForm').reset();
  document.getElementById('f-id').value = '';
  document.getElementById('studentFormTitle').textContent = state.auth.user?.role==='SISWA' ? 'Data Saya' : (student ? 'Ubah Data Peserta Didik' : 'Tambah Peserta Didik');

  if(student){
    STUDENT_FIELDS.forEach(key => {
      let value = student[key] ?? '';
      if(key === 'tanggal_lahir') value = toDateInput(value);
      field(key,value);
    });
  }
  applyStudentFieldLocks();
  applyPendingRequestIndicators(student);
  updateCompletionCard(student||{});
  const listPanel=document.getElementById('studentListPanel');
  if(listPanel) listPanel.classList.add('d-none');
  document.getElementById('studentFormPanel').classList.remove('d-none');
  document.getElementById('pageTitle').textContent = state.auth.user?.role==='SISWA' ? 'Data Saya' : (student ? 'Ubah Data Peserta Didik' : 'Tambah Peserta Didik');
  document.getElementById('pageSubtitle').textContent = state.auth.user?.role==='SISWA' ? 'Tinjau data Anda dan sesuaikan bila diperlukan.' : (student ? 'Periksa dan sesuaikan data peserta didik.' : 'Masukkan data peserta didik secara lengkap.');
  const deleteBtn=document.getElementById('deleteStudentFormBtn');
  if(deleteBtn) deleteBtn.classList.toggle('d-none', !(isAdmin && student && student.id));
  document.querySelector('.main').scrollTo({top:0,behavior:'smooth'});
}


const STUDENT_LOCKED_FIELDS=['nama','nisn','nik','jk','tempat_lahir','tanggal_lahir','nama_ibu'];
const BANK_READONLY_FIELDS=['bank','nomor_rekening_bank','rekening_atas_nama'];
function applyStudentFieldLocks(){
  const isStudent=state.auth.user?.role==='SISWA';

  // Reset semua lock visual terlebih dahulu.
  document.querySelectorAll('#studentForm .student-locked, #studentForm .system-readonly').forEach(el=>{
    el.classList.remove('student-locked','system-readonly');
    el.readOnly=false;
    if(el.tagName==='SELECT') el.disabled=false;
    el.removeAttribute('aria-readonly');
    el.removeAttribute('title');
  });

  // Data Bank selalu hanya-baca untuk Admin maupun Siswa.
  BANK_READONLY_FIELDS.forEach(key=>{
    const el=document.getElementById('f-'+key.replace(/_/g,'-'));
    if(!el) return;
    if(el.tagName==='SELECT') el.disabled=true;
    else el.readOnly=true;
    el.classList.add('system-readonly');
    el.setAttribute('aria-readonly','true');
  });

  // Field identitas tertentu dikunci khusus role Siswa.
  if(!isStudent) return;
  STUDENT_LOCKED_FIELDS.forEach(key=>{
    const el=document.getElementById('f-'+key.replace(/_/g,'-'));
    if(!el) return;
    if(el.tagName==='SELECT') el.disabled=true;
    else el.readOnly=true;
    el.classList.add('student-locked');
    el.setAttribute('aria-readonly','true');
  });
}


function getPendingChangesForStudent(student){
  const pending=state.pendingRequests.filter(r=>String(r.status||'').toUpperCase()==='PENDING');
  const changes={};
  pending.forEach(r=>Object.assign(changes,r.changes||{}));
  return changes;
}
function applyPendingRequestIndicators(student){
  document.querySelectorAll('.pending-field-note,.pending-field-badge').forEach(x=>x.remove());
  if(state.auth.user?.role!=='SISWA')return;
  const changes=getPendingChangesForStudent(student||{});
  Object.entries(changes).forEach(([key,val])=>{
    const el=document.getElementById('f-'+key.replace(/_/g,'-')); if(!el)return;
    const wrap=el.closest('.form-field-wrap'); if(!wrap)return;
    const label=wrap.querySelector('.form-label');
    if(label)label.insertAdjacentHTML('beforeend','<span class="pending-field-badge"><i class="bi bi-hourglass-split"></i>Menunggu verifikasi</span>');
    wrap.insertAdjacentHTML('beforeend',`<div class="pending-field-note"><i class="bi bi-arrow-right-circle"></i>Di ajukan: <strong>${esc(String(val||'(kosong)'))}</strong></div>`);
  });
}
function closeStudentForm(){
  const isStudent=state.auth.user?.role==='SISWA';

  // Siswa tidak mempunyai "daftar peserta didik".
  // Batal/Kembali hanya mengembalikan form ke data terakhir.
  if(isStudent){
    resetStudentSelfForm();
    document.getElementById('pageTitle').textContent='Data Saya';
    document.getElementById('pageSubtitle').textContent='Tinjau data Anda dan sesuaikan bila diperlukan.';
    document.querySelector('.main').scrollTo({top:0,behavior:'smooth'});
    return;
  }

  document.getElementById('studentFormPanel').classList.add('d-none');
  document.getElementById('studentListPanel').classList.remove('d-none');

  const deleteBtn=document.getElementById('deleteStudentFormBtn');
  if(deleteBtn) deleteBtn.classList.add('d-none');

  document.getElementById('pageTitle').textContent=titles.students[0];
  document.getElementById('pageSubtitle').textContent=titles.students[1];
  document.querySelector('.main').scrollTo({top:0,behavior:'smooth'});
}

async function editStudent(id){
  const role=state.auth.user?.role;
  if(role!=='ADMIN' && role!=='SISWA') return;

  if(role==='SISWA'){
    const student=state.students.find(s=>s.id===id) || state.students[0];
    if(student) openStudentForm(student);
    return;
  }

  try{
    setLoading(true,'Mengambil biodata peserta didik...');
    const res=await apiPost('studentdetail',{id});
    if(!res?.ok || !res.student) throw new Error(res?.message||'Data peserta didik tidak ditemukan.');
    openStudentForm(res.student);
  }catch(err){
    handleError(err);
  }finally{
    setLoading(false);
  }
}

function showStudentPendingNotice(){
  if(state.auth.user?.role!=='SISWA') return;

  const existing=document.getElementById('studentPendingChangeNotice');
  if(existing) existing.remove();

  if(!Array.isArray(state.pendingRequests) || !state.pendingRequests.length) return;

  const form=document.getElementById('studentForm');
  if(!form) return;

  const box=document.createElement('div');
  box.id='studentPendingChangeNotice';
  box.className='alert alert-warning border-0 mb-3';
  box.innerHTML=`
    <div class="d-flex gap-2 align-items-start">
      <i class="bi bi-hourglass-split mt-1"></i>
      <div>
        <strong>Menunggu Persetujuan Admin</strong>
        <div class="small mt-1">
          Perubahan yang Anda kirim sudah tercatat sebagai pengajuan.
          Data utama tetap menampilkan nilai sebelumnya sampai pengajuan disetujui.
        </div>
      </div>
    </div>`;
  form.prepend(box);
}

async function saveStudent(e){
  e.preventDefault();
  if(!validateRequiredFields(document.getElementById('studentForm'))) return;

  const data = {};
  STUDENT_FIELDS.forEach(key => data[key] = field(key));

  if(!data.nisn || !data.nama){
    toast('NISN dan nama wajib diisi.','danger');
    return;
  }

  try{
    setLoading(true,'Menyimpan data peserta didik...');
    const res = await apiPost('save',data);
    if(!res || res.ok === false) throw new Error(res?.message || 'Data belum berhasil disimpan.');
    toast(res.message || 'Data berhasil disimpan.','success');

    if(state.auth.user?.role==='SISWA'){
      // Siswa tidak mengubah data utama secara langsung.
      // Perubahan masuk ke pengajuan dan data asli tetap tampil sampai Admin menyetujui.
      if(res.pending){
        toast('Perubahan sudah diajukan. Data utama akan berubah setelah disetujui Admin.','info');
        await loadData();
      }else{
        await loadData();
      }
    }else{
      // Gunakan hasil yang sudah dibaca ulang dari Spreadsheet.
      if(res.student){
        const idx=state.students.findIndex(x=>String(x.id||'')===String(res.student.id||''));
        if(idx>=0){
          state.students[idx]={...state.students[idx],...res.student};
          renderStudentTable();
        }
      }

      closeStudentForm();

      // Refresh server tetap dilakukan, tetapi hasil simpan yang terverifikasi
      // sudah langsung ditampilkan lebih dahulu.
      await Promise.all([
        loadStudentPage(true),
        refreshDashboardSummary()
      ]);
    }
  }catch(err){ handleError(err); }
}

async function removeStudent(id){
  if(state.auth.user?.role!=='ADMIN') return;
  const s = state.students.find(x => x.id === id);
  if(!s) return;

  const confirmed=await appConfirm(
    `Anda akan menghapus data ${s.nama} (${s.nisn}).\n\nTindakan ini tidak dapat dibatalkan.`,
    {title:'Hapus Peserta Didik',okText:'Hapus Data',type:'danger'}
  );
  if(!confirmed) return;

  try{
    setLoading(true,'Menghapus data peserta didik...');
    const res = await apiPost('delete',{id});
    if(!res || res.ok === false) throw new Error(res?.message || 'Data belum berhasil dihapus.');
    toast(res.message || 'Data berhasil dihapus.','success');
    state.selectedStudentActionId='';
    closeStudentForm();
    await loadData();
  }catch(err){
    handleError(err);
  }
}

function normalizeFormSelectValue(key,value){
  let v=String(value??'').trim();

  if(['penghasilan_ayah','penghasilan_ibu','penghasilan_wali'].includes(key)){
    v=v
      .replace(/â€“|â€”|–|—/g,'-')
      .replace(/\s*-\s*/g,' - ')
      .replace(/\s+/g,' ')
      .trim();

    const aliases={
      'Rp1.000.001 - Rp3.000.000':'Rp1.000.001 - Rp3.000.000',
      '< Rp1.000.000':'< Rp1.000.000',
      'Kurang dari Rp. 500.000':'Kurang dari Rp. 500.000',
      'Rp. 500.000 - Rp. 999.999':'Rp. 500.000 - Rp. 999.999',
      'Rp. 1.000.000 - Rp. 1.999.999':'Rp. 1.000.000 - Rp. 1.999.999',
      'Rp. 2.000.000 - Rp. 4.999.999':'Rp. 2.000.000 - Rp. 4.999.999',
      'Rp. 5.000.000 - Rp. 20.000.000':'Rp. 5.000.000 - Rp. 20.000.000',
      'Lebih dari Rp. 20.000.000':'Lebih dari Rp. 20.000.000',
      'Tidak Berpenghasilan':'Tidak Berpenghasilan'
    };
    if(aliases[v]) return aliases[v];
  }

  return v;
}

function ensureSelectValueOption(el,value){
  if(!el || el.tagName!=='SELECT') return value;
  const v=String(value??'').trim();
  if(!v) return '';

  const exists=[...el.options].some(opt=>opt.value===v);
  if(!exists){
    const option=document.createElement('option');
    option.value=v;
    option.textContent=v;
    option.dataset.fromData='true';
    el.appendChild(option);
  }
  return v;
}

function field(key,value){
  const el=document.getElementById('f-'+key.replace(/_/g,'-'));
  if(!el) return '';

  if(arguments.length===2){
    let normalized=normalizeFormSelectValue(key,value);

    if(el.tagName==='SELECT'){
      normalized=ensureSelectValueOption(el,normalized);
    }

    el.value=normalized;
    return;
  }

  return (el.value||'').trim();
}
