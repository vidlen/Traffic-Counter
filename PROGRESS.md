# PROGRESS — TC Counter

| Milestone                       | Tanggal    | Status  |
| ------------------------------- | ---------- | ------- |
| M0 — Fondasi & deploy           | 26/09/2026 | Selesai |
| M1 — Klasifikasi                | 26/09/2026 | Selesai |
| M2 — Wizard sesi & jadwal       | 26/09/2026 | Selesai |
| M3 — Layar hitung & mesin timer | 27/09/2026 | Selesai |
| M4 — Rekap di app               | 27/09/2026 | Selesai |
| M5 — Export Excel               | 27/09/2026 | Selesai |
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

---

## M3 — Layar hitung & mesin timer (27/09/2026)

**Dibuat**

- `lib/engine.ts` (fungsi murni): status interval LENGKAP/PARSIAL/TERPUTUS/TERLEWAT dari jam mulai/selesai sesi + celah (digabung, tidak dihitung ganda), `closeInterval()`, fase sesi (MENUNGGU/BERJALAN/SELESAI, termasuk antar-blok dan mode manual), deteksi celah, pilihan target undo.
- `lib/sessionActions.ts` (Dexie): mulai sesi (maks. satu sesi aktif), `advance()` idempoten (buka interval manual, tutup semua interval yang habis termasuk catch-up, perbarui status), catat celah, heartbeat, ketukan langsung ke IndexedDB, undo, catatan, "Mulai interval berikutnya", "Mulai sekarang saja", selesai lebih awal.
- `useSessionEngine` dipasang di App (berjalan di semua halaman): tick 250 ms, heartbeat 5 s, celah bila jeda > 15 s, tutup interval otomatis + bunyi 2× + getar `[200,100,200]` + toast "Interval 07.15-07.30 tersimpan · 482 kend", mulai otomatis tepat waktu, pemberitahuan pemulihan ("App sempat tidak aktif ... ditandai TERPUTUS").
- **Layar hitung**: header (lokasi, jam HP, interval x/y, rentang, hitung mundur dari timestamp, progres, total interval), grid ruas 1-2 arah (2 sub-kolom bila jenis > 7; saran landscape untuk 2 arah), grid simpang (baris jenis × kolom gerakan, header gerakan menempel), tombol `pointerdown` multi-sentuh min. 56/72/88 px, angka besar = interval ini, angka kecil = total sesi; Undo; Koreksi (tombol bergaris merah, mati sendiri 5 s, tidak bisa negatif); Catatan (bottom sheet 8 kategori, Lainnya dengan teks); menu dengan **Selesaikan sesi (tahan 2 detik)**; status MENUNGGU (tombol abu-abu + hitung mundur / Mulai interval berikutnya / Mulai sekarang saja); ringkasan saat SELESAI.
- Ergonomi: Wake Lock (diminta ulang saat terlihat; saran bila tidak didukung), getar tiap ketukan (iOS: klik suara), bunyi Web Audio di-unlock saat Mulai, `beforeunload`, `overscroll-behavior: none`, tanpa seleksi teks/menu konteks, `touch-action: manipulation`.
- **Mode uji** ×10/×60 (jam per sesi, disimpan sehingga tahan reload; banner merah MODE UJI di semua layar).
- Halaman **Pengaturan** lengkap: ukuran tombol, getar, suara, tema terang kontras tinggi/gelap, default interval & klasifikasi, periode jam puncak, status penyimpanan persisten + pemakaian, versi app, Mode uji.

**Tes:** `npm test` 38 lulus. Engine murni: ketukan tepat di `t = end` → interval berikutnya; undo tidak negatif & tidak menembus interval terkunci; celah di tengah → TERPUTUS dengan `gapMs` benar; celah penuh → TERLEWAT; mulai terlambat / selesai lebih awal → PARSIAL. Integrasi Dexie + jam palsu: simpan otomatis saat timer habis, hitungan utuh setelah "refresh", app tertutup melewati akhir jadwal → TERPUTUS/TERLEWAT + sesi SELESAI, tab tertutup 2 menit → TERPUTUS, sesi 12 jam di Mode uji ×60 → 48 interval LENGKAP, mode manual, satu sesi aktif.

**Diuji di browser (emulasi HP):** wizard → Mulai → hitung mundur ke kelipatan jam → interval mulai otomatis → ketuk/undo/koreksi → toast interval tersimpan → sesi selesai sendiri; 5 ketukan cepat lalu langsung reload → kelimanya tersimpan.

**Cara coba di HP**

1. Pengaturan → Lanjutan → Mode uji ×60.
2. Buat sesi (15 menit, Mulai sekarang, 48 interval) → Mulai. 12 jam virtual selesai dalam 12 menit.
3. Uji: ketuk cepat dua tombol bersamaan, Undo, Koreksi, Catatan; refresh di tengah interval (hitungan harus utuh); tutup app 2 menit lalu buka lagi (muncul pemberitahuan dan interval ditandai TERPUTUS/TERLEWAT); kunci layar sebentar.

