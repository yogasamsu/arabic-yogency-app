"use client";

import { Check, Trophy, Turtle, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import type { AudioRef, Prompt, Question, Step } from "@/lib/content";
import { preloadTrack, say, stopAll } from "@/lib/audio";
import { saveCardPosition, submitQuiz, submitReview, type AnswerResult } from "@/lib/actions";
import { AudioButton } from "./AudioButton";
import { BookImage } from "./BookImage";
import { CardView } from "./CardView";
import { FeedbackLink } from "./FeedbackLink";
import { SpeechRecorder, type SpeechResult } from "./SpeechRecorder";
import { playComplete, playCorrect, playWrong } from "@/lib/sfx";

export type FlowMode =
  | { kind: "lesson"; lessonId: string; nextLessonId: string | null; title: string; track: string | null }
  | { kind: "practice"; lessonId: string; title: string }
  | { kind: "review" };

// ---------- preferensi terjemahan (per perangkat) ----------
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const readShowId = () => {
  try {
    return localStorage.getItem("showTranslation") !== "0";
  } catch {
    return true;
  }
};
const writeShowId = (v: boolean) => {
  try {
    localStorage.setItem("showTranslation", v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
};

// ---------- acak yang sama di server & klien ----------
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const exact = (s: string) => s.replace(/[\s.،؟?!,]+/g, " ").trim();

const PRAISE = ["Benar!", "Mantap!", "Bagus sekali!", "Tepat!", "Mā syā Allāh!"];

export function LessonFlow({
  steps,
  seed,
  mode,
  startIndex = 0,
}: {
  steps: Step[];
  seed: number;
  mode: FlowMode;
  startIndex?: number;
}) {
  const rand = useMemo(() => rng(seed), [seed]);
  const prepared = useMemo(
    () =>
      steps.map((s) => ({
        s,
        options: s.t === "q" && s.q.type === "choice" ? shuffle(s.q.options, rand) : [],
        tokens: s.t === "q" && s.q.type === "arrange" ? shuffle(s.q.tokens, rand) : [],
      })),
    [steps, rand],
  );

  const [queue, setQueue] = useState(() => prepared.map((_, i) => i));
  const [pos, setPos] = useState(Math.min(startIndex, Math.max(0, prepared.length - 1)));
  const [picked, setPicked] = useState<number | null>(null);
  const [built, setBuilt] = useState<number[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [spoken, setSpoken] = useState<SpeechResult | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [summary, setSummary] = useState<null | { score: number; xp: number; correct: number; total: number }>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showId = useSyncExternalStore(subscribe, readShowId, () => true);
  const startedAt = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    if (mode.kind === "lesson") preloadTrack(mode.track);
    return () => stopAll();
  }, [mode]);

  const current = pos < queue.length ? prepared[queue[pos]] : null;
  const firstPass = pos < prepared.length;
  const q = current?.s.t === "q" ? current.s.q : null;

  // Soal dengar diputar otomatis saat muncul.
  useEffect(() => {
    if (q?.prompt.autoplay && (q.prompt.tts || q.prompt.audio)) {
      const t = setTimeout(() => say(q.prompt.tts ?? q.prompt.ar ?? "", q.prompt.audio), 300);
      return () => clearTimeout(t);
    }
  }, [q]);

  async function finish(all: AnswerResult[]) {
    setSaving(true);
    setError(null);
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    try {
      if (mode.kind === "review") {
        const firsts = new Map<string, boolean>();
        for (const r of all) if (!firsts.has(r.key)) firsts.set(r.key, r.correct);
        const correct = [...firsts.values()].filter(Boolean).length;
        const { xp } = await submitReview(all, seconds);
        setSummary({ score: firsts.size ? Math.round((correct / firsts.size) * 100) : 100, xp, correct, total: firsts.size });
      } else {
        setSummary(await submitQuiz(mode.lessonId, all, seconds));
      }
      playComplete();
    } catch {
      setError("Progres belum tersimpan. Periksa koneksi, lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  function advance(nextResults = results) {
    stopAll();
    setPicked(null);
    setBuilt([]);
    setChecked(null);
    setSpoken(null);
    const np = pos + 1;
    setPos(np);
    topRef.current?.scrollIntoView({ block: "start" });
    if (mode.kind === "lesson" && np < prepared.length) saveCardPosition(mode.lessonId, np).catch(() => {});
    if (np >= queue.length) finish(nextResults);
  }

  function check() {
    if (!q) return;
    let ok = false;
    if (q.type === "choice" && picked !== null) {
      ok = exact(current!.options[picked]) === exact(q.answer);
    } else if (q.type === "arrange") {
      const strip = (s: string) => s.replace(/[ً-ْٰـ.،؟?!,]/g, "").replace(/\s+/g, " ").trim();
      ok = strip(built.map((i) => current!.tokens[i]).join(" ")) === strip(q.answer);
    }
    setChecked(ok);
    if (ok) playCorrect();
    else playWrong();
    setResults((r) => [...r, { key: q.key, kind: q.type, correct: ok }]);
    if (!ok && firstPass) setQueue((qq) => [...qq, qq[pos]]);
  }

  // ---------- Layar akhir ----------
  if (!current) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
        <Trophy aria-hidden className="h-20 w-20 text-accent" />
        {summary ? (
          <>
            <h1 className="text-[32px] font-black">
              {summary.score >= 80 ? "Mā syā Allāh, hebat!" : summary.score >= 50 ? "Bagus, terus berlatih!" : "Selesai! Pelan-pelan saja."}
            </h1>
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="tile p-3">
                <p className="text-[13px] font-extrabold text-ink-soft uppercase">XP</p>
                <p className="text-[28px] font-black text-accent">+{summary.xp}</p>
              </div>
              <div className="tile p-3">
                <p className="text-[13px] font-extrabold text-ink-soft uppercase">Akurasi</p>
                <p className="text-[28px] font-black text-good">{summary.score}%</p>
              </div>
            </div>
            {summary.score < 80 && summary.total > 0 && (
              <p className="text-[16px] text-ink-soft">Soal yang tadi salah akan muncul lagi di Ulasan.</p>
            )}
            <div className="flex w-full flex-col gap-3 pt-2">
              {mode.kind === "lesson" && mode.nextLessonId && (
                <Link href={`/belajar/${mode.nextLessonId}`} className="btn btn-primary">
                  Pelajaran berikutnya
                </Link>
              )}
              <Link href="/belajar" className="btn btn-secondary">
                Kembali ke peta
              </Link>
            </div>
            <FeedbackLink variant="link" context={mode.kind === "review" ? "ulasan" : mode.title} className="text-[15px]" />
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-black">{saving ? "Menyimpan progres…" : "Selesai"}</h1>
            {error && (
              <>
                <p role="alert" className="text-bad">
                  {error}
                </p>
                <button type="button" onClick={() => finish(results)} className="btn btn-primary">
                  Simpan lagi
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  const isCard = current.s.t === "card";
  const hasTranslation = isCard || q?.type === "speak" || q?.type === "repeat";

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <div ref={topRef} className="sticky top-0 z-10 bg-bg/95 px-4 pt-3 pb-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/belajar"
            aria-label="Keluar"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-peach"
          >
            <X aria-hidden className="h-7 w-7" strokeWidth={2.5} />
          </Link>
          <div
            className="h-4 flex-1 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Kemajuan"
            aria-valuemin={0}
            aria-valuemax={queue.length}
            aria-valuenow={pos}
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${Math.max(4, (pos / queue.length) * 100)}%` }} />
          </div>
        </div>
        {hasTranslation && (
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[14px] font-semibold text-ink-soft">{mode.kind !== "review" ? mode.title : "Ulasan"}</p>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[14px] font-bold text-ink-soft">
              <input
                type="checkbox"
                checked={showId}
                onChange={(e) => writeShowId(e.target.checked)}
                className="h-5 w-5 accent-[var(--accent)]"
              />
              Terjemahan
            </label>
          </div>
        )}
      </div>

      <main className="flex-1 px-4 pt-3 pb-52">
        {current.s.t === "card" ? (
          <CardView key={pos} card={current.s.card} showId={showId} />
        ) : q?.type === "speak" ? (
          <Speak key={pos} q={q} showId={showId} />
        ) : q?.type === "repeat" ? (
          <div key={pos} className="space-y-6">
            <p className="text-[14px] font-extrabold tracking-wide text-accent uppercase">Latihan ucapan</p>
            <h2 className="text-[24px] leading-tight font-black">{q.instruction}</h2>
            <PromptView prompt={q.prompt} />
            <SpeechRecorder
              target={q.target}
              onResult={(r) => {
                if (r.score === undefined) return;
                if (!spoken) {
                  setResults((rs) => [...rs, { key: q.key, kind: q.type, correct: r.score! >= 70 }]);
                }
                setSpoken(r);
                if (r.score >= 70) playCorrect();
                else playWrong();
              }}
            />
          </div>
        ) : q ? (
          <div key={pos} className="space-y-6">
            <h2 className="text-[24px] leading-tight font-black">{q.instruction}</h2>
            <PromptView prompt={q.prompt} />
            {q.type === "choice" ? (
              <ul className={clsx("grid gap-3", current.options.every((o) => o.length <= 3) ? "grid-cols-2" : "grid-cols-1")}>
                {current.options.map((o, i) => {
                  const right = exact(o) === exact(q.answer);
                  const state = checked === null ? (picked === i ? "sel" : "idle") : right ? "right" : picked === i ? "wrong" : "idle";
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={checked !== null}
                        aria-pressed={picked === i}
                        onClick={() => {
                          setPicked(i);
                          if (q.lang === "ar") say(o, q.audioMap?.[o]);
                        }}
                        className={clsx(
                          "tile flex min-h-16 w-full items-center justify-center px-4 py-2 text-center",
                          q.lang === "ar" ? "ar text-[26px]" : "text-[18px] font-bold",
                          state === "sel" && "tile-selected",
                          state === "right" && "tile-right",
                          state === "wrong" && "tile-wrong",
                        )}
                      >
                        {o}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Arrange tokens={current.tokens} audioMap={q.audioMap} built={built} setBuilt={setBuilt} locked={checked !== null} />
            )}
          </div>
        ) : null}
      </main>

      {/* Bilah bawah: tombol di zona jempol, umpan balik langsung */}
      <div
        className={clsx(
          "pb-safe fixed inset-x-0 bottom-0 z-10 border-t-2",
          checked === null ? "border-line bg-bg" : checked ? "border-transparent bg-good-bg" : "border-transparent bg-bad-bg",
        )}
      >
        <div className="mx-auto max-w-xl space-y-3 px-4 pt-4 pb-2">
          {checked !== null && q && (
            <div role="status" className={clsx("flex items-start gap-3", checked ? "text-good" : "text-bad")}>
              <span className={clsx("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full", checked ? "bg-good-strong" : "bg-bad-strong")}>
                {checked ? <Check aria-hidden className="h-6 w-6 text-white" strokeWidth={3} /> : <X aria-hidden className="h-6 w-6 text-white" strokeWidth={3} />}
              </span>
              <div className="min-w-0">
                <p className="text-[22px] font-black">{checked ? PRAISE[pos % PRAISE.length] : "Jawaban yang benar:"}</p>
                {!checked && "answer" in q && (
                  <p className={clsx(q.type === "choice" && q.lang === "id" ? "text-[18px] font-bold" : "ar text-[24px]")}>{q.answer}</p>
                )}
              </div>
            </div>
          )}
          {isCard ? (
            <button type="button" onClick={() => advance()} className="btn btn-primary w-full">
              Lanjut
            </button>
          ) : q?.type === "speak" ? (
            <button type="button" onClick={() => advance()} className="btn btn-primary w-full">
              Sudah saya ucapkan
            </button>
          ) : q?.type === "repeat" ? (
            spoken ? (
              <button type="button" onClick={() => advance()} className={clsx("btn w-full", (spoken.score ?? 0) >= 70 ? "btn-good" : "btn-primary")}>
                Lanjut
              </button>
            ) : (
              <button type="button" onClick={() => advance()} className="btn btn-secondary w-full">
                Lewati dulu
              </button>
            )
          ) : checked === null ? (
            <button
              type="button"
              onClick={check}
              disabled={q?.type === "arrange" ? built.length === 0 : picked === null}
              className="btn btn-primary w-full"
            >
              Periksa
            </button>
          ) : (
            <button type="button" onClick={() => advance()} className={clsx("btn w-full", checked ? "btn-good" : "btn-bad")}>
              {checked ? "Lanjut" : "Mengerti"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PromptView({ prompt }: { prompt: Prompt }) {
  const text = prompt.tts ?? prompt.ar;
  const listenOnly = !prompt.ar && !prompt.id && !prompt.img && text;
  return (
    <div className="space-y-4">
      {prompt.img && <BookImage name={prompt.img} className="mx-auto max-h-64 w-auto max-w-full" />}
      {prompt.emoji && (
        <p aria-hidden className="text-center text-[64px] leading-none">
          {prompt.emoji}
        </p>
      )}
      {listenOnly ? (
        <div className="flex justify-center gap-4 py-2">
          <button type="button" aria-label="Putar" onClick={() => say(text!, prompt.audio)} className="btn btn-primary h-24 w-24 rounded-3xl p-0">
            <Volume2 aria-hidden className="h-11 w-11" />
          </button>
          <button type="button" aria-label="Putar pelan" onClick={() => say(text!, prompt.audio, true)} className="btn btn-secondary h-16 w-16 self-end rounded-2xl p-0">
            <Turtle aria-hidden className="h-7 w-7" />
          </button>
        </div>
      ) : (
        (prompt.ar || prompt.id) && (
          <div className="flex items-center gap-3">
            {prompt.ar && <AudioButton text={prompt.ar} audio={prompt.audio} size="lg" />}
            <div className="tile relative min-w-0 flex-1 px-4 py-3">
              {prompt.ar && <p className="ar text-[30px] text-ink">{prompt.ar}</p>}
              {prompt.id && <p className={clsx(prompt.ar ? "text-[16px] text-ink-soft" : "text-[22px] font-bold text-ink")}>{prompt.id}</p>}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function Speak({ q, showId }: { q: Extract<Question, { type: "speak" }>; showId: boolean }) {
  return (
    <div className="space-y-5">
      <p className="text-[14px] font-extrabold tracking-wide text-accent uppercase">Latihan berbicara</p>
      <h2 className="text-[24px] leading-tight font-black">{q.instruction}</h2>
      {q.model.length > 0 && (
        <div className="tile space-y-1 p-4">
          <p className="text-[13px] font-extrabold text-ink-soft uppercase">Contoh</p>
          {q.model.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <AudioButton text={m.ar} audio={m.audio} />
              <div className="min-w-0 flex-1">
                <p className="ar text-[22px]">
                  {m.speaker_ar && <span className="text-ink-soft">{m.speaker_ar}: </span>}
                  {m.ar}
                </p>
                {showId && m.id && <p className="text-[15px] text-ink-soft">{m.id}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3">
        <p className="text-[17px] font-bold">Giliranmu, pakai petunjuk ini:</p>
        {q.prompt.img && <BookImage name={q.prompt.img} className="max-h-56 w-auto" />}
        {q.prompt.ar && <p className="ar tile px-4 py-3 text-[28px]">{q.prompt.ar}</p>}
        {showId && q.prompt.id && <p className="text-[16px] text-ink-soft">{q.prompt.id}</p>}
        <p className="text-[15px] text-ink-soft">Rekam ucapanmu untuk melihat apa yang terdengar, lalu tekan tombol di bawah.</p>
        <SpeechRecorder />
      </div>
    </div>
  );
}

function Arrange({
  tokens,
  audioMap,
  built,
  setBuilt,
  locked,
}: {
  tokens: string[];
  audioMap?: Record<string, AudioRef>;
  built: number[];
  setBuilt: (b: number[]) => void;
  locked: boolean;
}) {
  return (
    <div className="space-y-6">
      <div
        dir="rtl"
        aria-label="Kalimat yang kamu susun"
        className="flex min-h-[7.5rem] flex-wrap content-start gap-2 border-y-2 border-line py-3"
        style={{ backgroundImage: "linear-gradient(transparent 58px, var(--line) 58px, var(--line) 60px, transparent 60px)", backgroundSize: "100% 62px" }}
      >
        {built.map((ti, i) => (
          <button
            key={`${ti}-${i}`}
            type="button"
            disabled={locked}
            onClick={() => {
              setBuilt(built.filter((_, j) => j !== i));
            }}
            className="tile ar min-h-12 px-3 text-[24px]"
          >
            {tokens[ti]}
          </button>
        ))}
      </div>
      <div dir="rtl" className="flex flex-wrap justify-center gap-2">
        {tokens.map((t, ti) => {
          const used = built.includes(ti);
          return (
            <button
              key={ti}
              type="button"
              disabled={used || locked}
              onClick={() => {
                setBuilt([...built, ti]);
                say(t, audioMap?.[t]);
              }}
              className={clsx("tile ar min-h-12 px-3 text-[24px]", used && "border-line bg-line text-transparent")}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
