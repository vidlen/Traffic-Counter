# PROGRESS — TC Counter

| Milestone                       | Tanggal    | Status  |
| ------------------------------- | ---------- | ------- |
| M0 — Fondasi & deploy           | 26/09/2026 | Selesai |
| M1 — Klasifikasi                |            | Belum   |
| M2 — Wizard sesi & jadwal       |            | Belum   |
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