**Menyimpang / keputusan (mohon dicek)**

- Mesin hanya berjalan saat app **terlihat**. Jeda > 15 detik saat app tersembunyi (pindah app, layar terkunci, tab ditutup) dicatat sebagai celah → TERPUTUS/TERLEWAT. Jadi pindah ke WhatsApp > 15 s juga dihitung "tidak aktif".
- Hanya satu sesi BERJALAN/MENUNGGU per HP.
- Blok waktu: interval yang seluruhnya lewat sebelum tombol Mulai ditekan dicatat TERLEWAT (baris tetap ada di Excel, angka kosong).
- Undo hanya membatalkan ketukan (TAP), bukan koreksi, dan dilewati bila hitungan tombol itu sudah 0.
- "Mulai sekarang saja" menghitung ulang jadwal dari saat tombol ditekan (tidak menunggu kelipatan jam).
- Mode per interval: tombol Mulai di wizard langsung membuka interval pertama (atau menunggu kelipatan jam bila opsi aktif).
- Sesi yang selesai alami memakai `endedAt` = akhir interval terakhir.

**Checklist uji M3 (di HP)**

- [ ] Refresh di tengah interval → hitungan utuh
- [ ] Tab/app ditutup 2 menit lalu dibuka → pemberitahuan, TERPUTUS/TERLEWAT benar
- [ ] Sesi 12 jam di Mode uji ×60 lancar sampai selesai
- [ ] Blok waktu mulai otomatis tepat waktu (getar + bunyi)
- [ ] Dua tombol diketuk bersamaan → keduanya bertambah
- [ ] Layar tidak mati selama menghitung (Wake Lock)
- [ ] iPhone: klik suara sebagai pengganti getar

---

## M4 — Rekap di app (27/09/2026)

**Dibuat**

- `lib/aggregate.ts` (fungsi murni): baris interval per aliran + Total (kend, skr, per jenis), skr = Σ jumlah × ekr (kosong bila ekr belum lengkap; KTB tidak masuk skr), jam bulat, jam bergerak (n > 1), validitas (n interval, semua LENGKAP, berurutan tanpa celah, jam bulat harus tepat di jam), jam puncak per periode + keseluruhan (dari Total, basis kend/skr, seri → paling awal, jam tidak valid dipakai hanya bila tidak ada yang valid + tanda "*"), PHF, komposisi, rasio belok simpang. Interval TERLEWAT selalu kosong (bukan 0).
- Halaman **Rekap** (`/sesi/:id/rekap`): tab Per interval (warna status, tanda "ada catatan", opsi per jenis) | Per jam (jam bulat, jam bergerak, kartu jam puncak dengan PHF, volume tiap aliran, komposisi; komposisi seluruh survei; rasio belok untuk simpang) | Grafik (Chart.js lazy-load: garis per aliran + Total, putus di interval TERLEWAT, segitiga = interval dengan catatan, filter jenis) | Catatan (catatan kejadian + periode tidak aktif).
- Toggle **kend / skr** (skr hanya bila ekr lengkap); banner + editor ekr inline bila ekr belum lengkap, tombol "Ubah ekr" bila sudah. Mengubah ekr langsung menghitung ulang skr.
- `src/test/fixtures.ts`: data survei contoh deterministik (blok Pagi + Sore, PARSIAL/TERPUTUS/TERLEWAT, undo, koreksi, catatan) untuk tes dan demo.

**Tes:** `npm test` 52 lulus. Agregasi (§14): skr dengan ekr lengkap, skr kosong bila ekr kosong, KTB tidak masuk skr, TERLEWAT kosong; jam bergerak n = 4 (15 menit) dan n = 12 (5 menit), tidak dibuat untuk 60 menit; validitas; jam puncak per periode, seri → paling awal, jam tidak valid dikecualikan, periode lewat tengah malam; PHF 1.200 / (4 × 360) = 0,833; komposisi; rasio belok simpang.

**Cara coba di HP:** selesaikan satu sesi (Mode uji) → Beranda → Rekap → cek keempat tab, ganti kend/skr, kosongkan satu ekr lalu isi lagi.

**Menyimpang / keputusan (mohon dicek)**

- Basis awal rekap = skr bila ekr lengkap, selain itu kend.
- Jam bulat = interval dikelompokkan menurut jam tempat interval dimulai; valid hanya bila berisi n interval yang tepat mulai di jam bulat. Jadwal yang tidak mulai di kelipatan jam akan punya jam bulat "tidak valid" (jam bergerak tetap benar).
- Jam puncak interval 60 menit memakai jam bulat (tanpa PHF).
- Rasio belok dihitung pada jam puncak keseluruhan berbasis skr (butuh ekr lengkap).
- Periode jam puncak ditentukan oleh jam mulai jendela.

**Checklist uji M4**

- [ ] Angka rekap per interval sama dengan hitungan manual
- [ ] Jam puncak & PHF sesuai hitungan manual
- [ ] Toggle kend/skr dan editor ekr bekerja
- [ ] Grafik tampil offline

