/**
 * Utility murni: format, escape HTML, normalisasi nilai, dan badge.
 */
function genderBadge(jk){
  if(jk==='L') return '<span class="badge-soft badge-l">L</span>';
  if(jk==='P') return '<span class="badge-soft badge-p">P</span>';
  return '-';
}

function statusBadge(status){
  const active=(status||'AKTIF')!=='NONAKTIF';
  return `<span class="badge-soft ${active?'badge-active':'badge-inactive'}">${active?'AKTIF':'NONAKTIF'}</span>`;
}

function normalizeHeader(text){
  return String(text||'').toLowerCase()
    .replace(/[_\-./]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function normalizeGender(v){
  const x=String(v||'').trim().toUpperCase();
  if(['L','LK','LAKI','LAKI-LAKI','LAKI LAKI','MALE'].includes(x)) return 'L';
  if(['P','PR','PEREMPUAN','FEMALE'].includes(x)) return 'P';
  return x;
}

function normalizeReligion(v){
  const x=String(v||'').trim().toLowerCase();
  if(x==='islam') return 'Islam';
  if(['kristen','protestan','kristen protestan'].includes(x)) return 'Kristen';
  if(['katolik','katholik','kristen katolik'].includes(x)) return 'Katholik';
  if(x==='hindu') return 'Hindu';
  if(['budha','buddha'].includes(x)) return 'Budha';
  if(['khonghucu','konghucu'].includes(x)) return 'Khonghucu';
  return String(v||'').trim();
}

function deriveClass(rombel){
  const x=String(rombel||'').toUpperCase();
  if(/\bVII\b/.test(x)||/\b7\b/.test(x)) return '7';
  if(/\bVIII\b/.test(x)||/\b8\b/.test(x)) return '8';
  if(/\bIX\b/.test(x)||/\b9\b/.test(x)) return '9';
  return '';
}

function normalizeDate(v){
  const x=String(v||'').trim();
  if(!x) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;

  const m=x.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;

  const d=new Date(x);
  if(!isNaN(d)){
    const y=d.getFullYear();
    const mo=String(d.getMonth()+1).padStart(2,'0');
    const da=String(d.getDate()).padStart(2,'0');
    return `${y}-${mo}-${da}`;
  }
  return x;
}

function toDateInput(v){
  const n=normalizeDate(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(n)?n:'';
}

function displayGroupName(mode,value){
  if(value==='Belum diisi') return value;
  return mode==='kelas' ? `Kelas ${value}` : value;
}



function fullAddress(s){
  const p=[];if(s.alamat)p.push(s.alamat);const rr=[s.rt?`RT ${s.rt}`:'',s.rw?`RW ${s.rw}`:''].filter(Boolean).join(' / ');if(rr)p.push(rr);if(s.dusun)p.push(s.dusun);if(s.kelurahan)p.push(s.kelurahan);if(s.kecamatan)p.push(s.kecamatan);if(s.kode_pos)p.push(s.kode_pos);return p.join(', ');
}

function formatDateId(v){
  const n=normalizeDate(v); if(!/^\d{4}-\d{2}-\d{2}$/.test(n)) return v||'';
  const [y,m,d]=n.split('-'); return `${d}/${m}/${y}`;
}

function formatNumber(n){
  return new Intl.NumberFormat('id-ID').format(Number(n)||0);
}


function esc(v){
  return String(v??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[ch]));
}

function jsEsc(v){
  return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}
