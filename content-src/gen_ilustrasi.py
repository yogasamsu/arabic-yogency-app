#!/usr/bin/env python3
"""Buat ilustrasi lewat Codex CLI (image generation dari langganan ChatGPT), lalu simpan WebP.

Pakai:
  python3 content-src/gen_ilustrasi.py tokoh            # lembar tokoh (rujukan wajah), sekali saja
  python3 content-src/gen_ilustrasi.py unit 1           # semua gambar yang diminta unit-01.json dan belum ada
  python3 content-src/gen_ilustrasi.py unit all

Sumber unit meminta gambar lewat field `img` + `scene` (deskripsi adegan, Inggris) pada kartu, baris, atau prompt.
Gaya & tokoh: content-src/ilustrasi/STYLE.md.
"""
import json
import os
import re
import signal
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CODEX = os.environ.get("CODEX_BIN", "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex")
ILU = ROOT / "content-src" / "ilustrasi"
SRC_PNG = ILU / "png"  # hasil mentah (tidak di-commit)
OUT = ROOT / "web" / "public" / "img" / "o"

STYLE = (
    "Flat vector illustration for an Arabic-learning app for Indonesians. Warm palette: cream #FEF7D6, "
    "peach #F8DBB3, blush #F6CAB8, rose #F2B4B0, accent maroon #A23E43, dark brown details #3A2622. "
    "Soft rounded shapes, gentle shading, friendly faces, modest clothing. Absolutely NO text, letters, "
    "numbers, signs with writing, or logos anywhere. Simple uncluttered background."
)


def characters():
    """Tabel tokoh dari STYLE.md → {nama: deskripsi}."""
    rows = {}
    for line in (ILU / "STYLE.md").read_text().splitlines():
        m = re.match(r"\| ([A-Z][^|]+?) \(\d+\) \| (.+?) \|$", line)
        if m:
            rows[m.group(1).strip()] = m.group(2).strip()
    return rows


def generate(name, prompt, refs=(), aspect="landscape 3:2"):
    """Satu gambar via `codex exec`. Mengembalikan path PNG."""
    SRC_PNG.mkdir(parents=True, exist_ok=True)
    png = SRC_PNG / f"{name}.png"
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [CODEX, "exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", tmp]
        for r in refs:
            cmd += ["-i", str(r)]
        ref_note = (
            " The attached image(s) are the character reference sheet: keep each character's face, hair, "
            "clothing and colors exactly consistent with it." if refs else ""
        )
        # Prompt lewat stdin: opsi -i menerima banyak berkas dan akan "menelan" argumen prompt.
        cmd.append("-")
        prompt_text = (
            "Generate exactly ONE image with your built-in image generation tool (do not write code, do not "
            f"draw with SVG). Aspect: {aspect}. {STYLE}{ref_note}\n\nImage: {prompt}\n\n"
            "Copy the generated image file into the current directory as out.png, then reply with only 'done'."
        )
        # Grup proses sendiri: subprocess.run(timeout=...) bisa menggantung selamanya bila proses anak Codex
        # masih memegang pipa. Saat waktu habis, seluruh grup dibunuh.
        log = Path(tmp) / "codex.log"
        with open(log, "w") as fh:
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=fh, stderr=subprocess.STDOUT,
                                    text=True, start_new_session=True)
            proc.stdin.write(prompt_text)
            proc.stdin.close()
            try:
                proc.wait(timeout=600)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait()
        out = Path(tmp) / "out.png"
        if not out.exists():
            raise RuntimeError(f"{name}: Codex tidak menghasilkan gambar\n{log.read_text()[-1000:]}")
        png.write_bytes(out.read_bytes())
    return png


def to_webp(png, name, width=900):
    from PIL import Image  # ffmpeg bawaan Homebrew tidak selalu punya encoder WebP

    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f"{name}.webp"
    im = Image.open(png).convert("RGB")
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(dst, "WEBP", quality=78, method=6)
    return dst


def sheets():
    ch = characters()
    groups = {
        "tokoh-mahad": ["Rizki", "Budi", "Siti", "Aisyah", "Ustaz Mahmud", "Ustazah Zainab"],
        "tokoh-keluarga": ["Pak Ahmad", "Bu Fatimah", "Rizki", "Ayu", "Nur"],
        "tokoh-tamu": ["Yusuf", "Pak Wayan", "Kakek Umar", "Nenek Aminah"],
    }
    for name, who in groups.items():
        if (ILU / f"{name}.png").exists():
            continue
        desc = " ".join(f"({i+1}) {ch[w]}." for i, w in enumerate(who))
        prompt = (f"Character reference sheet: {len(who)} characters standing side by side in a row, full body, "
                  f"front view, evenly spaced on a plain cream background, left to right: {desc}")
        png = generate(name, prompt, aspect="wide 16:9")
        (ILU / f"{name}.png").write_bytes(png.read_bytes())
        print("ok", name)


def requests_in(unit_file):
    """Kumpulkan {img: scene} dari sumber unit (kartu, baris, prompt)."""
    found = {}

    def walk(o):
        if isinstance(o, dict):
            if o.get("img") and o.get("scene"):
                found[o["img"]] = o["scene"]
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(json.loads(unit_file.read_text()))
    return found


def main():
    if not sys.argv[1:]:
        sys.exit(__doc__)
    if sys.argv[1] == "tokoh":
        return sheets()
    which = sys.argv[2]
    files = sorted((ROOT / "content-src" / "orisinal").glob("unit-*.json")) if which == "all" else [
        ROOT / "content-src" / "orisinal" / f"unit-{int(which):02d}.json"]
    refs = [p for p in (ILU / "tokoh-mahad.png", ILU / "tokoh-keluarga.png", ILU / "tokoh-tamu.png") if p.exists()]
    for f in files:
        for name, scene in requests_in(f).items():
            if (OUT / f"{name}.webp").exists():
                continue
            # Rujukan tokoh hanya bila adegan menyebut tokoh.
            use = refs if re.search(r"Rizki|Budi|Siti|Aisyah|Ustaz|Ahmad|Fatimah|Ayu|Nur\b|Zainab|Yusuf|Wayan|Umar|Aminah", scene) else []
            try:
                png = SRC_PNG / f"{name}.png"  # pakai ulang hasil Codex yang sudah ada
                to_webp(png if png.exists() else generate(name, scene, use), name)
                print("ok", name, flush=True)
            except Exception as e:  # lanjutkan gambar lain; ulangi nanti
                print("GAGAL", name, str(e)[:300], flush=True)


if __name__ == "__main__":
    main()
