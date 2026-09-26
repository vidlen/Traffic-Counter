# BRIEF — TC Counter (Web App Traffic Counting)

> **Nama kerja:** TC Counter (boleh diganti).
> **Untuk:** Claude Code. Kerjakan **per milestone** (§13), jangan sekaligus.
> **Aturan kerja singkat** ada di `CLAUDE.md`. Kalau brief ini ambigu atau bertentangan, **tanya dulu**.

---

## 0. Cara pakai brief ini

1. Taruh `BRIEF.md` dan `CLAUDE.md` di root repo GitHub.
2. Buka Claude Code di folder repo, lalu:
   - `Baca BRIEF.md dan CLAUDE.md. Kerjakan Milestone 0 saja, jalankan tes, lalu berhenti dan laporkan.`
   - Setelah dicek di HP: `Lanjut Milestone 1.` dan seterusnya.
3. Di GitHub: **Settings → Pages → Source: GitHub Actions** (sekali saja). Situs akan tampil di `https://<username>.github.io/<nama-repo>/`.

---

## 1. Latar & tujuan

TC manual biasanya pakai hand counter + formulir kertas, lalu diketik ulang ke Excel. App ini menggantikan keduanya: surveyor mengetuk tombol jenis kendaraan di HP, app mengatur interval waktu, **menyimpan hasil tiap interval otomatis saat timer habis**, dan menghasilkan Excel siap olah.

Target v1:

1. Hitung per jenis kendaraan, **per arah** (ruas jalan) atau **per gerakan LT/ST/RT** (simpang).
2. Klasifikasi bisa dipilih: **PKJI 2023**, **Bina Marga golongan 1–8**, **Sederhana**, atau **Kustom**.
3. Timer interval (5/10/15/20/30/60 menit atau kustom). Mode **Menerus** (termasuk blok waktu) atau **Per interval (manual)**, dipilih per sesi.
4. Simpan otomatis tiap interval selesai; data aman walau halaman ter-refresh atau HP mati.
5. Rekap di app + export Excel (`.xlsx`) dengan **rumus live**.
6. Offline, bisa di-install ke layar utama HP, di-host di **GitHub Pages**.
7. Semua teks UI dalam **bahasa Indonesia**.

### Di luar lingkup v1 (jangan dibangun)

- Backend, login, sinkron online, analytics, request jaringan saat runtime.
- Penggabungan data antar-HP di dalam app → **digabung manual di Excel** (app menyediakan sheet format panjang `Data_Gabung` untuk itu, §11).
- Mode hitung dari video/CCTV, GPS, foto.
- Survei kecepatan, antrian, okupansi, deteksi kendaraan otomatis.
- Mengedit angka interval yang sudah tersimpan (koreksi dilakukan di Excel).

---

## 2. Pengguna & kondisi lapangan

- Surveyor berdiri di tepi jalan, HP dipegang satu tangan, sering di bawah terik matahari. Ketukan harus cepat (motor bisa lewat beruntun) dan tidak butuh melihat layar lama.
- Durasi survei 1–16 jam, bisa melewati tengah malam.
- Satu tim = beberapa HP. Tiap HP pegang **1–2 arah** (ruas) atau **1 lengan** (simpang). Tiap HP export Excel sendiri; koordinator menggabung manual.
- Sinyal bisa hilang, baterai terbatas, layar bisa terkunci, browser bisa di-kill sistem.

---

## 3. Stack

| Kebutuhan | Pilihan |
|---|---|
| Build | Vite + React + TypeScript (`strict`) |
| Routing | React Router dengan **hash router** (aman di GitHub Pages, refresh tidak 404) |
| Styling | Tailwind CSS |
| State UI | Zustand |
| Data lokal | Dexie (IndexedDB) + `dexie-react-hooks` |
| PWA / offline | `vite-plugin-pwa` (Workbox) |
| Excel | ExcelJS — **di-load dinamis** (`import()`) hanya saat export |
| Grafik | Chart.js + `react-chartjs-2` |
| Tanggal | `date-fns` |
| Tes | Vitest + `@testing-library/react` + `jsdom` + `fake-indexeddb` |
| Kualitas | ESLint + Prettier |

Pakai versi stabil terbaru. Node 22 LTS. Jangan tambah dependency lain tanpa bertanya.

---

## 4. Struktur folder

```
src/
  main.tsx  App.tsx  router.tsx
  i18n/id.ts                  # semua teks UI
  types.ts
  lib/
    clock.ts                  # sumber waktu tunggal; bisa dipercepat di Mode uji
    db.ts                     # skema Dexie
    presets.ts                # preset klasifikasi bawaan
    schedule.ts               # buildSchedule(): daftar interval dari pengaturan sesi
    engine.ts                 # tutup interval, pemulihan (catch-up), status interval
    aggregate.ts              # rekap interval, jam bulat, jam bergerak, puncak, PHF, komposisi, rasio belok
    time.ts                   # format waktu Indonesia, konversi ke serial Excel
    excel/
      buildWorkbook.ts
      sheets/  info.ts  klasifikasi.ts  dataInterval.ts  rekapJam.ts  grafik.ts  dataGabung.ts  logKetukan.ts
      chartImage.ts           # Chart.js di <canvas> tersembunyi → PNG
      fileName.ts
  hooks/  useCounterSession.ts  useWakeLock.ts  useHaptics.ts  useBeep.ts  useBeforeUnload.ts
  pages/  Home.tsx  SessionWizard/  Counter.tsx  Recap.tsx  Classifications.tsx
          ClassificationEditor.tsx  Settings.tsx  InstallGuide.tsx
  components/
public/icons/
.github/workflows/deploy.yml
BRIEF.md  CLAUDE.md  PROGRESS.md  README.md
```

