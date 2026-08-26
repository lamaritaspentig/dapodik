/**
 * State global aplikasi dan judul halaman.
 */
const state = {
  auth: {token:'', user:null},

  // Hanya memegang halaman siswa yang sedang tampil, bukan seluruh database.
  students: [],
  studentTotal: 0,
  studentClasses: [],
  studentPageRequestSeq: 0,

  // Ringkasan dashboard dihitung di server.
  dashboard: null,

  page: 1,
  pageSize: 25,
  importRows: [],
  religionMode: 'kelas',
  charts: {},
  tableFull: false,
  conflicts: [],
  activities: [],
  requests: [],
  pendingRequests: [],
  importPreview: null,
  backupInfo: null,
  selectedStudentActionId: ''
};

const titles = {
  dashboard: ['Beranda','Ikhtisar data peserta didik'],
  students: ['Data Peserta Didik','Kelola informasi peserta didik'],
  import: ['Impor Dapodik','Sinkronkan data Excel Dapodik dengan data pada sistem'],
  requests: ['Pengajuan Data','Tinjau perubahan yang dikirim peserta didik'],
  activities: ['Aktivitas','Pantau perubahan data yang dilakukan pada sistem'],
  conflicts: ['Perbedaan Data','Tinjau perubahan yang berbeda antara aplikasi dan Dapodik'],
  gender: ['Rekap Jenis Kelamin','Lihat jumlah peserta didik laki-laki dan perempuan berdasarkan kelas dan rombel'],
  religion: ['Rekap Agama','Lihat komposisi agama per kelas atau rombel']
};
