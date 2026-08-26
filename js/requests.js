/**
 * Pengajuan perubahan siswa dan konflik sinkronisasi.
 */
// =========================
// PENGAJUAN PERUBAHAN SISWA
// =========================
function bindRequestControls(){
  const refresh=document.getElementById('refreshRequests');if(refresh)refresh.addEventListener('click',()=>loadRequests(false));
  const filter=document.getElementById('requestStatusFilter');if(filter)filter.addEventListener('change',renderRequests);
  const body=document.getElementById('requestTableBody');if(body)body.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-review-request]');if(!btn)return;
    const choice=btn.dataset.choice,id=btn.dataset.reviewRequest;
    const isApprove=choice==='APPROVE';
    const isReapply=choice==='REAPPLY';
    const text=isApprove?'menyetujui':isReapply?'menerapkan ulang':'menolak';

    const confirmed=await appConfirm(
      `Anda akan ${text} pengajuan perubahan data ini.`,
      {
        title:isApprove?'Setujui Pengajuan':isReapply?'Terapkan Ulang Pengajuan':'Tolak Pengajuan',
        okText:isApprove?'Setujui':isReapply?'Terapkan Ulang':'Tolak',
        type:(isApprove||isReapply)?'success':'danger'
      }
    );
    if(!confirmed)return;

    try{
      setLoading(true,isReapply?'Menerapkan ulang perubahan...':'Menyimpan keputusan...');
      const res=await apiPost('reviewrequest',{requestId:id,choice});
      if(!res?.ok) throw new Error(res?.message||'Keputusan belum berhasil disimpan.');

      toast(res.message,'success');

      if(res.student){
        const idx=state.students.findIndex(s=>
          String(s.id||'')===String(res.student.id||'') ||
          String(s.nisn||'')===String(res.student.nisn||'')
        );
        if(idx>=0){
          state.students[idx]={...state.students[idx],...res.student};
          state.filtered=state.students;
          renderStudentTable();
        }
      }

      await Promise.all([
        loadRequests(true),
        loadStudentPage(true),
        refreshDashboardSummary(),
        loadActivities(true,false)
      ]);
    }catch(err){
      handleError(err);
    }finally{
      setLoading(false);
    }
  });
}
async function loadRequests(silent=false){
  if(state.auth.user?.role!=='ADMIN')return;
  try{if(!silent)setLoading(true,'Memuat pengajuan data...');const res=await apiPost('requests',{});if(!res?.ok)throw new Error(res?.message||'Pengajuan belum dapat dimuat.');state.requests=Array.isArray(res.requests)?res.requests:[];
    if(state.dashboard) state.dashboard.pendingRequests=state.requests.filter(r=>String(r.status||'').toUpperCase()==='PENDING').length;
    renderRequests();renderStats();}catch(err){if(!silent)handleError(err);}finally{if(!silent)setLoading(false);}
}
function renderRequests(){
  const pending=state.requests.filter(r=>String(r.status||'').toUpperCase()==='PENDING').length;
  const badge=document.getElementById('requestMenuBadge');if(badge){badge.textContent=pending;badge.classList.toggle('d-none',pending===0)};
  const body=document.getElementById('requestTableBody');if(!body)return;
  const status=document.getElementById('requestStatusFilter')?.value||'';
  const rows=state.requests.filter(r=>!status||String(r.status||'').toUpperCase()===status);
  if(!rows.length){body.innerHTML='<tr><td colspan="5" class="empty-state">Tidak ada pengajuan pada status ini.</td></tr>';return;}
  body.innerHTML=rows.map(r=>{
    const changes=r.changes||{};const items=Object.entries(changes).map(([k,v])=>`<div class="request-change"><strong>${esc(fieldDisplayLabel(k))}</strong><br><span class="request-old">${esc(String(r.old_values?.[k]??'(kosong)'))}</span> <span class="activity-arrow">→</span> <span class="request-new">${esc(String(v||'(kosong)'))}</span></div>`).join('');
    const st=String(r.status||'PENDING').toUpperCase();
    const cls=st==='APPROVED'
      ? 'request-approved'
      : st==='REJECTED'
        ? 'request-rejected'
        : st==='SUPERSEDED'
          ? 'request-superseded'
          : 'request-pending';
    const label=st==='APPROVED'
      ? 'Disetujui'
      : st==='REJECTED'
        ? 'Ditolak'
        : st==='SUPERSEDED'
          ? 'Digantikan'
          : 'Menunggu';
    const actions=st==='PENDING'
      ? `<button class="btn btn-success btn-sm" data-review-request="${esc(r.request_id)}" data-choice="APPROVE">Setujui</button> <button class="btn btn-outline-danger btn-sm" data-review-request="${esc(r.request_id)}" data-choice="REJECT">Tolak</button>`
      : st==='APPROVED'
        ? `<button class="btn btn-outline-success btn-sm" data-review-request="${esc(r.request_id)}" data-choice="REAPPLY"><i class="bi bi-arrow-repeat me-1"></i>Terapkan Ulang</button>`
        : '-';
    const reviewNote=r.catatan?`<div class="small-note mt-1">${esc(r.catatan)}</div>`:'';
    return `<tr><td class="text-nowrap">${esc(formatActivityTime(r.waktu||''))}</td><td><strong>${esc(r.nama||'-')}</strong><div class="small-note">NISN: ${esc(r.nisn||'-')}</div></td><td style="min-width:280px">${items||'-'}</td><td><span class="request-status ${cls}">${label}</span>${reviewNote}</td><td class="text-end text-nowrap">${actions}</td></tr>`;
  }).join('');
}

