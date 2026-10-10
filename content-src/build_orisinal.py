#!/usr/bin/env python3
"""Bangun unit orisinal: validasi → audio Azure TTS → JSON aplikasi → dokumen review.

Pakai: python3 content-src/build_orisinal.py <nomor unit | all> [--audio]
Format sumber: content-src/orisinal/FORMAT.md
"""
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "content-src" / "orisinal"
OUT_JSON = ROOT / "web" / "src" / "content"
OUT_AUDIO = ROOT / "web" / "public" / "audio" / "o"
OUT_DOC = ROOT / "docs" / "kurikulum" / "jilid-1"
OUT_IMG = ROOT / "web" / "public" / "img" / "o"
VOICES = json.loads((ROOT / "content-src" / "voices.json").read_text())["voices"]

NAMES_AR = {
    "rizki": "رِزْقِي", "budi": "بُودِي", "ustaz_mahmud": "الأُسْتاذُ مَحْمُود", "pak_ahmad": "أَحْمَد",
    "siti": "سِيتِي", "aisyah": "عائِشَة", "bu_fatimah": "فاطِمَة", "ayu": "أَيُو", "nur": "نُور",
    "ustazah_zainab": "الأُسْتاذَةُ زَيْنَب", "kakek_umar": "الجَدُّ عُمَر", "nenek_aminah": "الجَدَّةُ آمِنَة",
    "yusuf": "يُوسُف", "pak_wayan": "وايان",
    "figuran_lk": "", "figuran_pr": "",  # tokoh tanpa nama; label dari field `label_ar` baris
    "narator": "",
}
SKILLS = {"Huruf", "Hiwar", "Mufradat", "Tarakib", "Ashwat", "Kalam", "Qira'ah", "Kitabah"}
KEY_RE = re.compile(r"^[a-z0-9-]+$")
AR_LETTER = re.compile(r"[ء-يٱ]")
DIACRITIC = re.compile(r"[ً-ْٰ]")
# Kata tanpa harakat yang lazim (lam-alif, partikel pendek, nama asing yang ditulis tanpa harakat).
NO_HARAKAT_OK = {"لا", "ما", "يا", "إلى", "هٰذا", "هٰذِهِ", "ماذا", "وَماذا", "ماكاسار", "ماليزيا", "وايان"}  # ما/ماذا ditulis tanpa harakat (konvensi)


def pic(p, where, name):
    """Ilustrasi orisinal: dipasang hanya bila WebP-nya sudah dibuat (gen_ilustrasi.py)."""
    if (OUT_IMG / f"{name}.webp").exists():
        return f"/img/o/{name}.webp"
    p.warn(where, f"ilustrasi belum ada: {name}")
    return None


class Problems:
    def __init__(self):
        self.errors, self.warnings = [], []

    def err(self, where, msg):
        self.errors.append(f"{where}: {msg}")

    def warn(self, where, msg):
        self.warnings.append(f"{where}: {msg}")


def has_ar(s):
    return bool(s) and bool(AR_LETTER.search(s))


def check_harakat(p, where, text):
    """Peringatkan kata Arab (≥2 huruf) yang tidak punya harakat sama sekali."""
    for w in re.findall(r"[ء-ْٰٱـ]+", text):
        letters = AR_LETTER.findall(w)
        if len(letters) >= 2 and not DIACRITIC.search(w) and w not in NO_HARAKAT_OK:
            p.warn(where, f"tanpa harakat: {w}")


# ---------------------------------------------------------------- audio

def voice_cfg(who):
    v = VOICES.get(who or "narator")
    if not v:
        raise KeyError(who)
    return v


def audio_name(who, text):
    v = voice_cfg(who)
    h = hashlib.sha1(f"{v['voice']}|{v['rate']}|{v['pitch']}|{text}".encode()).hexdigest()[:16]
    return f"{h}.mp3"