---

## 5. Istilah & model data

**Istilah**

- **Sesi** — satu survei di satu HP (satu lokasi, satu tanggal mulai, satu surveyor).
- **Posisi** — yang diamati: arah (ruas) atau lengan/pendekat (simpang).
- **Aliran** — satu set tombol hitung. RUAS: satu arah. SIMPANG: satu gerakan (LT/ST/RT, opsional UT) pada lengan yang diamati. Rekap dan Excel disusun **per aliran + total**.
- **Interval** — satu periode hitung, rentang `[mulai, selesai)`.
- **ekr / skr** — ekivalen kendaraan ringan / satuan kendaraan ringan (istilah PKJI 2023).

**Tipe data** (`src/types.ts`, boleh disesuaikan asal maknanya sama):

```ts
type SchemeId = 'PKJI2023' | 'PKJI2023_KOTA' | 'BM8' | 'SEDERHANA' | 'KUSTOM';
type PkjiClass = 'SM' | 'MP' | 'KS' | 'BB' | 'TB' | 'KTB';
type Movement = 'LT' | 'ST' | 'RT' | 'UT';
type SurveyType = 'RUAS' | 'SIMPANG';

interface VehicleType {
  code: string;            // 'SM', 'MP', 'G5a' — unik, 1–5 karakter
  name: string;
  description?: string;
  color: string;           // hex, untuk tombol
  ekr: number | null;      // null = belum diisi
  inSkr: boolean;          // false untuk KTB / kendaraan yang tidak dikonversi
  pkji?: PkjiClass;        // padanan ke kelas PKJI (opsional)
  order: number;
}

interface ClassificationTemplate {
  id: string; name: string; scheme: SchemeId; builtIn: boolean;
  vehicleTypes: VehicleType[]; updatedAt: number;
}

interface Position {
  key: string;             // arah: 'A', 'B' · lengan: 'U', 'T', 'S', 'BR'
  label: string;           // 'Arah ke Tugu', 'Lengan Utara (Jl. Kaliurang)'
  movements: Movement[] | null;   // null untuk RUAS
}

interface TimeBlock { label: string; start: string; end: string }   // 'HH:mm'

interface Session {
  id: string;
  project: string; location: string; surveyor: string;
  date: string;                    // YYYY-MM-DD (tanggal mulai)
  roadInfo?: string;               // tipe jalan / keterangan, bebas
  weather?: string; remarks?: string;
  surveyType: SurveyType;
  positions: Position[];           // semua arah/lengan di lokasi (untuk info)
  countedKeys: string[];           // yang dihitung di HP ini (RUAS: 1–2, SIMPANG: 1)
  classification: ClassificationTemplate;   // SNAPSHOT, dibekukan saat sesi dibuat (ekr tetap boleh diubah)
  intervalMin: number;
  timerMode: 'MENERUS' | 'MANUAL';
  schedule:                          // khusus MENERUS
    | { kind: 'SEKARANG'; alignToClock: boolean; count?: number; until?: string }
    | { kind: 'BLOK'; blocks: TimeBlock[] };
  manual?: { maxIntervals?: number; snapToClock: boolean };   // khusus MANUAL
  status: 'DRAFT' | 'MENUNGGU' | 'BERJALAN' | 'SELESAI';
  startedAt?: number; endedAt?: number;
  lastAliveAt?: number;            // heartbeat
  gaps: { from: number; to: number }[];   // periode app tidak aktif
  exportedAt?: number;
  testMode: boolean;               // sesi Mode uji (waktu dipercepat)
  createdAt: number;
}

interface CountEvent {
  seq?: number;                    // auto-increment Dexie
  id: string;
  sessionId: string;
  t: number;                       // clock.now(), epoch ms
  positionKey: string;
  movement: Movement | null;
  vehicleCode: string;
  delta: 1 | -1;
  kind: 'TAP' | 'UNDO' | 'KOREKSI';
  undoOf?: string;
}

type IntervalStatus = 'TERBUKA' | 'LENGKAP' | 'PARSIAL' | 'TERPUTUS' | 'TERLEWAT';

interface IntervalRecord {
  sessionId: string; index: number;       // mulai dari 1
  start: number; end: number;             // jadwal
  actualStart: number; actualEnd: number; // yang benar-benar teramati
  blockLabel?: string;
  status: IntervalStatus;
  gapMs: number;
  counts: Record<string, number>;         // key `${positionKey}|${movement ?? '-'}|${vehicleCode}`
  savedAt?: number;
}

type NoteCategory = 'HUJAN_RINGAN' | 'HUJAN_DERAS' | 'KECELAKAAN' | 'MACET'
  | 'APILL_MATI' | 'DIATUR_PETUGAS' | 'ACARA' | 'LAINNYA';

interface NoteEvent { id: string; sessionId: string; t: number; category: NoteCategory; text?: string }
```

