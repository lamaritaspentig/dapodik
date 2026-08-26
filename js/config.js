/**
 * Konfigurasi aplikasi, definisi form, dan aturan kelengkapan data.
 * Backend GAS tetap mengikuti APP.VERSION.
 */
// ============================================================
// KONFIGURASI GOOGLE APPS SCRIPT
// Isi hanya DEPLOYMENT ID dari URL Web App /exec.
// Jangan tempel URL lengkap.
// Contoh:
// Jika URL Web App berakhir dengan /s/AKfycbXXXXXXXX/exec
// maka isi: DEPLOYMENT_ID: 'AKfycbXXXXXXXX'
// ============================================================
const UI_VERSION='50.0-deployment-id-clean';
const APP = {
  VERSION: '46.0-clean-stable',

  // Isi HANYA Deployment ID dari Web App /exec.
  // Contoh: AKfycbXXXXXXXXXXXXXXXXXXXXXXXX
  DEPLOYMENT_ID: 'TEMPEL_DEPLOYMENT_ID_DI_SINI',

  schoolName: 'UPT SPF SMP NEGERI 3 MAKASSAR',
  agama: ['Islam','Kristen','Katholik','Hindu','Budha','Khonghucu','Kepercayaan kpd Tuhan YME','Tidak diisi','Lainnya']
};

const OPTION_SETS = {
  jk: ['L','P'], agama: APP.agama, yaTidak: ['Ya','Tidak'], kewarganegaraan: ['Indonesia','Warga Negara Asing'],
  pendidikan: ["Tidak sekolah", "PAUD", "TK / sederajat", "Putus SD", "SD / sederajat", "SMP / sederajat", "SMA / sederajat", "Paket A", "Paket B", "Paket C", "D1", "D2", "D3", "D4", "S1", "Profesi", "Sp-1", "S2", "S2 Terapan", "Sp-2", "S3", "S3 Terapan", "Non formal", "Informal", "Lainnya"], pekerjaan: ["Tidak bekerja", "Nelayan", "Petani", "Peternak", "PNS/TNI/Polri", "Karyawan Swasta", "Pedagang Kecil", "Pedagang Besar", "Wiraswasta", "Wirausaha", "Buruh", "Pensiunan", "Tenaga Kerja Indonesia", "Karyawan BUMN", "Tidak dapat diterapkan", "Sudah Meninggal", "Lainnya"], penghasilan: ["Tidak Berpenghasilan", "Kurang dari Rp. 500.000", "Rp. 500.000 - Rp. 999.999", "< Rp1.000.000", "Rp. 1.000.000 - Rp. 1.999.999", "Rp1.000.001 - Rp3.000.000", "Rp. 2.000.000 - Rp. 4.999.999", "Rp. 5.000.000 - Rp. 20.000.000", "Lebih dari Rp. 20.000.000"],
  jenisTinggal: ["Bersama orang tua", "Wali", "Kost", "Asrama", "Panti asuhan", "Pesantren", "Lainnya"], transportasi: ["Jalan kaki", "Angkutan umum/bus/pete-pete", "Mobil/bus antar jemput", "Kereta api", "Ojek", "Andong/bendi/sado/dokar/delman/becak", "Perahu penyeberangan/rakit/getek", "Kuda", "Sepeda", "Sepeda motor", "Mobil pribadi", "Lainnya"]
};

