/**
 * Aktivitas sistem, badge aktivitas, dan feed beranda.
 */
// =========================
// AKTIVITAS ADMIN
// =========================
function bindActivityControls(){
  const bell=document.getElementById('activityBell');
  const more=document.getElementById('dashboardActivityMore');
  const refresh=document.getElementById('refreshActivities');
  const filter=document.getElementById('activityActorFilter');
  if(bell) bell.addEventListener('click',()=>showView('activities'));
  if(more) more.addEventListener('click',()=>showView('activities'));
  if(refresh) refresh.addEventListener('click',()=>loadActivities(false,false));
  ['activityActorFilter','activitySearch','activityDateFrom','activityDateTo'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener(id==='activitySearch'?'input':'change',renderActivities)});
}

function activitySeenKey(){
  const username=state.auth.user?.username||'admin';
  return 'rekap_pd_activity_seen_'+username;
}

async function loadActivities(silent=false,markSeen=false){
  if(state.auth.user?.role!=='ADMIN') return;
  try{
    const res=await apiPost('activities',{limit:120});
    if(!res?.ok) throw new Error(res?.message||'Aktivitas belum dapat dimuat.');
    state.activities=Array.isArray(res.activities)?res.activities:[];
    renderActivities();
    renderActivityPreview();
    renderStats();
    if(markSeen) markActivitiesSeen();
    else updateActivityBadges();
  }catch(err){
    if(/REQUEST_CANCELLED/i.test(String(err?.message||''))) return;
    if(!silent) toast('Riwayat aktivitas belum dapat dimuat.','warning');
  }
}

function markActivitiesSeen(){
  const latest=state.activities[0]?.waktu||state.activities[0]?.timestamp||'';
  if(latest) localStorage.setItem(activitySeenKey(),latest);
  updateActivityBadges();
}

function updateActivityBadges(){
  if(state.auth.user?.role!=='ADMIN') return;
  const seen=localStorage.getItem(activitySeenKey())||'';
  const count=state.activities.filter(a=>(a.waktu||a.timestamp||'')>seen).length;
  const value=count>99?'99+':String(count);
  ['activityBellBadge','activityMenuBadge'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.textContent=value;
    el.classList.toggle('d-none',count===0);
  });
}

function renderActivities(){
  const root=document.getElementById('activityList');
  if(!root) return;
  const filter=document.getElementById('activityActorFilter')?.value||'';
  const q=(document.getElementById('activitySearch')?.value||'').trim().toLowerCase();
  const from=document.getElementById('activityDateFrom')?.value||'',to=document.getElementById('activityDateTo')?.value||'';
  let rows=state.activities.slice();
  if(filter) rows=rows.filter(a=>activityRole(a)===filter);
  if(q)rows=rows.filter(a=>[a.user,a.nama,a.nisn,a.field_label,a.nilai_lama,a.nilai_baru,a.aksi].join(' ').toLowerCase().includes(q));
  if(from)rows=rows.filter(a=>String(a.waktu||a.timestamp||'').slice(0,10)>=from);
  if(to)rows=rows.filter(a=>String(a.waktu||a.timestamp||'').slice(0,10)<=to);
  root.innerHTML=rows.length?rows.map(activityItemHtml).join(''):
    '<div class="activity-empty"><i class="bi bi-clock-history"></i>Belum ada aktivitas yang sesuai.</div>';
}

function renderActivityPreview(){
  const root=document.getElementById('dashboardActivityList');
  if(!root) return;
  const rows=state.activities.slice(0,5);
  root.innerHTML=rows.length?rows.map(activityItemHtml).join(''):
    '<div class="activity-empty"><i class="bi bi-clock-history"></i>Belum ada aktivitas.</div>';
}

function activityRole(a){
  const role=String(a.role||'').toUpperCase();
  if(role==='ADMIN'||role==='SISWA') return role;
  return 'SYSTEM';
}

function activityItemHtml(a){
  const role=activityRole(a);
  const action=String(a.aksi||a.action||'UPDATE').toUpperCase();
  const actor=a.user||a.actor||a.aktor||roleTitle(role);
  const nama=a.nama||'Peserta didik';
  const nisn=a.nisn?` • NISN ${esc(a.nisn)}`:'';
  const field=a.field_label||a.label||fieldDisplayLabel(a.field_key||a.field||'');
  const oldVal=valueForActivity(a.nilai_lama??a.old_value??'');
  const newVal=valueForActivity(a.nilai_baru??a.new_value??'');
  let icon='bi-pencil-square',iconClass=role==='SISWA'?'student':'admin',title='';

  if(action.includes('CREATE')){
    icon='bi-person-plus'; title=`${esc(actor)} menambahkan ${esc(nama)}.`;
  }else if(action.includes('DELETE')){
    icon='bi-trash3'; iconClass='delete'; title=`${esc(actor)} menghapus data ${esc(nama)}.`;
  }else if(action.includes('IMPORT')){
    icon='bi-file-earmark-spreadsheet'; iconClass='import'; title=`${esc(actor)} menjalankan sinkronisasi Dapodik.`;
  }else if(action.includes('RESOLVE')){
    icon='bi-check2-circle'; iconClass='import'; title=`${esc(actor)} menyelesaikan perbedaan data ${esc(nama)}.`;
  }else{
    title=`${esc(actor)} mengubah ${esc(field||'data')} milik ${esc(nama)}.`;
  }

  const showChange=(a.field_key||a.field) && action.includes('UPDATE');
  const change=showChange?`<div class="activity-change"><span class="activity-old">${esc(oldVal)}</span><span class="activity-arrow">→</span><span class="activity-new">${esc(newVal)}</span></div>`:'';
  return `<div class="activity-item">
    <div class="activity-icon ${iconClass}"><i class="bi ${icon}"></i></div>
    <div>
      <div class="activity-title">${title}</div>
      <div class="activity-meta">${esc(roleTitle(role))}${nisn}</div>
      ${change}
    </div>
    <div class="activity-time">${esc(formatActivityTime(a.waktu||a.timestamp||''))}</div>
  </div>`;
}

function fieldDisplayLabel(key){
  if(!key) return '';
  for(const section of FORM_SECTIONS){
    const f=section.fields.find(x=>x.key===key);
    if(f){
      if(['Data Ayah','Data Ibu','Data Wali'].includes(section.title) && f.label==='Nama'){
        return 'Nama '+section.title.replace('Data ','');
      }
      if(['Data Ayah','Data Ibu','Data Wali'].includes(section.title) && ['NIK','Tahun Lahir','Jenjang Pendidikan','Pekerjaan','Penghasilan'].includes(f.label)){
        return f.label+' '+section.title.replace('Data ','');
      }
      return f.label;
    }
  }
  return String(key).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

function roleTitle(role){
  if(role==='SISWA') return 'Siswa';
  if(role==='ADMIN') return 'Admin';
  return 'Sistem';
}

function valueForActivity(v){
  const s=String(v??'').trim();
  return s||'(kosong)';
}

function formatActivityTime(v){
  if(!v) return '';
  const s=String(v);
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if(m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  return s;
}
