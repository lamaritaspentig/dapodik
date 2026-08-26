/**
 * Import Dapodik, backup/restore, ekspor Excel.
 */
// =========================
// IMPORT EXCEL
// =========================
function bindImportControls(){
  const file = document.getElementById('excelFile');
  const zone = document.getElementById('dropZone');

  zone.addEventListener('click',() => file.click());
  file.addEventListener('change',() => {
    if(file.files[0]) parseExcel(file.files[0]);
  });

  ['dragenter','dragover'].forEach(evt => zone.addEventListener(evt,e => {
    e.preventDefault(); zone.classList.add('dragover');
  }));
  ['dragleave','drop'].forEach(evt => zone.addEventListener(evt,e => {
    e.preventDefault(); zone.classList.remove('dragover');
  }));
  zone.addEventListener('drop',e => {
    const f=e.dataTransfer.files[0];
    if(f) parseExcel(f);
  });

  document.getElementById('templateBtn').addEventListener('click',downloadTemplate);
  document.getElementById('importBtn').addEventListener('click',runImport);
  document.getElementById('previewImportBtn').addEventListener('click',previewImportChanges);
  document.getElementById('restoreBackupBtn').addEventListener('click',restoreBackup);
}

async function parseExcel(file){
  if(!/\.(xlsx|xls)$/i.test(file.name)){toast('Pilih file Excel Dapodik berformat .xlsx atau .xls.','danger');return;}
  try{
    setLoading(true,'Membaca data dari file Dapodik...');
    const buffer=await file.arrayBuffer();
    const wb=XLSX.read(buffer,{type:'array',cellDates:true});
    const sheetName=wb.SheetNames.find(n=>normalizeHeader(n)==='daftar peserta didik')||wb.SheetNames[0];
    const ws=wb.Sheets[sheetName];
    if(!ws)throw new Error('Lembar data peserta didik tidak ditemukan pada file Excel.');
    const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
    const parsed=buildRowsFromDapodikMatrix(matrix);
    state.importRows=parsed.rows.map(normalizeImportedRow).filter(r=>r.nisn||r.nama);
    renderImportPreview();
    document.getElementById('previewImportBtn').disabled=!state.importRows.length;document.getElementById('importBtn').disabled=true;state.importPreview=null;document.getElementById('syncPreviewPanel').classList.add('d-none');
    const sumber=parsed.isDapodik?`Format Dapodik terdeteksi (header baris ${parsed.headerRow+1}). `:'';
    toast(`${sumber}${state.importRows.length} baris siswa berhasil dibaca.`,'success');
  }catch(err){toast('File Excel belum dapat dibaca: '+err.message,'danger');state.importRows=[];state.importPreview=null;renderImportPreview();document.getElementById('previewImportBtn').disabled=true;document.getElementById('importBtn').disabled=true;document.getElementById('syncPreviewPanel').classList.add('d-none');}finally{setLoading(false);}
}
function buildRowsFromDapodikMatrix(matrix){
  if(!Array.isArray(matrix)||!matrix.length)return{rows:[],headerRow:0,isDapodik:false};

  const cleanRow=row=>(row||[]).map(v=>String(v??'').replace(/\u00a0/g,' ').trim());
  const looksLikeDapodikHeader=row=>{
    const keys=new Set(cleanRow(row).map(normalizeHeader));
    return keys.has('nama')&&keys.has('nipd')&&keys.has('jk')&&keys.has('nisn')&&keys.has('tempat lahir');
  };

  // File unduhan Dapodik biasanya memiliki 4 baris informasi sebelum header.
  // Jangan bergantung pada nomor baris; cari header berdasarkan nama kolom agar tetap tahan perubahan format.
  let headerRow=matrix.findIndex(looksLikeDapodikHeader);
  if(headerRow<0){
    // Fallback untuk Excel biasa: baris pertama dianggap header.
    headerRow=0;
  }

  const row1=cleanRow(matrix[headerRow]);
  const row2=cleanRow(matrix[headerRow+1]);
  const grouped=row1.some(v=>/^data\s+(ayah|ibu|wali)$/i.test(v));
  const isDapodik=looksLikeDapodikHeader(matrix[headerRow]);

  if(!grouped){
    const headers=row1;
    const rows=matrix.slice(headerRow+1)
      .filter(r=>r&&r.some(v=>String(v??'').trim()!==''))
      .map(r=>Object.fromEntries(headers.map((x,i)=>[x,r[i]??''])));
    return{rows,headerRow,isDapodik};
  }

  const headers=[];
  let group='';
  const width=Math.max(row1.length,row2.length);
  for(let i=0;i<width;i++){
    const h1=row1[i];
    if(/^data\s+ayah$/i.test(h1))group='Ayah';
    else if(/^data\s+ibu$/i.test(h1))group='Ibu';
    else if(/^data\s+wali$/i.test(h1))group='Wali';
    else if(h1)group='';

    headers[i]=group&&row2[i]
      ? `${row2[i]} ${group}`
      : (h1||row2[i]||`kolom_${i+1}`);
  }

  const dataStart=headerRow+2;
  const rows=matrix.slice(dataStart)
    .filter(r=>r&&r.some(v=>String(v??'').trim()!==''))
    .filter(r=>{ // abaikan baris footer/teks yang bukan siswa bila ada
      const nama=String(r[1]??'').trim();
      const nisn=String(r[4]??'').trim();
      return nama!==''||nisn!=='';
    })
    .map(r=>Object.fromEntries(headers.map((x,i)=>[x,r[i]??''])));

  return{rows,headerRow,isDapodik};
}
const IMPORT_ALIASES={
  nama:['nama','nama siswa','nama peserta didik'],nipd:['nipd','nomor induk'],jk:['jk','jenis kelamin'],nisn:['nisn'],tempat_lahir:['tempat lahir'],tanggal_lahir:['tanggal lahir','tgl lahir'],nik:['nik'],agama:['agama'],kewarganegaraan:['kewarganegaraan','warga negara','status kewarganegaraan'],
  alamat:['alamat','alamat jalan'],rt:['rt'],rw:['rw'],dusun:['dusun','nama dusun'],kelurahan:['kelurahan','desa kelurahan'],kecamatan:['kecamatan'],kode_pos:['kode pos'],jenis_tinggal:['jenis tinggal','tempat tinggal'],alat_transportasi:['alat transportasi','moda transportasi'],telepon:['telepon','telpon','nomor telepon rumah'],hp:['hp','no hp','nomor hp'],email:['e-mail','email'],skhun:['skhun'],penerima_kps:['penerima kps'],no_kps:['no. kps','no kps'],
  nama_ayah:['nama ayah'],tahun_lahir_ayah:['tahun lahir ayah'],jenjang_pendidikan_ayah:['jenjang pendidikan ayah','pendidikan ayah'],pekerjaan_ayah:['pekerjaan ayah'],penghasilan_ayah:['penghasilan ayah'],nik_ayah:['nik ayah'],
  nama_ibu:['nama ibu','nama ibu kandung'],tahun_lahir_ibu:['tahun lahir ibu'],jenjang_pendidikan_ibu:['jenjang pendidikan ibu','pendidikan ibu'],pekerjaan_ibu:['pekerjaan ibu'],penghasilan_ibu:['penghasilan ibu'],nik_ibu:['nik ibu'],
  nama_wali:['nama wali'],tahun_lahir_wali:['tahun lahir wali'],jenjang_pendidikan_wali:['jenjang pendidikan wali','pendidikan wali'],pekerjaan_wali:['pekerjaan wali'],penghasilan_wali:['penghasilan wali'],nik_wali:['nik wali'],
  rombel_saat_ini:['rombel saat ini','rombel','rombongan belajar'],no_peserta_ujian_nasional:['no peserta ujian nasional','nomor peserta ujian nasional'],no_seri_ijazah:['no seri ijazah','nomor seri ijazah'],penerima_kip:['penerima kip'],nomor_kip:['nomor kip','no kip'],nama_di_kip:['nama di kip'],nomor_kks:['nomor kks','no kks'],no_registrasi_akta_lahir:['no registrasi akta lahir','nomor registrasi akta lahir'],bank:['bank'],nomor_rekening_bank:['nomor rekening bank','no rekening bank'],rekening_atas_nama:['rekening atas nama'],layak_pip:['layak pip (usulan dari sekolah)','layak pip','layak pip usulan dari sekolah'],alasan_layak_pip:['alasan layak pip'],kebutuhan_khusus:['kebutuhan khusus'],sekolah_asal:['sekolah asal'],anak_keberapa:['anak ke-berapa','anak keberapa','anak ke'],lintang:['lintang'],bujur:['bujur'],no_kk:['no kk','nomor kk'],berat_badan:['berat badan'],tinggi_badan:['tinggi badan'],lingkar_kepala:['lingkar kepala'],jumlah_saudara_kandung:['jml. saudara kandung','jml saudara kandung','jumlah saudara kandung'],jarak_rumah_ke_sekolah_km:['jarak rumah ke sekolah (km)','jarak rumah ke sekolah km','jarak rumah ke sekolah']
};
function normalizeImportedRow(row){
  const normalized={};Object.entries(row||{}).forEach(([k,v])=>normalized[normalizeHeader(k)]=v);
  const get=aliases=>{for(const a of aliases||[]){const k=normalizeHeader(a);if(normalized[k]!==undefined&&String(normalized[k]).trim()!=='')return String(normalized[k]).trim();}return'';};
  const out={};DATA_FIELDS.forEach(f=>out[f.key]=get(IMPORT_ALIASES[f.key]||[f.label,f.key]));out.jk=normalizeGender(out.jk);out.agama=normalizeReligion(out.agama);out.tanggal_lahir=normalizeDate(out.tanggal_lahir);out.kelas=deriveClass(out.rombel_saat_ini);out.status='AKTIF';return out;
}