---

## M5 — Export Excel (27/09/2026)

**Dibuat**

- `lib/excel/buildWorkbook.ts` (murni, tanpa DOM/Dexie) + `sheets/` satu file per sheet, urutan tetap: **Info_Survei, Klasifikasi, Data_Interval, Rekap_Jam, Grafik, Data_Gabung, Log_Ketukan** (Log_Ketukan opsional, default aktif). `fullCalcOnLoad = true`.
- **Rumus live** + `result` hasil hitungan JS di setiap sel rumus. Hanya fungsi SUM, SUMPRODUCT, IF, OR, COUNT, COUNTBLANK, MAX (diuji otomatis terhadap daftar yang diizinkan).
- Waktu ditulis sebagai **serial waktu lokal** (`toExcelSerial`), tidak pernah objek `Date`; format `dd/mm/yyyy`, `hh:mm`, `dd/mm/yyyy hh:mm:ss`.
- Klasifikasi: sel ekr = sumber semua skr (ubah ekr di Excel → skr ikut berubah). Data_Interval: baris ekr di bawah header, blok per aliran lalu blok Total (rumus penjumlahan baris yang bersesuaian), Total kend/skr dengan penjaga `COUNT(...)=0` sehingga baris TERLEWAT kosong (bukan 0), warna baris sesuai status, catatan per interval. Rekap_Jam: A jam bulat, B jam bergerak (+ V maks), C jam puncak per periode + keseluruhan (baris dipilih app; volume, V maks, PHF, komposisi = rumus), D komposisi seluruh survei, E rasio belok (simpang). Data_Gabung: 19 kolom tetap, skr = `IF(OR(P2="",Q2=""),"",P2*Q2)` relatif baris, autofilter. Info_Survei: kunci-nilai, catatan kejadian, periode tidak aktif, legenda warna, cara gabung antar-HP, cap **DATA UJI** untuk Mode uji.
- Freeze pane, lebar kolom, cetak landscape A4 muat selebar halaman.
- `chartImage.ts`: Chart.js di kanvas tersembunyi 1600 × 800, latar putih, tanpa animasi → PNG (garis per interval; batang per jam bulat).
- Nama file `TC_{lokasi}_{posisi}_{YYYYMMDD}_{surveyor}.xlsx` (disanitasi).
- **Dialog Export** (dari Rekap, kartu Beranda, dan layar sesi selesai): opsi Log_Ketukan & basis jam puncak → Buat file (ExcelJS + Chart.js di-load dinamis) → **Bagikan** (bila `navigator.canShare({ files })`) / **Unduh** → `exportedAt` diisi → badge "Belum di-export" hilang.

**Tes:** `npm test` 62 lulus. Excel (tulis → baca ulang dengan ExcelJS di Node): nama & urutan sheet, header Data_Interval & Data_Gabung, rumus ekr/Total kend/Total skr/blok Total + `result`, serial waktu (06.00 → pecahan 0,25; tanggal 46027), baris TERLEWAT kosong (dicek juga di XML mentah: `t="str"` + `<v></v>`), PHF live, Data_Gabung relatif baris, Klasifikasi Ya/Tidak & ekr kosong, Log_Ketukan TAP/UNDO/KOREKSI, fungsi yang dipakai, simpang (blok LT/ST/RT/Total lengan, pLT/pRT), ekr belum lengkap → skr kosong & basis kend, cap DATA UJI, sanitasi nama file.

**Cara coba di HP:** Rekap → Export Excel → Buat file → Bagikan ke WhatsApp/Drive atau Unduh → buka di Excel / WPS / Google Sheets → ubah satu ekr di sheet Klasifikasi dan pastikan skr di Data_Interval & Rekap_Jam ikut berubah.

**Menyimpang / keputusan (mohon dicek)**

- Basis jam puncak di Excel dipilih di dialog export (default skr bila ekr lengkap). V maks interval dan PHF memakai basis yang sama.
- Kolom Mulai/Selesai berisi serial tanggal+jam (tampil `hh:mm`) supaya tetap benar lewat tengah malam dan mudah digabung.
- Kolom Posisi di Data_Gabung berisi nama posisi; Gerakan `-` untuk ruas; Durasi_Menit = panjang interval terjadwal.
- Rentang di label jam memakai tanda hubung biasa (`07.15-08.15`).
- Pembaca ExcelJS membuang hasil string kosong saat membaca file; file yang ditulis tetap berisi hasil kosong (terverifikasi di XML).

**Checklist uji M5 (manual)**

- [ ] File terbuka benar di Microsoft Excel
- [ ] File terbuka benar di WPS Office (HP)
- [ ] File terbuka benar di Google Sheets
- [ ] Ubah ekr di Klasifikasi → skr berubah di Data_Interval & Rekap_Jam
- [ ] Data_Gabung dari 2 HP bisa digabung lalu dibuat PivotTable
- [ ] Bagikan ke WhatsApp dan Drive dari HP
