# TC Counter

Web app (PWA) untuk traffic counting manual: surveyor mengetuk tombol jenis kendaraan di HP, app mengatur interval waktu, menyimpan hasil tiap interval otomatis, dan menghasilkan Excel siap olah. Offline, bisa di-install ke layar utama.

Spesifikasi lengkap: [BRIEF.md](BRIEF.md) · aturan kerja: [CLAUDE.md](CLAUDE.md) · progres: [PROGRESS.md](PROGRESS.md).

## Pengembangan

Butuh Node 22 LTS.

```
npm install
npm run dev        # server lokal
npm run build      # build produksi (BASE_PATH opsional, mis. /Traffic-Counter/)
npm test           # vitest run
npm run lint
npm run icons      # buat ulang ikon PWA dari logo
```

## Deploy

Push ke `main` menjalankan workflow GitHub Actions (tes → build → GitHub Pages).
Sekali saja: **Settings → Pages → Source: GitHub Actions**.
Situs: `https://vidlen.github.io/Traffic-Counter/`.
