# TC Counter

Aplikasi web (PWA) untuk **traffic counting manual**. Surveyor mengetuk tombol jenis kendaraan di HP, aplikasi mengatur interval waktu, **menyimpan hasil tiap interval otomatis**, lalu menghasilkan **Excel siap olah** dengan rumus live. Berjalan offline dan bisa dipasang ke layar utama HP.

Alamat: **https://vidlen.github.io/Traffic-Counter/**

---

## Panduan pengguna

### 1. Pasang di HP

- **Android (Chrome):** buka alamat di atas → menu ⋮ → _Tambahkan ke layar utama_ / _Instal aplikasi_.
- **iPhone (Safari):** buka alamat di atas di Safari → tombol Bagikan → _Tambahkan ke Layar Utama_.
- Buka app sekali saat ada internet. Setelah itu app bisa dipakai tanpa sinyal.
- Di iPhone selalu buka dari ikon layar utama (data di tab Safari biasa bisa dihapus otomatis).

> **Data survei hanya tersimpan di HP ini.** Menghapus data browser atau meng-uninstall app menghapus survei yang belum di-export. **Export Excel setiap selesai sesi.**

### 2. Sebelum survei

1. **Klasifikasi kendaraan** (menu di Beranda): pilih preset PKJI 2023, PKJI 2023 Perkotaan, Bina Marga Gol. 1-8, atau Sederhana. Preset tidak bisa diubah; tekan _Duplikat_ untuk membuat versi sendiri (tambah/hapus jenis, ubah kode, warna, ekr, urutan).
2. **Pengaturan:** ukuran tombol (Besar/Sangat besar untuk di lapangan), getar, suara, tema, batas periode jam puncak.
3. **Buat sesi baru** (5 langkah):
   - _Info_: lokasi, tanggal, surveyor, tipe jalan, cuaca.
   - _Tipe & posisi_: ruas (1-2 arah dihitung di HP ini) atau simpang (1 lengan per HP + gerakan LT/ST/RT/UT).
   - _Klasifikasi & ekr_: ekr diisi per sesi sesuai tipe jalan (PKJI 2023). Untuk Bina Marga, isi ekr kelas PKJI sekali lalu tekan _Isi ekr dari padanan PKJI_. ekr boleh diisi belakangan (di Rekap atau di Excel).
   - _Waktu_: panjang interval (pembagi 60), **Menerus** (mulai sekarang, atau blok waktu seperti Pagi 06.00-09.00, Siang, Sore) atau **Per interval (manual)**. Cek pratinjau jadwal.
   - _Ringkasan & cek_: pastikan **jam HP diatur otomatis** (supaya semua HP selaras), baterai cukup, volume & getar aktif.
4. Tekan **Mulai** (atau _Simpan draf_ untuk dimulai nanti).

### 3. Saat menghitung

- Ketuk tombol jenis kendaraan: angka besar = interval ini, angka kecil = total sesi. Dua tombol boleh diketuk bersamaan.
- **Undo**: membatalkan ketukan terakhir di interval berjalan.
- **Koreksi**: aktifkan, lalu setiap ketukan mengurangi 1 (tombol bergaris merah; mati sendiri setelah 5 detik).
- **Catatan**: hujan, kecelakaan, macet, APILL mati, dll. Sekali ketuk langsung tersimpan dengan jamnya.
- Saat timer habis, interval **tersimpan otomatis** (bunyi 2×, getar, pesan "Interval ... tersimpan").
- Blok waktu berikutnya mulai otomatis tepat waktu. Mode per interval: tekan _Mulai interval berikutnya_.
- Menu ⋮ → _Selesaikan sesi_ (tahan 2 detik) bila selesai lebih awal.
- **Biarkan app tetap terbuka dan layar menyala.** Bila app tertutup, layar terkunci, atau pindah ke app lain lebih dari 15 detik, periode itu dicatat sebagai _tidak aktif_ dan interval yang terkena ditandai (lihat tabel di bawah). Hitungan yang sudah diketuk tidak hilang, termasuk saat halaman ter-refresh.
- Hanya satu sesi yang bisa berjalan pada satu HP.

| Status interval | Arti                                           | Di rekap & Excel                    |
| --------------- | ---------------------------------------------- | ----------------------------------- |
| LENGKAP         | App aktif penuh sepanjang interval             | normal                              |
| PARSIAL         | Mulai terlambat / sesi dihentikan lebih awal   | kuning, dihitung tapi ditandai      |
| TERPUTUS        | Ada periode app tidak aktif di tengah interval | oranye, dihitung tapi ditandai      |
| TERLEWAT        | Seluruh interval lewat saat app tidak aktif    | abu-abu, **angka kosong (bukan 0)** |

### 4. Setelah survei

- **Rekap** (tab Per interval, Per jam, Grafik, Catatan): volume kend/skr, jam bulat, jam bergerak, jam puncak per periode, PHF, komposisi, rasio belok (simpang). Jam puncak dipilih dari jam yang semua intervalnya LENGKAP.
- **Export Excel** → _Bagikan_ (WhatsApp/Drive) atau _Unduh_. Badge "Belum di-export" hilang setelah berhasil.
- Isi Excel: Info_Survei, Klasifikasi, Data_Interval, Rekap_Jam, Grafik, Data_Gabung, Log_Ketukan. Semua total, skr, rekap jam, PHF, dan komposisi berupa **rumus**. Mengubah ekr di sheet _Klasifikasi_ memperbarui seluruh skr.

### 5. Menggabung data beberapa HP

1. Kumpulkan file Excel dari tiap HP.
2. Salin semua baris sheet **Data_Gabung** dari tiap file ke satu sheet (judul kolom cukup dari file pertama). Kolomnya selalu sama untuk semua HP.
3. _Insert → PivotTable_. Baris: Mulai / Posisi / Gerakan; Kolom: Kode_Jenis; Nilai: Jumlah atau skr.

### 6. Mode uji

_Pengaturan → Lanjutan → Mode uji_ (×10 atau ×60) untuk mencoba alur 15 menit / 12 jam dalam hitungan menit. Banner merah MODE UJI tampil di semua layar dan Excel diberi cap DATA UJI.

### 7. Tips lapangan

- Di bawah terik: tema terang kontras tinggi, ukuran tombol Besar/Sangat besar.
- Ruas 2 arah dengan banyak jenis: putar HP ke landscape.
- Bawa power bank; layar dijaga tetap menyala selama menghitung.
- Semua HP dalam satu tim memakai jam otomatis agar interval selaras.

---

## Pengembangan

Spesifikasi: [BRIEF.md](BRIEF.md) · aturan kerja: [CLAUDE.md](CLAUDE.md) · progres & checklist uji: [PROGRESS.md](PROGRESS.md).

Butuh Node 22 LTS.

```
npm install
npm run dev        # server lokal
npm run build      # build produksi (BASE_PATH opsional, mis. /Traffic-Counter/)
npm test           # vitest run
npm run lint
npm run icons      # buat ulang ikon PWA dari logo
```

Stack: Vite + React + TypeScript, Tailwind CSS, Zustand, Dexie (IndexedDB), vite-plugin-pwa, ExcelJS, Chart.js, date-fns, Vitest.

### Deploy

Push ke `main` menjalankan GitHub Actions (tes → build → GitHub Pages). Sekali saja di GitHub: **Settings → Pages → Source: GitHub Actions**.

## Lisensi

GPL-3.0, lihat [LICENSE](LICENSE).