**Skema Dexie** (`src/lib/db.ts`):

```ts
db.version(1).stores({
  templates: 'id, scheme, builtIn',
  sessions:  'id, status, createdAt',
  events:    '++seq, id, sessionId, [sessionId+t]',
  intervals: '[sessionId+index], sessionId',
  notes:     'id, sessionId, [sessionId+t]',
  settings:  'key',
});
```

---

## 6. Klasifikasi kendaraan

Preset bawaan bersifat **read-only**; pengguna bisa **duplikat lalu edit** menjadi klasifikasi kustom. Pengguna **memilih** klasifikasi saat membuat sesi.

**A. PKJI 2023 (umum)**

| Kode | Nama | inSkr | ekr awal |
|---|---|---|---|
| SM | Sepeda motor | ya | kosong |
| MP | Mobil penumpang | ya | 1,00 |
| KS | Kendaraan sedang | ya | kosong |
| BB | Bus besar | ya | kosong |
| TB | Truk besar | ya | kosong |
| KTB | Kendaraan tidak bermotor | **tidak** | — |

**B. PKJI 2023 — Perkotaan:** SM, MP, KS, KTB (BB & TB dicatat sebagai KS, sesuai praktik PKJI untuk jalan perkotaan). ekr sama aturannya dengan A.

**C. Bina Marga golongan 1–8** (pencacahan lalu lintas manual)

| Kode | Nama | Padanan PKJI awal |
|---|---|---|
| G1 | Sepeda motor, skuter, kendaraan roda 3 | SM |
| G2 | Sedan, jeep, station wagon | MP |
| G3 | Opelet, pickup-opelet, suburban, kombi, minibus | MP |
| G4 | Pickup, micro truk, mobil hantaran | MP |
| G5a | Bus kecil | KS |
| G5b | Bus besar | BB |
| G6a | Truk ringan 2 sumbu | KS |
| G6b | Truk sedang 2 sumbu | KS |
| G7a | Truk 3 sumbu | TB |
| G7b | Truk gandengan | TB |
| G7c | Truk semi trailer | TB |
| G8 | Kendaraan tidak bermotor | KTB (inSkr tidak) |

ekr semua kosong. Di layar ekr ada tombol **"Isi ekr dari padanan PKJI"** yang menyalin ekr kelas PKJI ke tiap golongan (pengguna isi ekr kelas PKJI sekali).

**D. Sederhana:** Motor, Mobil, Bus, Truk, Lainnya — ekr kosong, semua inSkr ya kecuali Lainnya.

**E. Kustom (editor):** tambah/hapus jenis, ubah urutan (tombol ↑↓), nama, kode, warna, ekr, inSkr, padanan PKJI. Validasi: kode unik, maksimal 14 jenis, minimal 1.

**Aturan:**
- **ekr tidak pernah di-hardcode di logika hitung.** Preset hanya mengisi MP = 1,00; sisanya diisi pengguna sesuai tipe jalan/simpang (nilai ekr PKJI 2023 bergantung tipe jalan dan arus).
- Saat sesi dibuat, klasifikasi **di-snapshot** ke sesi. Mengedit template tidak mengubah sesi lama. Nilai ekr di sesi tetap boleh diubah kapan saja (hanya memengaruhi skr).
- Warna tombol bawaan harus saling kontras dan terbaca di bawah matahari.

---

## 7. Alur layar

### 7.1 Beranda
- Tombol besar **Buat sesi baru**.
- Daftar sesi: aktif (BERJALAN/MENUNGGU) di atas, lalu selesai. Tiap kartu: lokasi, tanggal, posisi, jumlah interval, total kendaraan, badge **"Belum di-export"** bila `exportedAt` kosong.
- Aksi per sesi: Lanjutkan / Rekap / Export Excel / Duplikat pengaturan (tanpa data) / Hapus (konfirmasi ketik nama lokasi).
- Menu: Klasifikasi, Pengaturan, Panduan install.
- Banner "Versi baru tersedia — muat ulang" **hanya** tampil di sini dan hanya bila tidak ada sesi aktif.

### 7.2 Wizard buat sesi (5 langkah)
1. **Info** — proyek, lokasi, tanggal, nama surveyor, tipe jalan/keterangan (bebas), cuaca awal, catatan.
2. **Tipe & posisi**
   - RUAS: jumlah arah (1 = jalan satu arah, 2), nama tiap arah; pilih yang dihitung di HP ini (1 atau 2).
   - SIMPANG: 3 atau 4 lengan, nama tiap lengan; pilih **1 lengan** yang dihitung; centang gerakan yang ada di lengan itu (LT/ST/RT, opsional UT).
