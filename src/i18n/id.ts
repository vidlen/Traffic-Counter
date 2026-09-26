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