const FORM_SECTIONS = [
  {title:'Data Pribadi',fields:[
    {key:'nama',label:'Nama Peserta Didik',span:5,required:true,upper:true},
    {key:'nipd',label:'NIPD',span:2},
    {key:'jk',label:'JK',type:'select',options:'jk',span:1},
    {key:'nisn',label:'NISN',span:2},
    {key:'nik',label:'NIK',span:2},

    {key:'tempat_lahir',label:'Tempat Lahir',span:3,upper:true},
    {key:'tanggal_lahir',label:'Tanggal Lahir',type:'date',span:2},
    {key:'kewarganegaraan',label:'Kewarganegaraan',type:'select',options:'kewarganegaraan',span:3},
    {key:'agama',label:'Agama',type:'select',options:'agama',span:4},

    {key:'no_kk',label:'Nomor KK',span:4},
    {key:'no_registrasi_akta_lahir',label:'Nomor Registrasi Akta Lahir',span:5},
    {key:'anak_keberapa',label:'Anak ke-berapa',type:'number',span:3},

    {key:'alamat',label:'Alamat Jalan',span:7},
    {key:'rt',label:'RT',span:1},
    {key:'rw',label:'RW',span:1},
    {key:'dusun',label:'Nama Dusun',span:3},

    {key:'kelurahan',label:'Desa / Kelurahan',span:5},
    {key:'kecamatan',label:'Kecamatan',span:4},
    {key:'kode_pos',label:'Kode Pos',span:3},

    {key:'jenis_tinggal',label:'Tempat Tinggal',type:'select',options:'jenisTinggal',span:6},
    {key:'alat_transportasi',label:'Moda Transportasi',type:'select',options:'transportasi',span:6}
  ]},

  {title:'Kontak',fields:[
    {key:'telepon',label:'Nomor Telepon Rumah',span:4},
    {key:'hp',label:'Nomor HP',span:4},
    {key:'email',label:'Email',type:'email',span:4}
  ]},

  {title:'Data Ayah',fields:[
    {key:'nama_ayah',label:'Nama Ayah',span:5,upper:true},
    {key:'nik_ayah',label:'NIK',span:4},
    {key:'tahun_lahir_ayah',label:'Tahun Lahir',span:3},
    {key:'jenjang_pendidikan_ayah',label:'Pendidikan Ayah',type:'select',options:'pendidikan',span:4},
    {key:'pekerjaan_ayah',label:'Pekerjaan Ayah',type:'select',options:'pekerjaan',span:4},
    {key:'penghasilan_ayah',label:'Penghasilan Ayah',type:'select',options:'penghasilan',span:4}
  ]},

  {title:'Data Ibu Kandung',fields:[
    {key:'nama_ibu',label:'Nama Ibu Kandung',span:5,upper:true},
    {key:'nik_ibu',label:'NIK',span:4},
    {key:'tahun_lahir_ibu',label:'Tahun Lahir',span:3},
    {key:'jenjang_pendidikan_ibu',label:'Pendidikan Ibu',type:'select',options:'pendidikan',span:4},
    {key:'pekerjaan_ibu',label:'Pekerjaan Ibu',type:'select',options:'pekerjaan',span:4},
    {key:'penghasilan_ibu',label:'Penghasilan Ibu',type:'select',options:'penghasilan',span:4}
  ]},

  {title:'Data Wali',fields:[
    {key:'nama_wali',label:'Nama Wali',span:5,upper:true},
    {key:'nik_wali',label:'NIK',span:4},
    {key:'tahun_lahir_wali',label:'Tahun Lahir',span:3},
    {key:'jenjang_pendidikan_wali',label:'Pendidikan Wali',type:'select',options:'pendidikan',span:4},
    {key:'pekerjaan_wali',label:'Pekerjaan Wali',type:'select',options:'pekerjaan',span:4},
    {key:'penghasilan_wali',label:'Penghasilan Wali',type:'select',options:'penghasilan',span:4}
  ]},

  {title:'Sekolah dan Registrasi',fields:[
    {key:'rombel_saat_ini',label:'Rombel Saat Ini',span:4,upper:true},
    {key:'sekolah_asal',label:'Sekolah Asal',span:4},
    {key:'kebutuhan_khusus',label:'Kebutuhan Khusus',span:4},
    {key:'no_peserta_ujian_nasional',label:'Nomor Peserta Ujian Nasional',span:4},
    {key:'no_seri_ijazah',label:'Nomor Seri Ijazah',span:4},
    {key:'skhun',label:'SKHUN',span:4}
  ]},

  {title:'KPS / KIP / PIP',fields:[
    {key:'penerima_kps',label:'Penerima KPS',type:'select',options:'yaTidak',span:3},
    {key:'no_kps',label:'Nomor KPS',span:3},
    {key:'penerima_kip',label:'Penerima KIP',type:'select',options:'yaTidak',span:3},
    {key:'nomor_kip',label:'Nomor KIP',span:3},
    {key:'nama_di_kip',label:'Nama di KIP',span:4,upper:true},
    {key:'nomor_kks',label:'Nomor KKS',span:4},
    {key:'layak_pip',label:'Layak PIP (Usulan Sekolah)',type:'select',options:'yaTidak',span:4},
    {key:'alasan_layak_pip',label:'Alasan Layak PIP',type:'textarea',span:12}
  ]},

  {title:'Data Bank',fields:[
    {key:'bank',label:'Bank',span:3},
    {key:'nomor_rekening_bank',label:'Nomor Rekening Bank',span:4},
    {key:'rekening_atas_nama',label:'Rekening Atas Nama',span:5,upper:true}
  ]},

  {title:'Data Periodik',fields:[
    {key:'berat_badan',label:'Berat Badan (kg)',type:'number',span:3},
    {key:'tinggi_badan',label:'Tinggi Badan (cm)',type:'number',span:3},
    {key:'lingkar_kepala',label:'Lingkar Kepala (cm)',type:'number',span:3},
    {key:'jumlah_saudara_kandung',label:'Jumlah Saudara Kandung',type:'number',span:3},
    {key:'jarak_rumah_ke_sekolah_km',label:'Jarak Rumah ke Sekolah (KM)',type:'number',span:4}
  ]},

  {title:'Koordinat',fields:[
    {key:'lintang',label:'Lintang',span:6},
    {key:'bujur',label:'Bujur',span:6}
  ]}
]
const DATA_FIELDS=FORM_SECTIONS.flatMap(s=>s.fields);
const STUDENT_FIELDS=['id',...DATA_FIELDS.map(f=>f.key)];
// Field opsional tidak memengaruhi persentase kelengkapan dan tidak diberi garis merah.
const OPTIONAL_COMPLETENESS_FIELDS=[
  // Data Wali
  'nama_wali','tahun_lahir_wali','jenjang_pendidikan_wali','pekerjaan_wali','penghasilan_wali','nik_wali',

  // KPS / KIP / PIP
  'penerima_kps','no_kps','penerima_kip','nomor_kip','nama_di_kip','nomor_kks','layak_pip','alasan_layak_pip'
];

const COMPLETENESS_FIELDS=[
  'nama','nipd','jk','nisn','tempat_lahir','tanggal_lahir','nik','agama','kewarganegaraan',
  'alamat','kelurahan','kecamatan','jenis_tinggal','alat_transportasi','hp','no_kk',
  'nama_ayah','nama_ibu','rombel_saat_ini','sekolah_asal','berat_badan','tinggi_badan'
];