3. **Klasifikasi & ekr** — pilih template; tampilkan daftar jenis; tabel ekr bisa diedit untuk sesi ini; peringatan bila ada ekr kosong ("skr tidak dihitung sampai ekr lengkap — bisa diisi nanti di Rekap atau di Excel").
4. **Waktu**
   - Panjang interval: 5 / 10 / 15 / 20 / 30 / 60 menit atau kustom (**harus pembagi 60**: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60).
   - Mode timer (§8): **Menerus** (Mulai sekarang / Blok waktu) atau **Per interval (manual)**.
   - Pratinjau jadwal: jumlah interval, interval pertama & terakhir, total durasi.
5. **Ringkasan & cek** — ringkasan semua isian + checklist sebelum mulai: jam HP otomatis (supaya selaras dengan HP lain), baterai cukup, volume/getar aktif, app sudah di-install. Tombol **Mulai**.

### 7.3 Layar hitung — lihat §9.
### 7.4 Rekap — lihat §10.
### 7.5 Klasifikasi — daftar template (bawaan + kustom), duplikat, edit, hapus (kustom yang tidak dipakai sesi aktif).
### 7.6 Pengaturan
Ukuran tombol (normal/besar/sangat besar), getar on/off, suara on/off, tema (terang kontras tinggi/gelap), batas periode jam puncak (default Pagi 05.00–10.00, Siang 10.00–15.00, Sore 15.00–19.00, Malam 19.00–05.00), default interval & klasifikasi, status penyimpanan persisten, versi app, **Lanjutan → Mode uji** (§8.6).
### 7.7 Panduan install — langkah "Tambahkan ke Layar Utama" untuk Chrome Android dan Safari iOS, plus peringatan bahwa menghapus data browser menghapus survei.

---

## 8. Timer, penyimpanan, dan pemulihan (INTI)

### 8.1 Mode timer (dipilih per sesi)

**MENERUS** — interval berikutnya langsung berjalan tanpa jeda.
- *Mulai sekarang*: selama N interval **atau** sampai jam HH:mm. Opsi **"Mulai tepat di jam kelipatan interval"** (misal interval 15 → tunggu sampai 07.15.00 dengan hitung mundur; ada tombol "Mulai sekarang saja").
- *Blok waktu*: satu atau lebih blok, misal Pagi 06.00–09.00, Siang 11.00–13.00, Sore 15.00–18.00. Di dalam blok menerus; di antara blok status **MENUNGGU** dengan hitung mundur ke blok berikutnya, lalu **mulai otomatis** tepat waktu (getar + bunyi). Validasi: blok tidak tumpang tindih, durasi blok kelipatan interval, boleh melewati tengah malam.

**MANUAL (per interval)** — tiap interval dimulai dengan tombol **Mulai interval berikutnya**; setelah habis, simpan lalu berhenti. Opsi: jumlah interval maksimum; **"Tunggu jam kelipatan interval"** (tekan 07.13 → mulai 07.15.00). Celah antar-interval tercatat (terlihat dari jam mulai/selesai di Excel).

### 8.2 Aturan waktu
1. Satu-satunya sumber waktu: `clock.now()` (`src/lib/clock.ts`), yang normalnya = `Date.now()`.
2. Sisa waktu = `interval.end − clock.now()`, dihitung ulang tiap 250 ms. **Jangan pernah** menghitung mundur dengan mengurangi counter di `setInterval` (browser memperlambat timer saat tab di background).
3. Jadwal MENERUS dihitung oleh fungsi murni `buildSchedule(session, startMs)` → `{ index, start, end, blockLabel }[]`.
4. Semua timestamp absolut (epoch ms) → aman melewati tengah malam; label interval menampilkan tanggal bila berbeda hari.

### 8.3 Aturan penyimpanan
1. **Setiap ketukan langsung ditulis** ke IndexedDB sebagai `CountEvent` (append-only), UI diperbarui optimistis. Data tidak menunggu akhir interval.
2. Ketukan dengan `t` di `[start, end)` masuk interval itu; `t ≥ end` masuk interval berikutnya.
3. **Simpan otomatis saat timer habis** = *tutup interval*: agregasi event interval itu → tulis `IntervalRecord` (counts, status, `savedAt`) → interval **terkunci**.
4. Undo dan koreksi = event baru `delta −1` (kind UNDO/KOREKSI), bukan menghapus event. Hitungan per tombol tidak boleh negatif; undo tidak bisa menembus interval yang sudah terkunci.
5. Interval yang sudah ditutup memakai snapshot `IntervalRecord`; interval berjalan dihitung dari event dengan `t ≥ start`.

### 8.4 Pemulihan (app tertutup / HP mati / tab di-kill)
1. Selama BERJALAN atau MENUNGGU, perbarui `session.lastAliveAt` tiap 5 detik.
2. Saat app dibuka atau kembali terlihat (`visibilitychange`): bila `now − lastAliveAt > 15 s`, catat `gap { from: lastAliveAt, to: now }`.
3. **Catch-up:** tutup semua interval yang `end ≤ now` dengan status sesuai tabel di bawah; lanjutkan interval yang sedang berjalan; bila jadwal sudah lewat, selesaikan sesi.
4. Tampilkan pemberitahuan: "App sempat tidak aktif 07.42–07.51. Interval 07.30–07.45 ditandai TERPUTUS."

### 8.5 Status interval

