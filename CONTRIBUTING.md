# Panduan kontribusi

Terima kasih sudah mau membantu. Kontribusi kode dan konten pelajaran sama-sama diterima:
memperbaiki bug, menambah fitur, mengoreksi harakat atau terjemahan, menulis soal, sampai menyusun unit baru.

Cara menjalankan aplikasi di komputer sendiri ada di [README.md](README.md#menjalankan-di-komputer-sendiri).

## Hak cipta (wajib dibaca)

Platform ini pernah memakai buku *Al-Arabiyah Baina Yadaik* (ABY). Penerbitnya tidak memberi izin,
jadi semua materinya kami ganti dengan tulisan sendiri. Kami berkomitmen tidak menerbitkan
materi ABY dalam bentuk apa pun, dan aturan ini berlaku untuk semua kontributor.

| Boleh | Tidak boleh |
| --- | --- |
| Mengikuti **urutan topik dan kaidah** yang lazim (salam → asal → keluarga → rumah) | Menyalin, menerjemahkan, atau menyadur dialog, bacaan, atau soal dari ABY atau buku lain yang berhak cipta, termasuk hanya mengganti nama dan tempatnya |
| Memakai **kosakata umum** bahasa Arab (كِتاب، بَيْت، مَدْرَسَة) | Memakai ilustrasi, foto, atau audio dari buku, aplikasi, atau situs lain tanpa lisensi yang jelas |
| Memakai **jenis latihan** yang umum (pilihan ganda, susun kalimat, tirukan) | Meniru soal latihan buku tertentu satu per satu |
| Menulis dialog, bacaan, dan soal **baru** dengan situasi Indonesia | Menyebut aplikasi ini sebagai "versi" buku tertentu |

Aturan praktis:

- Tulis dialog dari **tujuan komunikatif** ("menanyakan asal seseorang"), tanpa membuka buku lain di sebelahnya.
- Jika ada lebih dari 2 kalimat berurutan yang sama atau hampir sama dengan buku yang pernah Anda baca, tulis ulang.
- Ayat Al-Qur'an, hadis, dan ungkapan umum (السَّلامُ عَلَيْكُمْ) boleh dipakai.
- Gambar dan suara baru harus buatan sendiri, buatan AI yang syaratnya mengizinkan, atau berlisensi bebas. Sebutkan sumbernya di PR.

Sebelum merge, pemelihara memeriksa kemiripan konten baru dengan buku ABY memakai data yang tidak ada di repo ini.
PR yang melanggar aturan di atas akan ditolak.

## Menulis konten

- Sumber konten ada di `content-src/orisinal/unit-NN.json`. Formatnya dijelaskan di
  [`FORMAT.md`](content-src/orisinal/FORMAT.md).
- Tokoh, latar, dan templat pelajaran ada di [`SKELETON.md`](docs/kurikulum/SKELETON.md).
  Pakai tokoh yang sudah ada; usulkan tokoh baru lewat issue dulu.
- Bahasa Arab: fushah modern, berharakat penuh di jilid 1–2.
- Terjemahan Indonesia: natural dan singkat. Tandai lawan bicara laki-laki/perempuan dengan (lk)/(pr) bila perlu.
- Tokoh publik (pejabat, artis) tidak dijadikan tokoh dialog. Hindari topik politik.
- Jangan sunting `web/src/content/*.json` atau `docs/kurikulum/jilid-1/*.md` secara langsung. Keduanya
  dibuat ulang oleh `python3 content-src/build_orisinal.py NN`.
- Koreksi kecil (harakat, terjemahan, salah ketik) cukup dikirim sebagai PR biasa. Untuk unit atau jilid baru,
  buka issue dulu supaya tidak ada dua orang mengerjakan hal yang sama.

## Menulis kode

- Next.js 16 berbeda dari versi lama. Baca [`web/AGENTS.md`](web/AGENTS.md).
- Ikuti gaya kode di sekitarnya. Komentar dan teks antarmuka memakai bahasa Indonesia.
- Perubahan skema database: ubah `web/src/db/schema.ts`, lalu `npx drizzle-kit generate` dan sertakan berkas migrasinya.
- Pastikan lolos `npm run typecheck`, `npm run lint`, dan `npm run build` di folder `web/`.
- Jangan pernah meng-commit `.env.local`, kunci API, atau data pengguna.

## Alur PR

1. Fork repo, buat branch dari `main`.
2. Commit dengan sign-off: `git commit -s`. Sign-off ini adalah pernyataan
   [Developer Certificate of Origin](https://developercertificate.org/) bahwa Anda berhak mengirim
   kontribusi tersebut dan setuju kontribusi itu dilisensikan dengan MIT (kode) atau CC BY-SA 4.0 (konten).
3. Buka PR dan isi templatnya. Sertakan tangkapan layar untuk perubahan tampilan.

## Melaporkan celah keamanan

Jangan lewat issue publik. Lihat [SECURITY.md](SECURITY.md).