class Audio:
    def __init__(self, enabled):
        self.enabled = enabled
        self.wanted = {}  # nama berkas -> (who, text)
        self.chars = 0

    def ref(self, who, text):
        if not has_ar(text):
            return None
        name = audio_name(who, text)
        self.wanted[name] = (who or "narator", text)
        return {"src": f"/audio/o/{name}"}

    def synth_missing(self):
        OUT_AUDIO.mkdir(parents=True, exist_ok=True)
        missing = {n: v for n, v in self.wanted.items() if not (OUT_AUDIO / n).exists()}
        if not missing:
            return 0
        if not self.enabled:
            print(f"  ! {len(missing)} klip audio belum ada (jalankan dengan --audio)")
            return 0
        key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
        if not key:
            env = ROOT / "web" / ".env.local"
            for line in env.read_text().splitlines():
                if line.startswith("AZURE_SPEECH_KEY="):
                    key = line.split("=", 1)[1].strip()
                if line.startswith("AZURE_SPEECH_REGION="):
                    region = line.split("=", 1)[1].strip()
        url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
        for i, (name, (who, text)) in enumerate(missing.items(), 1):
            v = voice_cfg(who)
            # Tanda baca akhir dipertahankan supaya intonasi tanya/seru terbaca.
            ssml = (
                '<speak version="1.0" xml:lang="ar-SA" xmlns="http://www.w3.org/2001/10/synthesis">'
                f'<voice name="{v["voice"]}"><prosody rate="{v["rate"]}" pitch="{v["pitch"]}">'
                f"{html.escape(text)}</prosody></voice></speak>"
            )
            req = urllib.request.Request(
                url,
                data=ssml.encode(),
                method="POST",
                headers={
                    "Ocp-Apim-Subscription-Key": key,
                    "Content-Type": "application/ssml+xml",
                    "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
                    "User-Agent": "arabic-yogency-builder",
                },
            )
            for attempt in range(10):
                try:
                    data = urllib.request.urlopen(req, timeout=60).read()
                    break
                except urllib.error.HTTPError as e:
                    # Paket F0 dibatasi ±20 permintaan/menit: tunggu sesuai Retry-After.
                    if e.code == 429 and attempt < 9:
                        time.sleep(int(e.headers.get("Retry-After") or 0) or 10)
                        continue
                    raise
            (OUT_AUDIO / name).write_bytes(data)
            self.chars += len(text)
            if i % 25 == 0:
                print(f"  audio {i}/{len(missing)}")
        return len(missing)


# ---------------------------------------------------------------- build

