# arabic.yogency.work

Aplikasi belajar bahasa Arab mandiri untuk orang Indonesia. Nirlaba, gratis, tanpa iklan.
Pelajarannya pendek dan bisa dibuka di HP: dialog bersuara, kosakata bergambar, latihan interaktif,
latihan ucapan, dan ulasan berkala (spaced repetition).

Coba langsung: https://arabic.yogency.work

Semua materi di repo ini **ditulis sendiri** dengan tokoh dan latar Indonesia (ma'had di Yogyakarta,
keluarga di Bandung, dan seterusnya). Urutan topik dan kaidahnya merujuk pada silabus
*Al-Arabiyah Baina Yadaik*, tetapi tidak ada teks, gambar, atau audio buku itu di sini.
Lihat [CONTRIBUTING.md](CONTRIBUTING.md#hak-cipta-wajib-dibaca).

## Teknologi

| Bagian | Pilihan |
| --- | --- |
| Aplikasi | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Login | Better Auth (email + password, opsional Google) |
| Database | PostgreSQL + Drizzle ORM |
| Konten | JSON per unit, dibangun dengan Python (`content-src/build_orisinal.py`) |
| Audio | Azure TTS (sudah dibuat, ada di `web/public/audio/o/`) |
| Penilaian ucapan | Server Whisper terpisah (opsional) |

## Struktur

| Path | Isi |
| --- | --- |
| `web/` | Aplikasi Next.js |
| `web/src/content/` | Konten siap pakai (dibuat otomatis oleh builder, jangan disunting langsung) |
| `web/public/audio/o/`, `web/public/img/o/` | Audio dan ilustrasi orisinal |
| `content-src/orisinal/` | **Sumber konten**: satu JSON per unit. Formatnya di [`FORMAT.md`](content-src/orisinal/FORMAT.md) |
| `content-src/voices.json` | Suara TTS tiap tokoh |
| `content-src/ilustrasi/` | Panduan gaya ilustrasi dan lembar tokoh |
| `docs/kurikulum/SKELETON.md` | Kerangka kurikulum: tokoh, latar, templat pelajaran, rencana jilid 1–4 |
| `docs/kurikulum/jilid-1/` | Ringkasan tiap unit untuk direview (dibuat otomatis) |

## Menjalankan di komputer sendiri

Butuh Node.js 22, npm, dan PostgreSQL. Cara termudah untuk Postgres adalah Docker.

```bash
docker compose up -d                 # Postgres lokal di port 55432
cd web
cp .env.example .env.local           # lalu isi BETTER_AUTH_SECRET
npm ci
npx drizzle-kit migrate              # buat tabel
npm run dev                          # http://localhost:3000
```

Buat `BETTER_AUTH_SECRET` dengan `openssl rand -base64 32`. Kalau tidak memakai Docker, arahkan
`DATABASE_URL` ke Postgres mana saja (tambahkan `?sslmode=disable` untuk server lokal tanpa SSL).
`npx drizzle-kit migrate` membaca `DATABASE_URL` dari environment, jadi jalankan dengan
`export $(grep -v '^#' .env.local | xargs)` lebih dulu, atau tulis `DATABASE_URL=... npx drizzle-kit migrate`.

Yang tidak perlu disiapkan untuk mulai:

- **Email (SMTP):** tanpa SMTP, aplikasi tetap jalan; email saja yang tidak terkirim.
- **Login Google:** tanpa `GOOGLE_CLIENT_ID`, tombol Google tidak muncul. Halaman admin butuh Google.
- **Penilaian ucapan:** tanpa `STT_URL`, latihan ucapan menampilkan pesan galat. Soal lain tetap jalan.
- **Azure TTS:** audio yang ada sudah di-commit. Kunci Azure hanya perlu untuk membuat audio baru.

Sebelum mengirim PR kode:

```bash
cd web && npm run typecheck && npm run lint && npm run build
```

## Menulis atau memperbaiki konten

1. Sunting `content-src/orisinal/unit-NN.json` (format: [`FORMAT.md`](content-src/orisinal/FORMAT.md),
   tokoh dan latar: [`SKELETON.md`](docs/kurikulum/SKELETON.md)).
2. Jalankan `python3 content-src/build_orisinal.py NN` untuk validasi dan membangun ulang
   `web/src/content/` serta `docs/kurikulum/jilid-1/unit-NN.md`.
3. Kalimat baru tanpa audio otomatis dibacakan TTS bawaan perangkat. Audio Azure dibuat pemelihara saat merge.

Aturan lengkapnya ada di [CONTRIBUTING.md](CONTRIBUTING.md).

## Lisensi

- Kode: [MIT](LICENSE).
- Konten pelajaran, ilustrasi, dan audio: [CC BY-SA 4.0](LICENSE-CONTENT.md).