| Status | Arti | Di rekap & Excel |
|---|---|---|
| TERBUKA | sedang berjalan | — |
| LENGKAP | app aktif penuh sepanjang interval | normal |
| PARSIAL | sesi dimulai setelah jadwal interval itu mulai (misal tombol Mulai ditekan 06.07 untuk blok 06.00) / dihentikan lebih awal oleh surveyor | kuning, dihitung tapi ditandai |
| TERPUTUS | ada celah app tidak aktif setelah sesi dimulai, di tengah interval (`gapMs`) | oranye, dihitung tapi ditandai |
| TERLEWAT | seluruh interval lewat saat app tidak aktif | abu-abu, **angka dikosongkan (bukan 0)** |

Bila interval punya catatan kejadian → tanda tambahan "ada catatan".

### 8.6 Mode uji
Toggle di Pengaturan → Lanjutan. Sesi baru dalam mode uji memakai `clock` yang dipercepat (pilihan ×10 / ×60), banner merah "MODE UJI" di semua layar, dan Excel diberi cap "DATA UJI". Tujuannya supaya alur 15 menit/12 jam bisa dicoba di HP dalam hitungan menit.

### 8.7 Akhir interval & akhir sesi
- Akhir interval: getar `[200,100,200]`, bunyi pendek 2× (Web Audio, di-unlock saat tombol Mulai ditekan), toast 3 detik "Interval 07.15–07.30 tersimpan · 482 kend".
- **Selesaikan sesi** lebih awal: tombol di menu, konfirmasi **tahan 2 detik**; interval berjalan ditutup sebagai PARSIAL (`actualEnd = now`).
- Interval terakhir selesai → status SELESAI → layar ringkasan dengan tombol **Rekap** dan **Export Excel**.

---

## 9. Layar hitung (UX detail)

**Tata letak (portrait):**

```
┌──────────────────────────────────────┐
│ Jl. Kaliurang · 2 arah     07.23.41 ⋮│  ← jam HP (untuk sinkron antar-HP)
│ Interval 5/48 · 07.15–07.30          │
│            ⏱ 06:19   ▓▓▓▓▓▓░░░       │
│ Interval ini: 186 kend               │
├──────────────────┬───────────────────┤
│   Arah A         │   Arah B          │
│ [ SM        112 ]│ [ SM          98 ]│
│ [ MP         48 ]│ [ MP          51 ]│
│ [ KS          9 ]│ [ KS           7 ]│
│ ...              │ ...               │
├──────────────────┴───────────────────┤
│  [↶ Undo]   [± Koreksi]   [+ Catatan]│
└──────────────────────────────────────┘
```

- **RUAS 1 arah:** satu kolom tombol besar. **RUAS 2 arah:** dua kolom berdampingan; bila jenis > 7 dan portrait, tampilkan saran putar ke landscape.
- **SIMPANG:** grid baris = jenis kendaraan, kolom = gerakan aktif (LT | ST | RT [| UT]). Header kolom tebal. Bila tidak muat, hanya area tombol yang bisa di-scroll; header timer tetap.
- **Tombol:** seluruh area bisa diketuk; tinggi min. 56 px (sesuai pengaturan ukuran); warna dari klasifikasi; angka besar = hitungan interval ini; angka kecil = total sesi.
- **+1 terjadi di `pointerdown`** (bukan `click`) supaya cepat; mendukung multi-sentuh (dua tombol diketuk bersamaan).
- **Undo:** membatalkan ketukan terakhir (berulang, hanya di interval berjalan); toast "Dibatalkan: MP Arah A".
- **Mode koreksi:** toggle; saat aktif tombol bergaris merah dan setiap ketukan = −1; mati otomatis setelah 5 detik tanpa ketukan.
- **Catatan:** bottom sheet dengan chip cepat: Hujan ringan, Hujan deras, Kecelakaan, Macet total, APILL mati, Diatur petugas, Kegiatan/acara, Lainnya (teks). Satu ketukan menyimpan dengan timestamp; timer tidak terganggu.
- **Ergonomi:** getar singkat tiap ketukan (bila didukung; iOS Safari tidak mendukung `vibrate` → fallback klik suara pendek, bisa dimatikan); Wake Lock (minta ulang saat kembali terlihat; bila tidak didukung, tampilkan saran mematikan kunci layar otomatis); `touch-action: manipulation`, tanpa seleksi teks, tanpa menu konteks, `overscroll-behavior: none` (cegah pull-to-refresh); peringatan `beforeunload` saat sesi aktif; tema kontras tinggi default.
- **Status MENUNGGU** (antar-blok / mode manual): tombol hitung nonaktif (abu-abu), tampil hitung mundur atau tombol besar **Mulai interval berikutnya**.

---

## 10. Rekap di app

Tab: **Per interval** | **Per jam** | **Grafik** | **Catatan**. Toggle satuan **kend / skr** (skr hanya bila ekr aliran yang dihitung lengkap; bila belum, banner + editor ekr inline). Tombol **Export Excel** selalu terlihat.

**Rumus** (semua di `src/lib/aggregate.ts`, fungsi murni + unit test):