function renderImportPreview(){
  const body=document.getElementById('previewBody');
  const rows=state.importRows.slice(0,20);
  document.getElementById('previewCount').textContent = `${state.importRows.length} baris`;

  if(!rows.length){
    body.innerHTML='<tr><td colspan="7" class="empty-state">Belum ada data untuk ditampilkan.</td></tr>';
    return;
  }

  body.innerHTML=rows.map((r,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${esc(r.nisn)}</td>
      <td>${esc(r.nama)}</td>
      <td>${esc(r.jk)}</td>
      <td>${esc(r.agama)}</td>
      <td>${esc(r.kelas)}</td>
      <td>${esc(r.rombel_saat_ini)}</td>
    </tr>
  `).join('');
}


async function previewImportChanges(){
  if(!state.importRows.length)return;
  try{
    setLoading(true,'Memeriksa perubahan Dapodik...');
    const res=await apiPost('previewimport',{rows:state.importRows});
    if(!res?.ok)throw new Error(res?.message||'Pemeriksaan belum berhasil.');
    state.importPreview=res;
    const map={pvNew:res.inserted||0,pvChanged:res.dapodikChanged||0,pvPreserved:res.appPreserved||0,pvConflict:res.conflicts||0,pvUnchanged:res.unchanged||0};
    Object.entries(map).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=formatNumber(v)});
    document.getElementById('syncPreviewPanel').classList.remove('d-none');
    document.getElementById('importBtn').disabled=false;
    toast('Pemeriksaan selesai. Tinjau ringkasan sebelum menerapkan sinkronisasi.','info');
  }catch(err){handleError(err);}finally{setLoading(false);}
}
async function loadBackupInfo(silent=false){
  if(state.auth.user?.role!=='ADMIN')return;
  try{const res=await apiPost('backupinfo',{});if(!res?.ok)throw new Error(res?.message||'');state.backupInfo=res.backup||null;renderBackupInfo();}catch(err){if(!silent)toast('Informasi cadangan belum dapat dimuat.','warning');}
}
function renderBackupInfo(){
  const box=document.getElementById('backupInfo'),btn=document.getElementById('restoreBackupBtn');if(!box||!btn)return;
  if(!state.backupInfo){box.textContent='Belum ada cadangan sinkronisasi.';btn.disabled=true;return;}
  box.innerHTML=`<strong>Cadangan terakhir:</strong> ${esc(formatActivityTime(state.backupInfo.waktu||''))}<br>${formatNumber(state.backupInfo.total||0)} peserta didik • dibuat otomatis sebelum sinkronisasi.`;
  btn.disabled=false;
}
async function restoreBackup(){
  if(!state.backupInfo)return;
  const confirmed=await appConfirm(
    'Data peserta didik akan dikembalikan ke kondisi sebelum sinkronisasi terakhir. Data saat ini akan diganti dengan cadangan tersebut.',
    {title:'Pulihkan Cadangan',okText:'Pulihkan Data',type:'warning'}
  );
  if(!confirmed)return;
  try{setLoading(true,'Memulihkan cadangan...');const res=await apiPost('restorebackup',{});if(!res?.ok)throw new Error(res?.message||'Pemulihan belum berhasil.');toast(res.message,'success');await loadData();await loadBackupInfo(true);showView('students');}catch(err){handleError(err);}finally{setLoading(false);}
}
async function runImport(){
  if(!state.importRows.length) return;
  if(!state.importPreview){toast('Periksa perubahan terlebih dahulu sebelum menerapkan sinkronisasi.','warning');return;}
  const confirmed=await appConfirm(
    'Perubahan yang hanya ada di aplikasi akan dipertahankan. Perbedaan antara aplikasi dan Dapodik akan ditandai untuk ditinjau.',
    {title:'Mulai Sinkronisasi',okText:'Mulai Sinkronisasi',type:'warning'}
  );
  if(!confirmed) return;
  try{
    setLoading(true,'Membandingkan data aplikasi dengan Dapodik...');
    const res=await apiPost('import',{rows:state.importRows,mode:'smart'});
    if(!res||res.ok===false)throw new Error(res?.message||'Sinkronisasi belum berhasil.');
    const detail=`Data baru: ${res.inserted||0} • Perubahan Dapodik: ${res.dapodikApplied||0} • Data aplikasi dipertahankan: ${res.appPreserved||0} • Perlu ditinjau: ${res.conflicts||0} • Dilewati: ${res.skipped||0}`;
    toast(`${res.message} ${detail}`,(res.conflicts||0)>0?'warning':'success');
    if(res.baselinePreserved>0)toast(`Data awal ${res.baselinePreserved} peserta didik berhasil dicatat. Perubahan yang sudah ada di aplikasi tetap dipertahankan.`,'info');
    if(res.errors?.length)console.warn('Catatan sinkronisasi:',res.errors);
    state.importRows=[];state.importPreview=null;renderImportPreview();document.getElementById('importBtn').disabled=true;document.getElementById('previewImportBtn').disabled=true;document.getElementById('syncPreviewPanel').classList.add('d-none');document.getElementById('excelFile').value='';await loadBackupInfo(true);
    await loadData(); await loadConflicts(true); showView((res.conflicts||0)>0?'conflicts':'students');
  }catch(err){handleError(err);}
}

const EXCEL_COLUMNS=[
{label:'No',key:null},{label:'Nama',key:'nama'},{label:'NIPD',key:'nipd'},{label:'Jenis Kelamin',key:'jk'},{label:'NISN',key:'nisn'},{label:'Tempat Lahir',key:'tempat_lahir'},{label:'Tanggal Lahir',key:'tanggal_lahir'},{label:'NIK',key:'nik'},{label:'Agama',key:'agama'},{label:'Kewarganegaraan',key:'kewarganegaraan'},{label:'Alamat',key:'alamat'},{label:'RT',key:'rt'},{label:'RW',key:'rw'},{label:'Dusun',key:'dusun'},{label:'Kelurahan',key:'kelurahan'},{label:'Kecamatan',key:'kecamatan'},{label:'Kode Pos',key:'kode_pos'},{label:'Jenis Tinggal',key:'jenis_tinggal'},{label:'Alat Transportasi',key:'alat_transportasi'},{label:'Telepon Rumah',key:'telepon'},{label:'Nomor HP',key:'hp'},{label:'Email',key:'email'},{label:'SKHUN',key:'skhun'},{label:'Penerima KPS',key:'penerima_kps'},{label:'Nomor KPS',key:'no_kps'},
{group:'Data Ayah',label:'Nama',key:'nama_ayah'},{group:'Data Ayah',label:'Tahun Lahir',key:'tahun_lahir_ayah'},{group:'Data Ayah',label:'Jenjang Pendidikan',key:'jenjang_pendidikan_ayah'},{group:'Data Ayah',label:'Pekerjaan',key:'pekerjaan_ayah'},{group:'Data Ayah',label:'Penghasilan',key:'penghasilan_ayah'},{group:'Data Ayah',label:'NIK',key:'nik_ayah'},
{group:'Data Ibu',label:'Nama',key:'nama_ibu'},{group:'Data Ibu',label:'Tahun Lahir',key:'tahun_lahir_ibu'},{group:'Data Ibu',label:'Jenjang Pendidikan',key:'jenjang_pendidikan_ibu'},{group:'Data Ibu',label:'Pekerjaan',key:'pekerjaan_ibu'},{group:'Data Ibu',label:'Penghasilan',key:'penghasilan_ibu'},{group:'Data Ibu',label:'NIK',key:'nik_ibu'},
{group:'Data Wali',label:'Nama',key:'nama_wali'},{group:'Data Wali',label:'Tahun Lahir',key:'tahun_lahir_wali'},{group:'Data Wali',label:'Jenjang Pendidikan',key:'jenjang_pendidikan_wali'},{group:'Data Wali',label:'Pekerjaan',key:'pekerjaan_wali'},{group:'Data Wali',label:'Penghasilan',key:'penghasilan_wali'},{group:'Data Wali',label:'NIK',key:'nik_wali'},
{label:'Rombel Saat Ini',key:'rombel_saat_ini'},{label:'Nomor Peserta Ujian Nasional',key:'no_peserta_ujian_nasional'},{label:'Nomor Seri Ijazah',key:'no_seri_ijazah'},{label:'Penerima KIP',key:'penerima_kip'},{label:'Nomor KIP',key:'nomor_kip'},{label:'Nama di KIP',key:'nama_di_kip'},{label:'Nomor KKS',key:'nomor_kks'},{label:'Nomor Registrasi Akta Lahir',key:'no_registrasi_akta_lahir'},{label:'Bank',key:'bank'},{label:'Nomor Rekening Bank',key:'nomor_rekening_bank'},{label:'Rekening Atas Nama',key:'rekening_atas_nama'},{label:'Layak PIP (Usulan Sekolah)',key:'layak_pip'},{label:'Alasan Layak PIP',key:'alasan_layak_pip'},{label:'Kebutuhan Khusus',key:'kebutuhan_khusus'},{label:'Sekolah Asal',key:'sekolah_asal'},{label:'Anak ke-berapa',key:'anak_keberapa'},{label:'Lintang',key:'lintang'},{label:'Bujur',key:'bujur'},{label:'Nomor KK',key:'no_kk'},{label:'Berat Badan',key:'berat_badan'},{label:'Tinggi Badan',key:'tinggi_badan'},{label:'Lingkar Kepala',key:'lingkar_kepala'},{label:'Jml. Saudara Kandung',key:'jumlah_saudara_kandung'},{label:'Jarak Rumah ke Sekolah (KM)',key:'jarak_rumah_ke_sekolah_km'}];
function buildExcelSheet(rows){
 const top=EXCEL_COLUMNS.map(c=>c.group||c.label),sub=EXCEL_COLUMNS.map(c=>c.group?c.label:'');
 ['Data Ayah','Data Ibu','Data Wali'].forEach(g=>{const idx=[];EXCEL_COLUMNS.forEach((c,i)=>{if(c.group===g)idx.push(i)});idx.slice(1).forEach(i=>top[i]='');});
 const data=rows.map((s,i)=>EXCEL_COLUMNS.map(c=>c.key?String(s[c.key]??''):i+1));const ws=XLSX.utils.aoa_to_sheet([top,sub,...data]);ws['!merges']=[];
 ['Data Ayah','Data Ibu','Data Wali'].forEach(g=>{const idx=[];EXCEL_COLUMNS.forEach((c,i)=>{if(c.group===g)idx.push(i)});if(idx.length)ws['!merges'].push({s:{r:0,c:idx[0]},e:{r:0,c:idx[idx.length-1]}});});
 EXCEL_COLUMNS.forEach((c,i)=>{if(!c.group)ws['!merges'].push({s:{r:0,c:i},e:{r:1,c:i}})});ws['!cols']=EXCEL_COLUMNS.map(c=>({wch:Math.min(35,Math.max(10,c.label.length+2))}));return ws;
}
function downloadTemplate(){const sample={nama:'CONTOH SISWA',nipd:'12345',jk:'L',nisn:'0012345678',tempat_lahir:'MAKASSAR',tanggal_lahir:'2013-01-15',nik:'7371xxxxxxxxxxxx',agama:'Islam',kewarganegaraan:'Indonesia',alamat:'Jl. Contoh',rt:'01',rw:'02',kelurahan:'CONTOH',kecamatan:'CONTOH',kode_pos:'90111',rombel_saat_ini:'KELAS VII-1',no_kk:'7371xxxxxxxxxxxx'};const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,buildExcelSheet([sample]),'DATA PESERTA DIDIK');XLSX.writeFile(wb,'Template_Data_Peserta_Didik.xlsx');}
async function exportExcel(){
  if(state.auth.user?.role!=='ADMIN') return;

  try{
    setLoading(true,'Menyiapkan data ekspor...');
    const res=await apiPost('exportdata',{});
    if(!res?.ok) throw new Error(res?.message||'Data ekspor belum dapat disiapkan.');

    const rows=Array.isArray(res.students)?res.students:[];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,buildExcelSheet(rows),'PESERTA DIDIK');
    XLSX.writeFile(wb,'Data_Peserta_Didik.xlsx');
  }catch(err){
    handleError(err);
  }finally{
    setLoading(false);
  }
}