def build_unit(src, p, audio):
    n = src["unit"]
    uid = f"j1u{n}"
    out = {
        "id": uid,
        "book": src.get("book", "1a"),
        "number": n,
        "title_ar": src["title_ar"],
        "title_id": src["title_id"],
        "lessons": [],
    }
    seen_keys = set()
    repeats = 0
    dars_seen = []

    def text_check(where, s):
        if has_ar(s):
            check_harakat(p, where, s)

    def row(where, r, who=None):
        o = {}
        if "ar" in r:
            o["ar"] = r["ar"]
            text_check(where, r["ar"])
        if "id" in r:
            o["id"] = r["id"] + (f" · ★ {r['serapan']}" if r.get("serapan") else "")
        if r.get("emoji"):
            o["emoji"] = r["emoji"]
        if r.get("img") and (src := pic(p, where, r["img"])):
            o["img"] = src
        if who is not None:
            if who not in VOICES:
                p.err(where, f"penutur tidak dikenal: {who}")
                who = "narator"
            o["speaker_ar"] = r.get("label_ar") or NAMES_AR.get(who, "")
            if who.startswith("figuran") and not r.get("label_ar"):
                p.err(where, "baris figuran wajib punya label_ar (mis. البائِعُ)")
        a = audio.ref(who, r.get("ar"))
        if a:
            o["audio"] = a
        return o

    def card(where, c):
        kind = c["card"]
        o = {"kind": kind, "rows": []}
        if c.get("section"):
            o["section"] = {"id": c["section"]}
        if c.get("img") and (src := pic(p, where, c["img"])):
            o["imgs"] = [src]
        for f in ("title_ar", "instruction_ar", "instruction_id", "note_id"):
            if c.get(f):
                o[f] = c[f]
                if f.endswith("_ar"):
                    text_check(where, c[f])
        if kind == "dialogue":
            if not c.get("rows"):
                p.err(where, "dialog kosong")
            for i, r in enumerate(c.get("rows", [])):
                if "who" not in r:
                    p.err(f"{where} baris {i+1}", "dialog tanpa 'who'")
                o["rows"].append(row(f"{where} baris {i+1}", r, r.get("who", "narator")))
        elif kind == "grammar":
            o["groups"] = []
            for g in c.get("groups", []):
                gg = {k: g[k] for k in ("title_ar", "note_id") if g.get(k)}
                gg["rows"] = [row(where, r) for r in g.get("rows", [])]
                o["groups"].append(gg)
        elif kind == "sounds":
            for a, b in c.get("pairs", []):
                o["rows"].append(row(where, {"ar": a}))
                rb = row(where, {"ar": b})
                rb["pair_ar"] = a
                o["rows"][-1]["pair_ar"] = b
                o["rows"].append(rb)
        elif kind in ("vocab", "reading", "writing"):
            o["rows"] = [row(where, r) for r in c.get("rows", [])]
        else:
            p.err(where, f"jenis kartu tidak dikenal: {kind}")
        return o

    def question(where, q, dars):
        nonlocal repeats
        t = q.get("q")
        k = q.get("k", "")
        if not KEY_RE.match(k):
            p.err(where, f"kunci 'k' tidak valid: {k!r}")
        key = f"{uid}-d{dars}-{k}"
        if key in seen_keys:
            p.err(where, f"kunci ganda: {k}")
        seen_keys.add(key)
        where = f"{where} [{k}]"

        def prompt(pr):
            o = {}
            if "listen" in pr:
                o["tts"] = pr["listen"]
                o["autoplay"] = True
                text_check(where, pr["listen"])
                a = audio.ref("narator", pr["listen"])
                if a:
                    o["audio"] = a
            if pr.get("ar"):
                o["ar"] = pr["ar"]
                text_check(where, pr["ar"])
                a = audio.ref("narator", pr["ar"])
                if a:
                    o["audio"] = a
            if pr.get("id"):
                o["id"] = pr["id"]
            if pr.get("emoji"):
                o["emoji"] = pr["emoji"]
            if pr.get("img") and (src := pic(p, where, pr["img"])):
                o["img"] = src
            if not o:
                p.err(where, "prompt kosong")
            return o

        if t == "choice":
            opts, ans = q.get("options", []), q.get("answer")
            lang = q.get("lang")
            if lang not in ("id", "ar"):
                p.err(where, "lang harus 'id' atau 'ar'")
            if ans not in opts:
                p.err(where, "jawaban tidak ada di options")
            if len(opts) != len(set(opts)):
                p.err(where, "options ganda")
            if not 2 <= len(opts) <= 4:
                p.err(where, "options harus 2–4")
            o = {"type": "choice", "key": key, "instruction": q["instruction"], "prompt": prompt(q["prompt"]),
                 "answer": ans, "options": opts, "lang": lang}
            if lang == "ar":
                am = {}
                for x in opts:
                    text_check(where, x)
                    a = audio.ref("narator", x)
                    if a:
                        am[x] = a
                o["audioMap"] = am
            return o
        if t == "arrange":
            ans = q.get("answer", "")
            text_check(where, ans)
            tokens = ans.split() + q.get("extra", [])
            if not 2 <= len(ans.split()) <= 7:
                p.err(where, f"arrange perlu 2–7 kata, ada {len(ans.split())}")
            am = {}
            for x in tokens:
                a = audio.ref("narator", x)
                if a:
                    am[x] = a
            return {"type": "arrange", "key": key, "instruction": q.get("instruction", "Susun menjadi kalimat"),
                    "prompt": prompt(q["prompt"]), "answer": ans, "tokens": tokens, "audioMap": am}
        if t == "repeat":
            repeats += 1
            ar = q["ar"]
            text_check(where, ar)
            if len(ar.split()) > 6:
                p.warn(where, "kalimat repeat sebaiknya ≤ 5 kata")
            who = q.get("who", "narator")
            pr = {"ar": ar, "id": q.get("id", "")}
            a = audio.ref(who, ar)
            if a:
                pr["audio"] = a
            return {"type": "repeat", "key": f"r:{key}", "instruction": q.get("instruction", "Dengarkan, lalu tirukan"),
                    "prompt": pr, "target": ar}
        if t == "speak":
            model = []
            for m in q.get("model", []):
                text_check(where, m["ar"])
                mm = {"ar": m["ar"], "id": m.get("id", "")}
                if m.get("who"):
                    mm["speaker_ar"] = NAMES_AR.get(m["who"], "")
                a = audio.ref(m.get("who", "narator"), m["ar"])
                if a:
                    mm["audio"] = a
                model.append(mm)
            return {"type": "speak", "key": key, "instruction": q["instruction"], "prompt": prompt(q["prompt"]),
                    "model": model}
        p.err(where, f"jenis soal tidak dikenal: {t}")
        return None

    for L in src["lessons"]:
        d = L["dars"]
        dars_seen.append(d)
        where = f"unit {n} dars {d}"
        if L.get("skill") not in SKILLS:
            p.err(where, f"skill tidak dikenal: {L.get('skill')}")
        steps = []
        nq = 0
        for i, s in enumerate(L.get("steps", [])):
            w = f"{where} langkah {i+1}"
            if "card" in s:
                steps.append({"t": "card", "card": card(w, s)})
            else:
                qq = question(w, s, d)
                if qq:
                    steps.append({"t": "q", "q": qq})
                    nq += 1
        practice = [x for x in (question(f"{where} latihan {i+1}", s, d) for i, s in enumerate(L.get("practice", []))) if x]
        ns = len(steps)
        if not 8 <= ns <= 15:
            p.err(where, f"jumlah langkah {ns} (harus 8–15)")
        if ns and nq / ns < 0.6:
            p.err(where, f"soal hanya {nq}/{ns} ({round(100*nq/ns)}%), minimal 60%")
        if not 4 <= len(practice) <= 9:
            p.warn(where, f"latihan ulang {len(practice)} soal (disarankan 4–9)")
        out["lessons"].append({
            "id": f"{uid}-d{d}", "dars": d, "title_id": L["title_id"], "skill": L["skill"],
            "pages": [0, 0], "track": None, "steps": steps, "practice": practice,
        })
    if dars_seen != list(range(1, len(dars_seen) + 1)):
        p.err(f"unit {n}", f"nomor dars harus berurutan dari 1: {dars_seen}")
    if not 6 <= len(dars_seen) <= 9:
        p.err(f"unit {n}", f"jumlah dars {len(dars_seen)} (harus 6–9)")
    if repeats < 2:
        p.err(f"unit {n}", f"soal repeat {repeats} (minimal 2)")
    return out


