# PROGRESS — TC Counter

| Milestone                       | Tanggal    | Status  |
| ------------------------------- | ---------- | ------- |
| M0 — Fondasi & deploy           | 26/09/2026 | Selesai |
| M1 — Klasifikasi                | 26/09/2026 | Selesai |
| M2 — Wizard sesi & jadwal       | 26/09/2026 | Selesai |
| M3 — Layar hitung & mesin timer |            | Belum   |
| M4 — Rekap di app               |            | Belum   |
| M5 — Export Excel               |            | Belum   |
| M6 — Pengerasan lapangan        |            | Belum   |

---

## M0 — Fondasi & deploy (26/09/2026)

**Dibuat**

- Scaffold Vite 8 + React 19 + TypeScript (strict), Tailwind 4, ESLint 10 + Prettier, Vitest 5.
- Hash router (React Router 8), Dexie (skema v1 sesuai BRIEF §5), `clock.ts` (bisa dipercepat untuk Mode uji), `i18n/id.ts`.
- PWA (`vite-plugin-pwa`, `registerType: 'prompt'`, precache semua aset, manifest relatif terhadap base). Banner "Versi baru tersedia" di Beranda.
- Halaman: Beranda, Klasifikasi, Pengaturan, Panduan install (isi lengkap).
- Ikon PWA dibuat dengan `scripts/make-icons.mjs` (tanpa dependency).
- Workflow `.github/workflows/deploy.yml` (test → build dengan `BASE_PATH` → deploy Pages).

**Tes:** `npm test` 3 lulus · `npm run build` OK · `npm run lint` bersih.

**Cara coba di HP**

1. GitHub repo → Settings → Pages → Source: **GitHub Actions** (sekali saja), lalu jalankan ulang workflow "Deploy ke GitHub Pages".
2. Buka `https://vidlen.github.io/Traffic-Counter/` di Chrome Android / Safari iOS, install lewat Panduan install.
3. Nyalakan mode pesawat, buka dari ikon: app harus tetap terbuka.

**Menyimpang dari brief (dan alasannya)**

- TypeScript **6.0.3**, bukan 7.x: TS 7 (compiler Go) belum didukung `typescript-eslint` (butuh `<6.1`).
- Versi action di workflow memakai major terbaru saat ini (`checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`), sesuai §12 "pakai versi major terbaru".
- Tambahan dev dependency `@types/node` (hanya tipe, untuk `vite.config.ts` dan script).
- Font memakai font sistem (SF Pro di iOS, Roboto/One UI di Android): app offline-only dan tidak menambah dependency font.

**Keputusan desain**

- Identitas "aspal & marka": latar aspal `#17191B`, putih cat marka `#EDEBE4`, satu aksen kuning marka `#F2B705`.
- Logo "gerbang hitung": empat garis tally dipotong diagonal kuning (hitungan ke-5), dengan celah negatif di sekitar diagonal.
- Tema terang kontras tinggi sebagai default; tema gelap tersedia. Radius 12 px untuk semua kotak/tombol, pil hanya untuk badge status. Angka memakai `tabular-nums`.

**Checklist uji M0**

- [ ] Situs live di GitHub Pages
- [ ] Bisa di-install di Android (Chrome)
- [ ] Bisa di-install di iPhone (Safari)
- [ ] Terbuka offline setelah kunjungan pertama

---

## M1 — Klasifikasi (26/09/2026)

**Dibuat**

- `lib/presets.ts`: 4 preset bawaan (PKJI 2023, PKJI 2023 Perkotaan, Bina Marga Gol. 1-8, Sederhana), palet 14 warna tombol, `validateTemplate()`, `fillEkrFromPkji()` (untuk tombol "Isi ekr dari padanan PKJI" di M2), `textOn()` (teks putih/gelap otomatis).
- Seed ke Dexie setiap DB dibuka (`on('ready')` → `bulkPut`), sehingga preset selalu sama dengan kode.
- Halaman **Klasifikasi**: daftar bawaan + kustom, Lihat/Edit, Duplikat, Hapus (kustom; diblokir bila dipakai sesi BERJALAN/MENUNGGU).
- **Editor kustom**: nama, kode, nama jenis, keterangan, ekr (koma desimal), masuk skr, padanan PKJI, warna, urutan ↑↓, tambah/hapus jenis, validasi (kode unik, 1-5 huruf/angka, maks. 14 jenis, min. 1). Preset bawaan tampil read-only dengan tombol Duplikat.

**Tes:** `npm test` 12 lulus (seed, isi preset, ekr hanya MP = 1,00, KTB/G8/Lainnya tidak masuk skr, kontras semua warna ≥ 4,5:1, validasi, isi ekr dari padanan).

**Cara coba di HP:** Beranda → Klasifikasi kendaraan → Duplikat "Bina Marga Gol. 1-8" → ubah kode jadi sama dengan jenis lain → Simpan (harus ditolak, baris bentrok ditandai merah) → perbaiki → Simpan.

