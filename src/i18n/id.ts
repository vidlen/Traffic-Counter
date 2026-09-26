// Semua teks UI (bahasa Indonesia). Komponen tidak boleh memakai string lepas.
export const t = {
  app: {
    name: 'TC Counter',
    tagline: 'Hitung per interval, simpan otomatis.',
  },
  common: {
    back: 'Kembali',
    loading: 'Memuat…',
  },
  nav: {
    classifications: 'Klasifikasi kendaraan',
    settings: 'Pengaturan',
    install: 'Panduan install',
  },
  pwa: {
    updateReady: 'Versi baru tersedia.',
    reload: 'Muat ulang',
  },
  home: {
    newSession: 'Buat sesi baru',
    emptyTitle: 'Belum ada sesi',
    emptyBody: 'Buat sesi baru untuk mulai menghitung. Data tersimpan di HP ini.',
  },
  classifications: {
    title: 'Klasifikasi kendaraan',
    intro:
      'Preset bawaan tidak bisa diubah. Duplikat untuk membuat versi sendiri. Sesi yang sudah dibuat tidak ikut berubah.',
    builtIn: 'Bawaan',
    custom: 'Kustom',
    noCustom: 'Belum ada klasifikasi kustom. Duplikat salah satu preset untuk mulai.',
    types: (n: number) => `${n} jenis`,
    view: 'Lihat',
    edit: 'Edit',
    duplicate: 'Duplikat',
    delete: 'Hapus',
    copyName: (name: string) => `${name} (salinan)`,
    confirmDelete: (name: string) =>
      `Hapus klasifikasi "${name}"? Sesi yang sudah dibuat tidak terpengaruh.`,
    inUse: 'Dipakai sesi aktif, tidak bisa dihapus.',
    deleted: 'Klasifikasi dihapus',
  },
  editor: {
    title: 'Edit klasifikasi',
    viewTitle: 'Preset bawaan',
    readOnly: 'Preset bawaan tidak bisa diubah. Duplikat untuk membuat versi sendiri.',
    name: 'Nama klasifikasi',
    typesTitle: (n: number, max: number) => `Jenis kendaraan (${n} dari maks. ${max})`,
    code: 'Kode',
    typeName: 'Nama',
    description: 'Keterangan',
    ekr: 'ekr',
    ekrHint: 'Kosongkan bila belum tahu; bisa diisi per sesi.',
    inSkr: 'Masuk hitungan skr',
    pkji: 'Padanan PKJI',
    none: 'Tidak ada',
    color: 'Warna tombol',
    colorN: (n: number) => `Warna ${n}`,
    moveUp: 'Naikkan',
    moveDown: 'Turunkan',
    remove: 'Hapus jenis',
    add: 'Tambah jenis',
    untitled: 'Jenis baru',
    save: 'Simpan klasifikasi',
    saved: 'Klasifikasi tersimpan',
    fixErrors: 'Periksa isian yang ditandai merah.',
    notFound: 'Klasifikasi tidak ditemukan.',
  },
  settings: {
    title: 'Pengaturan',
    version: 'Versi app',
  },
  install: {
    title: 'Panduan install',
    intro:
      'Pasang TC Counter ke layar utama supaya terbuka seperti aplikasi, layar penuh, dan tetap jalan tanpa sinyal.',
    android: 'Chrome di Android',
    androidSteps: [
      'Buka alamat TC Counter di Chrome.',
      'Ketuk menu ⋮ di kanan atas.',
      'Pilih "Tambahkan ke layar utama" atau "Instal aplikasi".',
      'Ketuk "Instal". Ikon TC Counter muncul di layar utama.',
    ],
    ios: 'Safari di iPhone',
    iosSteps: [
      'Buka alamat TC Counter di Safari (bukan Chrome).',
      'Ketuk tombol Bagikan (kotak dengan panah ke atas).',
      'Gulir ke bawah, pilih "Tambahkan ke Layar Utama".',
      'Ketuk "Tambah".',
    ],
    offlineTitle: 'Supaya bisa dipakai tanpa sinyal',
    offlineBody:
      'Buka app sekali saat ada internet. Setelah itu semua file tersimpan dan app bisa dibuka di lapangan tanpa sinyal.',
    warningTitle: 'Data survei ada di HP ini',
    warningBody:
      'Menghapus data browser, "Hapus data situs", atau meng-uninstall app akan menghapus semua survei yang belum di-export. Export Excel setiap selesai sesi.',
    iosNote:
      'Di iPhone, selalu buka dari ikon layar utama. Data di tab Safari biasa bisa dihapus otomatis bila jarang dibuka.',
  },
};