# ---------------------------------------------------------------- dokumen review

def review_doc(src, built):
    n = src["unit"]
    L = [f"# Unit {n}: {src['title_id']} ({src['title_ar']})", "",
         f"> Dibuat otomatis dari `content-src/orisinal/unit-{n:02d}.json` oleh `build_orisinal.py`. "
         "Jangan menyunting berkas ini; sunting sumbernya.", ""]
    if src.get("notes"):
        L += ["## Catatan penulis", "", src["notes"].strip(), ""]
    for les in built["lessons"]:
        nq = sum(1 for s in les["steps"] if s["t"] == "q")
        L += [f"## Dars {les['dars']}: {les['title_id']} ({les['skill']})", "",
              f"{len(les['steps'])} langkah, {nq} soal, {len(les['practice'])} latihan ulang.", ""]
        for s in les["steps"]:
            if s["t"] == "card":
                c = s["card"]
                head = c.get("section", {}).get("id") or c["kind"]
                L.append(f"**[{head}]** {c.get('title_ar', '')} {c.get('instruction_id', '')}".rstrip())
                if c.get("note_id"):
                    L.append(f"_{c['note_id']}_")
                rows = c["rows"] or [r for g in c.get("groups", []) for r in g["rows"]]
                for g in c.get("groups", []):
                    if g.get("title_ar") or g.get("note_id"):
                        L.append(f"- _{g.get('title_ar', '')} {g.get('note_id', '')}_")
                for r in rows:
                    who = f"**{r['speaker_ar']}:** " if r.get("speaker_ar") else ""
                    em = f"{r['emoji']} " if r.get("emoji") else ""
                    L.append(f"- {em}{who}{r.get('ar', '')} — {r.get('id', '')}")
                L.append("")
            else:
                L.append(fmt_q(s["q"]))
        if les["practice"]:
            L += ["", "_Latihan ulang:_"] + [fmt_q(q) for q in les["practice"]]
        L.append("")
    return "\n".join(L)