- n = 60 / intervalMin (jumlah interval per jam).
- skr interval = Σ (jumlah_j × ekr_j) untuk jenis dengan inSkr = ya.
- **Jam bulat:** jumlah interval yang jatuh di jam 06.00–07.00, 07.00–08.00, dst.
- **Jam bergerak:** untuk tiap interval k, V = Σ V_i (i = k … k+n−1). Hanya bila n > 1.
- **Jam puncak:** jam bergerak dengan volume terbesar, per periode (Pagi/Siang/Sore/Malam dari Pengaturan) dan keseluruhan; ditentukan dari Total semua aliran di HP ini (volume tiap aliran ditampilkan pada rentang yang sama); bisa berdasar kend atau skr. Seri: ambil yang paling awal. Bila interval = 60 menit, pakai jam bulat.
- **PHF** = V_jam puncak / (n × V_interval tertinggi dalam jam itu). Hanya bila n > 1; label "PHF (basis X menit)". Standar umumnya basis 15 menit.
- **Komposisi** jenis_j = jumlah_j / Σ jumlah × 100% (per aliran dan total).
- **Rasio belok** (SIMPANG, pada jam puncak, basis skr): pLT = q_LT / q_total, pRT = q_RT / q_total.

**Validitas:** jam bulat/bergerak dianggap **valid** hanya bila seluruh n interval berstatus LENGKAP dan berurutan tanpa celah waktu. Jam puncak dipilih dari jam valid; bila tidak ada, pakai semua dan beri tanda "* mengandung interval tidak lengkap". Interval TERLEWAT tidak dihitung sebagai nol.

**Grafik (in-app):** garis volume per interval per aliran + total; toggle per jenis kendaraan; penanda interval yang punya catatan.

---

## 11. Spesifikasi Excel (`.xlsx`)

### 11.1 Umum
- Dibuat dengan ExcelJS di browser (lazy-load). `workbook.calcProperties.fullCalcOnLoad = true`.
- **Rumus live** untuk total, skr, rekap jam, PHF, komposisi. Setiap sel rumus juga diberi nilai `result` hasil hitungan JS (supaya angka tampil di viewer yang tidak menghitung ulang).
- **Kompatibilitas:** hanya fungsi yang ada di Excel 2016, WPS Office, dan Google Sheets (SUM, SUMPRODUCT, IF, AND, OR, COUNT, COUNTBLANK, MAX, INDEX, MATCH, ROUND). **Jangan** pakai MAXIFS, FILTER, LET, XLOOKUP, atau dynamic array.
- Pemilihan baris jam puncak ditentukan app saat export (statis); nilai volume/PHF/komposisi di baris itu adalah rumus live.
- **Waktu** ditulis sebagai **serial number waktu lokal** (helper `toExcelSerial(ms)` di `lib/time.ts`: `(ms − tzOffsetMs) / 86 400 000 + 25 569`, dengan `tzOffsetMs = new Date(ms).getTimezoneOffset() × 60 000` — bernilai negatif untuk WIB, jadi hasilnya maju 7 jam ke waktu lokal) dengan `numFmt` `hh:mm` / `dd/mm/yyyy` / `dd/mm/yyyy hh:mm:ss`. **Jangan** menulis objek `Date` (ExcelJS menganggapnya UTC → jam bergeser 7 jam).
- Nama file: `TC_{lokasi}_{posisi}_{YYYYMMDD}_{surveyor}.xlsx` (disanitasi: huruf, angka, `_`, `-`).
- Pengiriman: bila `navigator.canShare({ files })` → **Bagikan** (WhatsApp/Drive); selalu ada juga **Unduh**. Setelah berhasil, isi `session.exportedAt`.
- Freeze pane di header, lebar kolom rapi, setup cetak landscape A4.
- Struktur sheet dan urutan kolom **identik** antar-HP untuk klasifikasi yang sama (memudahkan penggabungan manual).

### 11.2 Daftar sheet (urutan tetap)

**1. `Info_Survei`**
- Tabel kunci–nilai: proyek, lokasi, tipe survei, posisi yang dihitung (+ semua posisi di lokasi), tanggal, hari, surveyor, tipe jalan, cuaca, catatan, panjang interval, mode timer, jadwal/blok, jam mulai–selesai aktual, klasifikasi, versi app, waktu export, cap "DATA UJI" bila mode uji.
- Tabel **Catatan kejadian**: Waktu | Interval ke- | Kategori | Keterangan.
- Tabel **Periode tidak aktif**: Dari | Sampai | Durasi (menit).
- Legenda warna status interval.
- Petunjuk singkat cara menggabung data antar-HP (lihat `Data_Gabung`).

**2. `Klasifikasi`**
Kolom: Kode | Nama | Keterangan | ekr | Masuk skr (Ya/Tidak) | Padanan PKJI. Sel ekr adalah sumber bagi semua rumus skr → **mengubah ekr di sini memperbarui seluruh skr.** ekr kosong dibiarkan kosong.

