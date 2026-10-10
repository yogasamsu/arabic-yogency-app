# Format sumber unit orisinal

Satu berkas per unit: `content-src/orisinal/unit-NN.json` (NN = 00–16). Berkas ini **sumber kebenaran**.
Builder `content-src/build_orisinal.py` memvalidasi, membuat audio (Azure TTS, `content-src/voices.json`),
lalu menulis:

- `web/src/content/j1u{N}.json`: format aplikasi (`web/src/lib/content.ts`);
- `web/public/audio/o/*.mp3`: audio, nama berkas = hash suara+teks (dipakai ulang bila sama);
- `docs/kurikulum/jilid-1/unit-NN.md`: dokumen review untuk Yoga (dibuat otomatis, jangan disunting).

```bash
python3 content-src/build_orisinal.py 1          # validasi + build unit 1 (tanpa audio)
python3 content-src/build_orisinal.py 1 --audio  # sekaligus buat audio yang belum ada
python3 content-src/build_orisinal.py all --audio
```

## Bentuk berkas

```json
{
  "unit": 1,
  "book": "1a",
  "title_ar": "التَّحِيَّةُ وَالتَّعارُفُ",
  "title_id": "Salam dan perkenalan",
  "lessons": [
    { "dars": 1, "skill": "Hiwar", "title_id": "Kenalan di asrama", "steps": [ ... ], "practice": [ ... ] }
  ]
}
```

- `skill`: `Huruf` (Unit 0), `Hiwar`, `Mufradat`, `Tarakib`, `Ashwat`, `Kalam`, `Qira'ah`, `Kitabah`.
- `steps`: urutan layar pelajaran. **8–15 langkah, minimal 60% soal.**
- `practice`: 4–9 soal tambahan untuk "Latihan ulang" (boleh variasi dari soal di `steps`).

## Kartu (materi)

Semua kartu boleh punya `section` (label kecil di atas, Indonesia), `title_ar`, `instruction_id`, `note_id`.

| `card` | Isi | Contoh |
| --- | --- | --- |
| `dialogue` | `rows: [{who, ar, id}]` | `{"who": "rizki", "ar": "...", "id": "..."}` |
| `vocab` | `rows: [{ar, id, emoji?, serapan?}]` | `serapan`: kata Indonesia serapan → tampil "★ kitab" |
| `grammar` | `groups: [{title_ar?, note_id?, rows: [{ar, id}]}]` | tabel pola |
| `sounds` | `pairs: [["عَلِمَ", "أَلِمَ"], ...]` | pasangan minimal |
| `reading` | `rows: [{ar, id, emoji?}]` | teks baca per kalimat |
| `writing` | `rows: [{ar, id}]` | huruf/kata untuk ditelusuri jari |

`who` (penutur): `rizki`, `budi`, `ustaz_mahmud`, `pak_ahmad`, `siti`, `aisyah`, `bu_fatimah`, `ayu`, `nur`,
`ustazah_zainab`, `kakek_umar`, `nenek_aminah`, `yusuf`, `pak_wayan`, `narator`. Suaranya diatur di `content-src/voices.json`.

Tokoh tanpa nama (penjual, petugas, perawat): `figuran_lk` atau `figuran_pr`, dan barisnya **wajib** punya
`label_ar` berharakat, misalnya `{"who": "figuran_lk", "label_ar": "البائِعُ", "ar": "...", "id": "..."}`.

## Soal

Setiap soal wajib punya `k`: kunci pendek, unik dalam unit, huruf kecil/angka/strip (mis. `salam-arti`).
Kunci akhir = `j1u{N}-d{dars}-{k}`. **Jangan ganti `k` setelah terbit** (dipakai antrean ulasan).

| `q` | Field | Catatan |
| --- | --- | --- |
| `choice` | `instruction`, `prompt`, `answer`, `options` (3–4, termasuk jawaban), `lang` (`id`/`ar`) | `prompt` boleh `{ar, id, emoji}` atau `{listen: "<teks Arab>"}` (soal dengar, teks disembunyikan) |
| `arrange` | `instruction?`, `prompt: {id}`, `answer` (kalimat Arab), `extra?` (kata pengecoh) | Token = kata-kata `answer` (dipisah spasi) + `extra`. 2–7 token |
| `repeat` | `ar`, `id`, `who?` | Latihan ucapan dinilai. **Minimal 2 per unit**, kalimat pendek (1–5 kata) |
| `speak` | `instruction`, `prompt: {ar?, id}`, `model: [{who, ar, id}]` | Bicara bebas (tidak dinilai) |

## Aturan isi (wajib)

1. **Orisinal.** Tulis dari tujuan komunikatif di `docs/kurikulum/SKELETON.md`. Jangan membuka atau meniru dialog,
   bacaan, atau soal ABY. Situasi dan tokoh dari bible (SKELETON bagian A).
2. **Harakat penuh** pada semua teks Arab (termasuk akhir kata/i'rab, tanwin, syaddah). Kalimat 2–7 kata.
   Gunakan `لِلّٰهِ`/`هٰذا`/`هٰذِهِ`/`ذٰلِكَ` dengan alif khanjariyah.
3. **Hanya kosakata dan pola yang sudah diajarkan** di unit ini atau sebelumnya, kecuali kata baru yang langsung
   diberi arti.
4. Terjemahan Indonesia natural dan singkat; tandai (lk)/(pr) bila bentuk Arabnya membedakan.
5. Pilihan jawaban pengecoh harus masuk akal tetapi jelas salah; tidak ada dua jawaban benar.
6. Ilustrasi: kartu, baris, atau prompt boleh punya `img` (nama berkas, mis. `u1-asrama`) + `scene` (deskripsi adegan
   dalam bahasa Inggris, sebut tokoh dengan namanya). Gambar dibuat oleh `content-src/gen_ilustrasi.py` (Codex) mengikuti
   `content-src/ilustrasi/STYLE.md`. Sampai gambarnya ada, builder memberi peringatan dan memakai `emoji` bila ada.
7. `emoji` dipakai sebagai ilustrasi sederhana (bebas lisensi). Jangan pakai bendera untuk soal yang menguji
   kebangsaan bila jawaban bisa ditebak tanpa membaca.