def fmt_q(q):
    pr = q["prompt"]
    shown = pr.get("ar") or (f"🔊 {pr['tts']}" if pr.get("tts") else "") or pr.get("id", "")
    if pr.get("emoji"):
        shown = f"{pr['emoji']} {shown}"
    if q["type"] == "choice":
        opts = " / ".join(("**" + o + "**") if o == q["answer"] else o for o in q["options"])
        return f"- `{q['key']}` {q['instruction']} {shown} → {opts}"
    if q["type"] == "arrange":
        return f"- `{q['key']}` Susun: {pr.get('id', '')} → **{q['answer']}**"
    if q["type"] == "repeat":
        return f"- `{q['key']}` Tirukan: {q['target']} ({pr.get('id', '')})"
    return f"- `{q['key']}` Bicara: {q['instruction']} {pr.get('id', '')}"


def write_index():
    """web/src/content/orisinal.ts: impor semua unit orisinal yang sudah dibangun, urut nomor."""
    files = sorted(OUT_JSON.glob("j1u*.json"), key=lambda f: int(f.stem[3:]))
    lines = ["// Dibuat otomatis oleh content-src/build_orisinal.py. Jangan disunting.", ""]
    lines += [f'import {f.stem} from "./{f.name}";' for f in files]
    lines += ["", f"export const ORISINAL_UNITS = [{', '.join(f.stem for f in files)}];", ""]
    (OUT_JSON / "orisinal.ts").write_text("\n".join(lines))


# ---------------------------------------------------------------- main

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    do_audio = "--audio" in sys.argv
    if not args:
        sys.exit(__doc__)
    files = sorted(SRC.glob("unit-*.json")) if args[0] == "all" else [SRC / f"unit-{int(args[0]):02d}.json"]
    total_err = 0
    audio = Audio(do_audio)
    built_all = []
    for f in files:
        src = json.loads(f.read_text())
        p = Problems()
        built = build_unit(src, p, audio)
        print(f"{f.name}: {len(built['lessons'])} dars, "
              f"{sum(len(l['steps']) for l in built['lessons'])} langkah, "
              f"{len(p.errors)} galat, {len(p.warnings)} peringatan")
        for e in p.errors:
            print("  GALAT", e)
        for w in p.warnings[:40]:
            print("  awas ", w)
        if len(p.warnings) > 40:
            print(f"  … {len(p.warnings) - 40} peringatan lain")
        total_err += len(p.errors)
        built_all.append((src, built))
    if total_err:
        sys.exit(f"{total_err} galat; tidak ada yang ditulis.")
    made = audio.synth_missing()
    OUT_JSON.mkdir(parents=True, exist_ok=True)
    OUT_DOC.mkdir(parents=True, exist_ok=True)
    for src, built in built_all:
        (OUT_JSON / f"{built['id']}.json").write_text(json.dumps(built, ensure_ascii=False, indent=1) + "\n")
        (OUT_DOC / f"unit-{src['unit']:02d}.md").write_text(review_doc(src, built) + "\n")
    write_index()
    print(f"Selesai. Audio baru: {made} klip ({audio.chars} karakter). Total klip dipakai: {len(audio.wanted)}.")


if __name__ == "__main__":
    main()