**Menyimpang / keputusan (mohon dicek)**

- Preset Sederhana memakai kode `MTR`, `MBL`, `BUS`, `TRK`, `LAIN`; padanan PKJI hanya Motor → SM dan Mobil → MP (Bus/Truk/Lainnya dibiarkan tanpa padanan karena bisa masuk beberapa kelas).
- Warna jenis dipilih dari palet 14 warna yang sudah diuji kontras (bukan color picker bebas) supaya tombol tetap terbaca di bawah matahari.
- Kode dibandingkan tanpa beda huruf besar/kecil (`G5a` = `g5A`) untuk mencegah kolom Excel yang membingungkan.
- Salinan preset disimpan dengan skema `KUSTOM`.
- Keterangan singkat tiap jenis PKJI/Bina Marga perlu diverifikasi pemilik proyek (§15).

**Checklist uji M1**

- [ ] Preset tidak bisa diedit, hanya dilihat/diduplikat
- [ ] Duplikat → edit → simpan → muncul di daftar Kustom
- [ ] Kode ganda / kosong ditolak
- [ ] Hapus kustom bekerja

---

## M2 — Wizard sesi & jadwal (26/09/2026)

**Dibuat**

- `lib/schedule.ts`: `buildSchedule()` (Mulai sekarang: N interval / sampai jam, opsi mulai di kelipatan jam; Blok waktu: blok berurutan, boleh lewat tengah malam), `validateTiming()`, `previewSchedule()`.
- `lib/time.ts`: format Indonesia (dd/mm/yyyy, HH.mm), rentang dengan tanggal bila beda hari, hitung mundur, `toExcelSerial()`.
- `lib/session.ts`: sesi baru, duplikat pengaturan, aliran (arah / gerakan), helper posisi ruas & simpang.
- **Wizard 5 langkah** (`/sesi/baru`, `/sesi/:id/edit`): Info → Tipe & posisi (ruas 1-2 arah; simpang 3/4 lengan, pilih lengan yang tidak ada, 1 lengan dihitung + gerakan LT/ST/RT/UT) → Klasifikasi & ekr (snapshot template, tabel ekr per sesi, tombol "Isi ekr dari padanan PKJI", peringatan ekr kosong) → Waktu (interval pembagi 60, Menerus/Blok/Manual, pratinjau jadwal) → Ringkasan & checklist. Langkah tersimpan di URL (`?langkah=n`) sehingga tombol back HP kembali ke langkah sebelumnya.
- Sesi disimpan sebagai **DRAFT**; `navigator.storage.persist()` diminta saat simpan pertama.
- Beranda: daftar sesi (aktif, draf, selesai), kartu dengan status, badge "Belum di-export" & "Mode uji", aksi Lanjutkan / Duplikat pengaturan / Hapus (konfirmasi ketik nama lokasi).

**Tes:** `npm test` 24 lulus, termasuk semua tes jadwal wajib §14 (48 interval 06.00-18.00, alignToClock 07.13.20 → 07.15.00, blok Pagi/Siang/Sore, blok 22.00-02.00, tolak pembagi 60 / tumpang tindih / bukan kelipatan) dan `toExcelSerial` 07.15 → 0,302083.

**Cara coba di HP:** Buat sesi baru → isi lokasi & surveyor → pilih Simpang 3 lengan → pilih Bina Marga, isi ekr kelas PKJI lalu "Isi ekr dari padanan PKJI" → Waktu: Blok waktu → cek pratinjau (32 interval, 06.00-06.15 s/d 17.45-18.00, 8 jam) → Simpan draf → muncul di Beranda bagian Draf.

**Menyimpang / keputusan (mohon dicek)**

- Urutan blok waktu mengikuti urutan input: blok pertama di tanggal sesi, blok berikutnya pada kemunculan jam mulainya setelah blok sebelumnya selesai. "Tumpang tindih" = rentang total > 24 jam (mis. 06.00-09.00 lalu 08.00-10.00).
- "Sampai jam HH.mm" hanya membuat interval penuh; sisa waktu di ujung (bila tidak pas kelipatan) tidak dihitung.
- Simpang 3 lengan: pengguna memilih arah lengan yang tidak ada (kunci posisi U/T/S/BR tetap bermakna).
- Rentang waktu memakai tanda hubung biasa (`07.15-07.30`), bukan en dash.

**Checklist uji M2**

- [ ] Wizard menolak lanjut bila lokasi/surveyor kosong
- [ ] Pratinjau jadwal sesuai (Mulai sekarang, Blok, lewat tengah malam)
- [ ] Draf tersimpan, bisa dilanjutkan (edit), diduplikat, dihapus
- [ ] Tombol back HP kembali ke langkah sebelumnya
