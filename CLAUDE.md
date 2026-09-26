# CLAUDE.md — aturan kerja proyek TC Counter

Spesifikasi lengkap ada di **BRIEF.md**. Baca seluruhnya sebelum mengerjakan apa pun.

## Cara kerja
- Kerjakan **satu milestone per perintah** (BRIEF §13). Setelah selesai, berhenti dan laporkan: apa yang dibuat, hasil tes, cara mencobanya di HP, dan bagian yang menyimpang dari brief (beserta alasannya).
- Catat progres di `PROGRESS.md` (milestone, tanggal, status, catatan, checklist uji).
- Bila brief ambigu atau bertentangan, **tanya dulu** — terutama untuk hal yang memengaruhi data, perhitungan, atau format Excel.
- Jangan menambah dependency di luar BRIEF §3 tanpa bertanya.

## Perintah
```
npm install
npm run dev        # server lokal
npm run build      # build produksi (BASE_PATH opsional)
npm test           # vitest run
npm run lint
```

## Aturan inti (jangan dilanggar)
1. Waktu hanya dari `clock.now()` (`src/lib/clock.ts`). Sisa waktu dihitung dari timestamp; **jangan** mengurangi counter di `setInterval`.
2. Setiap ketukan **langsung** ditulis ke IndexedDB sebagai `CountEvent` (append-only). Undo/koreksi = event baru `delta −1`, bukan menghapus event.
3. Klasifikasi di-snapshot ke sesi saat sesi dibuat. Mengedit template tidak boleh mengubah sesi lama.
4. **ekr tidak di-hardcode** di logika mana pun; selalu dibaca dari data sesi. Preset hanya mengisi MP = 1,00.
5. Interval TERLEWAT ditulis **kosong (bukan 0)** di rekap dan Excel — termasuk sel total dan skr-nya.
6. Logika jadwal, engine, agregasi, dan builder Excel = **fungsi murni** di `src/lib`, masing-masing dengan unit test.
7. Jangan memicu update PWA atau reload saat ada sesi BERJALAN/MENUNGGU.
8. Excel: tanpa fungsi khusus Excel 365 (MAXIFS, FILTER, LET, XLOOKUP, dynamic array). Setiap sel rumus juga diberi `result`.
9. Waktu di Excel ditulis sebagai **serial waktu lokal** lewat `toExcelSerial()`; jangan menulis objek `Date` (ExcelJS menggeser zona waktu).
10. v1 offline-only: tanpa backend, login, analytics, atau request jaringan saat runtime.

## Konvensi
- TypeScript `strict`. Nama variabel/fungsi bahasa Inggris; komentar boleh bahasa Indonesia.
- **Semua teks UI bahasa Indonesia**, dikumpulkan di `src/i18n/id.ts` (jangan string lepas di komponen).
- Format tampilan: angka desimal pakai koma (1,25), tanggal `dd/mm/yyyy`, jam `HH.mm` (UI) / `hh:mm` (Excel).
- Komponen fungsi + hooks; state UI di Zustand; data persisten lewat Dexie (`useLiveQuery`).
- Tombol hitung merespons di `pointerdown`, mendukung multi-sentuh, min. tinggi 56 px.
- ExcelJS dan Chart.js untuk export di-load dengan `import()` dinamis.
- Commit kecil per fitur, pesan commit bahasa Inggris singkat.
