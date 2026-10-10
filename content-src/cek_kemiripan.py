#!/usr/bin/env python3
"""Cek kemiripan unit orisinal dengan transkripsi ABY (content-src/pages-json).

Kalimat dibandingkan setelah harakat & tanda baca dibuang. Melaporkan kalimat identik
dan baris dialog berurutan yang identik (brief: >2 kalimat berurutan = tulis ulang).
Pakai: python3 content-src/cek_kemiripan.py <nomor unit>
Catatan: content-src/pages-json/ tidak ada di repo publik (hak cipta penerbit), jadi skrip ini
hanya bisa dijalankan pemelihara.
"""
import difflib, json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
norm = lambda s: re.sub(r"\s+", " ", re.sub(r"[ً-ْٰـ.,،؟?!:؛\"()«»…-]", "", s)).strip()

def aby_sentences():
    out = []
    def walk(o):  # ambil semua string Arab di mana pun letaknya
        if isinstance(o, dict):
            for v in o.values(): yield from walk(v)
        elif isinstance(o, list):
            for v in o: yield from walk(v)
        elif isinstance(o, str) and re.search(r"[\u0621-\u064A]", o):
            yield o
    for f in sorted((ROOT / "content-src" / "pages-json").glob("p-*.json")):
        for t in walk(json.loads(f.read_text())):
            for s in re.split(r"[.؟?!\n]", t):
                if len(norm(s).split()) >= 2:
                    out.append(norm(s))
    return out

def main():
    n = int(sys.argv[1])
    src = json.loads((ROOT / "content-src" / "orisinal" / f"unit-{n:02d}.json").read_text())
    aby = aby_sentences(); aby_set = set(aby)
    identical, near, streak, worst = [], [], 0, 0
    for L in src["lessons"]:
        for s in L["steps"]:
            if s.get("card") in ("dialogue", "reading"):
                streak = 0
                for r in s["rows"]:
                    hit = False
                    for part in re.split(r"[.؟?!]", r["ar"]):
                        p = norm(part)
                        if len(p.split()) < 2: continue
                        if p in aby_set: identical.append(p); hit = True
                        else:
                            m = difflib.get_close_matches(p, aby, n=1, cutoff=0.85)
                            if m and len(p.split()) >= 3: near.append((p, m[0]))
                    streak = streak + 1 if hit else 0
                    worst = max(worst, streak)
    print(f"ABY: {len(aby)} kalimat rujukan. Unit {n}:")
    print(f"  kalimat identik (≥2 kata): {len(identical)}")
    for p in sorted(set(identical)): print("   =", p)
    print(f"  hampir sama (≥85%, ≥3 kata): {len(near)}")
    for p, m in near: print("   ~", p, "|", m)
    print(f"  baris berurutan identik terpanjang: {worst} ({'LULUS' if worst <= 2 else 'TULIS ULANG'})")

main()