**3. `Data_Interval`** (format lebar)
- Baris 1–2: judul + lokasi/tanggal/surveyor.
- Baris header: No | Aliran | Tanggal | Mulai | Selesai | *[satu kolom per kode kendaraan]* | Total kend | Total skr | Status | Catatan.
- Baris **ekr** tepat di bawah header (abu-abu miring): tiap kolom jenis = `=IF(Klasifikasi!E{r}="Ya",IF(Klasifikasi!D{r}="","",Klasifikasi!D{r}),0)`.
- Data disusun **per blok aliran**: RUAS → blok Arah A, blok Arah B, lalu blok **Total 2 arah** (rumus penjumlahan baris yang bersesuaian) bila 2 arah dihitung. SIMPANG → blok per gerakan (LT, ST, RT[, UT]) lalu blok **Total lengan**.
- Total kend = `=IF(COUNT(<kolom jenis baris ini>)=0,"",SUM(<kolom jenis baris ini>))`.
- Total skr = `=IF(OR(COUNT(<kolom jenis baris ini>)=0,COUNTBLANK(<baris ekr>)>0),"",SUMPRODUCT(<baris ekr>,<kolom jenis baris ini>))`.
- Sel jenis di blok Total = `=IF(COUNT(<sel yang dijumlah>)=0,"",SUM(<sel yang dijumlah>))`. Blok Total hanya dibuat bila aliran > 1.
- Interval TERLEWAT: sel jenis kosong → penjaga `COUNT(...)=0` di atas membuat total ikut kosong (bukan 0). Warna baris sesuai status (§8.5).

**4. `Rekap_Jam`**
- **A. Volume per jam bulat:** Jam | per aliran (kend, skr) | Total (kend, skr) | Valid (Ya/Tidak). Rumus SUM merujuk sel total di `Data_Interval`.
- **B. Jam bergerak** (bila n > 1): Rentang (mis. 07.15–08.15) | per aliran & total (kend, skr) | V_max interval | Valid.
- **C. Jam puncak** per periode + keseluruhan (ditentukan dari Total; bila hanya 1 aliran, dari aliran itu): Rentang | Volume kend | Volume skr | V_max interval | **PHF** (`=V_jam/(n*V_max)`) | Komposisi % per jenis. Baris dipilih app; volume & PHF berupa rumus yang merujuk baris B; komposisi = SUM kolom jenis pada rentang baris jam puncak di blok Total `Data_Interval` ÷ volume kend.
- **D. Komposisi kendaraan** seluruh survei per aliran dan total (%).
- **E. (SIMPANG saja) Rasio belok** pada jam puncak: pLT, pRT (basis skr).

**5. `Grafik`**
Gambar PNG (Chart.js di elemen `<canvas>` tersembunyi di luar layar, 1600×800, latar putih, `animation: false`, diambil dengan `toDataURL`): (1) fluktuasi volume per interval per aliran + total; (2) volume per jam bulat (batang). Keterangan di bawah: "Grafik berupa gambar; data sumber di sheet Rekap_Jam."

**6. `Data_Gabung`** (format panjang — **untuk digabung manual antar-HP**)
- Kolom tetap, **tidak bergantung klasifikasi**: Proyek | Lokasi | Tanggal | Surveyor | Tipe_Survei | Posisi | Gerakan | Blok | Interval_Ke | Mulai | Selesai | Durasi_Menit | Kode_Jenis | Nama_Jenis | Padanan_PKJI | Jumlah | ekr | skr | Status.
- Satu baris per interval × aliran × jenis. Urut: Mulai, Posisi, Gerakan, urutan jenis.
- `ekr` (kolom Q) ditulis sebagai **nilai** (bukan rujukan ke sheet lain); jenis dengan inSkr = Tidak ditulis 0; ekr yang belum diisi dibiarkan kosong.
- `skr` (kolom R) = `=IF(OR(P{n}="",Q{n}=""),"",P{n}*Q{n})` (P = Jumlah), rujukan **relatif di baris yang sama** → tetap benar setelah di-copy-paste ke workbook lain.
- Jumlah dikosongkan untuk TERLEWAT.
- Cara gabung (ditulis juga di `Info_Survei` dan README): salin semua baris `Data_Gabung` dari tiap file ke satu sheet → Insert → PivotTable.

**7. `Log_Ketukan`** (opsional; kotak centang saat export, default aktif)
Waktu (`dd/mm/yyyy hh:mm:ss`) | Interval_Ke | Posisi | Gerakan | Kode_Jenis | Delta (+1/−1) | Jenis_Event (TAP/UNDO/KOREKSI).

---

## 12. PWA, offline, dan deploy

- `vite-plugin-pwa`: `registerType: 'prompt'`, precache semua aset, manifest (nama, short_name, ikon 192/512 + maskable, `display: standalone`, warna tema). Ikon sederhana boleh dibuat sekali dengan script, tanpa menambah dependency permanen.
- **Jangan menerapkan update/reload saat ada sesi BERJALAN atau MENUNGGU.**
- Minta `navigator.storage.persist()` saat sesi pertama dibuat; tampilkan statusnya di Pengaturan.
- Base path: `vite.config.ts` membaca `process.env.BASE_PATH ?? '/'`; manifest `start_url`/`scope` relatif terhadap base.
- Workflow `.github/workflows/deploy.yml` (pakai versi major terbaru tiap action):