// =========================
// KONFLIK SINKRONISASI
// =========================
function bindConflictControls(){
  const refresh=document.getElementById('refreshConflictsBtn');if(refresh)refresh.addEventListener('click',()=>loadConflicts());
  const body=document.getElementById('conflictTableBody');if(!body)return;
  body.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-resolve-conflict]');if(!btn)return;
    const id=btn.dataset.resolveConflict,choice=btn.dataset.choice;
    const label=choice==='DAPODIK'?'data Dapodik terbaru':'data pada aplikasi';
    const confirmed=await appConfirm(
      `Gunakan ${label} untuk menyelesaikan perbedaan data ini?`,
      {title:'Selesaikan Perbedaan Data',okText:'Gunakan Data',type:'warning'}
    );
    if(!confirmed)return;
    try{setLoading(true,'Menyimpan keputusan...');const res=await apiPost('resolveconflict',{conflictId:id,choice});if(!res||res.ok===false)throw new Error(res?.message||'Keputusan belum berhasil disimpan.');toast(res.message,'success');await loadData();await loadConflicts(true);}catch(err){handleError(err);}finally{setLoading(false);}
  });
}
async function loadConflicts(silent=false){
  if(state.auth.user?.role!=='ADMIN')return;
  try{if(!silent)setLoading(true,'Memuat perbedaan data...');const res=await apiPost('conflicts',{});if(!res||res.ok===false)throw new Error(res?.message||'Perbedaan data belum dapat dimuat.');state.conflicts=Array.isArray(res.conflicts)?res.conflicts:[];
    if(state.dashboard) state.dashboard.conflicts=state.conflicts.length;
    renderConflicts();renderStats();}catch(err){if(!silent)handleError(err);}finally{if(!silent)setLoading(false);}
}
function renderConflicts(){
  const badge=document.getElementById('conflictBadge');if(badge){badge.textContent=state.conflicts.length;badge.classList.toggle('d-none',state.conflicts.length===0);}
  const body=document.getElementById('conflictTableBody');if(!body)return;
  if(!state.conflicts.length){body.innerHTML='<tr><td colspan="6" class="empty-state">Tidak ada perbedaan data yang perlu ditinjau.</td></tr>';return;}
  body.innerHTML=state.conflicts.map(c=>`<tr><td><strong>${esc(c.nama||'-')}</strong><div class="small-note">NISN: ${esc(c.nisn||'-')}</div></td><td><span class="badge text-bg-light">${esc(c.field_label||c.field_key)}</span></td><td>${esc(c.old_dapodik||'-')}</td><td class="bg-light"><strong>${esc(c.app_value||'-')}</strong></td><td class="table-warning"><strong>${esc(c.new_dapodik||'-')}</strong></td><td class="text-end text-nowrap"><button class="btn btn-outline-secondary btn-sm" data-resolve-conflict="${esc(c.conflict_id)}" data-choice="APP">Pertahankan Aplikasi</button> <button class="btn btn-warning btn-sm" data-resolve-conflict="${esc(c.conflict_id)}" data-choice="DAPODIK">Gunakan Dapodik</button></td></tr>`).join('');
}