```yaml
name: Deploy ke GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## 13. Milestone

Kerjakan satu per satu. Setelah tiap milestone: tes hijau, update `PROGRESS.md`, laporkan cara mencobanya.

| # | Isi | Selesai bila |
|---|---|---|
| **M0 — Fondasi & deploy** | Scaffold Vite+React+TS, Tailwind, ESLint/Prettier, Vitest, hash router, Dexie, PWA, `clock.ts`, `i18n/id.ts`, halaman kosong (Beranda, Klasifikasi, Pengaturan, Panduan install), workflow deploy. | `npm run build` & `npm test` hijau; situs live di GitHub Pages; bisa di-install di HP; terbuka offline setelah kunjungan pertama. |
| **M1 — Klasifikasi** | Seed 4 preset (§6 A–D), daftar template, duplikat, editor kustom (§6 E), validasi. | Preset read-only; kustom bisa CRUD; unit test validasi & seed. |
| **M2 — Wizard sesi & jadwal** | Wizard 5 langkah (§7.2), `buildSchedule()` + validasi (pembagi 60, blok tidak tumpang tindih, lewat tengah malam), pratinjau jadwal. | Sesi tersimpan DRAFT; pratinjau jadwal benar; unit test jadwal hijau. |
| **M3 — Layar hitung & mesin timer** | §8 dan §9 lengkap: event per ketukan, tutup interval otomatis, mode Menerus/Blok/Manual, pemulihan & status, undo, mode koreksi, catatan, Wake Lock, getar, bunyi, `beforeunload`, Mode uji. | Refresh di tengah interval → hitungan utuh; tab ditutup 2 menit lalu dibuka → interval TERPUTUS/TERLEWAT benar; sesi 12 jam lancar di Mode uji ×60; unit test engine (fake timers) hijau. |
| **M4 — Rekap di app** | `aggregate.ts` (§10) + UI tab rekap, grafik, editor ekr. | Angka rekap cocok dengan hitungan manual pada data uji; unit test agregasi hijau. |
| **M5 — Export Excel** | §11 lengkap, gambar grafik, Bagikan/Unduh, `exportedAt`. | Tes membaca ulang file hasil export (ExcelJS di Node): nama & urutan sheet, header, rumus, `result`, serial waktu; file terbuka benar di Excel, WPS, dan Google Sheets (cek manual). |
| **M6 — Pengerasan lapangan** | Uji di Android Chrome & iOS Safari, latensi ketukan, kontras, badge "Belum di-export", duplikat sesi, peringatan penyimpanan, README panduan pengguna (bahasa Indonesia). | Checklist uji lapangan di `PROGRESS.md` terisi. |

---

## 14. Daftar tes wajib (unit test)

**Jadwal (`schedule.ts`)**
- Interval 15 menit, mulai 06.00 selama 12 jam → 48 interval, batas tepat.
- `alignToClock`: mulai 07.13.20 → interval pertama 07.15.00.
- Blok Pagi/Siang/Sore → jumlah interval benar, tidak ada interval di antara blok.
- Blok 22.00–02.00 (lewat tengah malam) → tanggal interval benar.
- Tolak: interval bukan pembagi 60, blok tumpang tindih, durasi blok bukan kelipatan interval.

**Engine (`engine.ts`)**
- Ketukan tepat di `t = end` masuk interval berikutnya.
- Undo tidak membuat hitungan negatif dan tidak menembus interval terkunci.
- Gap di tengah interval → TERPUTUS dengan `gapMs` benar; gap menutupi seluruh interval → TERLEWAT.
- Mulai terlambat dalam blok / selesai lebih awal → PARSIAL.
- Catch-up setelah app tertutup melewati akhir jadwal → sesi SELESAI, semua interval tertutup.

**Agregasi (`aggregate.ts`)**
- skr dengan ekr lengkap; skr kosong bila ada ekr kosong; KTB tidak masuk skr.
- Jam bergerak n = 4 (15 menit) dan n = 12 (5 menit); tidak dibuat untuk interval 60.
- Jam puncak per periode, seri → paling awal; jam tidak valid dikecualikan.
- PHF contoh: V_jam = 1 200, V_max = 360, n = 4 → 0,833.
- Rasio belok simpang.

**Excel (`excel/`)**
- Urutan & nama sheet sesuai §11.2.
- Sel total berisi rumus SUM/SUMPRODUCT **dan** `result` yang benar; baris TERLEWAT → Total kend & Total skr kosong (bukan 0).
- `toExcelSerial` untuk 07.15 waktu lokal → pecahan hari 0,302083 (tanpa geser zona).
- `Data_Gabung`: kolom tetap; rumus skr relatif baris; TERLEWAT kosong.
- Sanitasi nama file.

---

## 15. Yang perlu diverifikasi pemilik proyek (bukan tugas Claude Code)

- Daftar golongan Bina Marga 1–8 (§6 C) terhadap pedoman survei pencacahan lalu lintas cara manual Bina Marga.
- Padanan golongan Bina Marga → kelas PKJI (§6 C) terhadap tabel padanan klasifikasi di PKJI 2023.
- Nilai ekr per tipe jalan/simpang dari PKJI 2023 (diisi per sesi; app sengaja tidak menyimpan nilai baku selain MP = 1,00).
- Batas default periode jam puncak (§7.6).
- Nama aplikasi.
