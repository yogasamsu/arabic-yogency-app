"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { stopAll } from "@/lib/audio";
import type { WordMark } from "@/lib/speech-score";

const MAX_MS = 9000;

export type SpeechResult = { transcript: string; score?: number; words?: WordMark[] };

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

/** Rekam ucapan, kirim ke server Whisper, tampilkan skor & kata yang terdengar. */
export function SpeechRecorder({
  target,
  onResult,
}: {
  target?: string;
  onResult?: (r: SpeechResult) => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "scoring" | "done" | "error">("idle");
  const [result, setResult] = useState<SpeechResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      rec.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function start() {
    setError(null);
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("Perekaman suara tidak didukung di browser ini.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setState("error");
      setError("Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser, lalu coba lagi.");
      return;
    }
    stopAll();
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.current = r;
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      setState("scoring");
      const body = new FormData();
      body.append("audio", new Blob(chunks, { type: r.mimeType || "audio/webm" }), "speech");
      if (target) body.append("target", target);
      try {
        const res = await fetch("/api/speech", { method: "POST", body });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SpeechResult;
        setResult(data);
        setState("done");
        onResult?.(data);
      } catch {
        setState("error");
        setError("Penilaian ucapan sedang tidak tersedia. Coba lagi sebentar, atau lewati.");
      }
    };
    r.start();
    setElapsed(0);
    setState("recording");
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const ms = Date.now() - t0;
      setElapsed(ms);
      if (ms >= MAX_MS && r.state === "recording") r.stop();
    }, 100);
  }

  function stop() {
    if (rec.current?.state === "recording") rec.current.stop();
  }

  const recording = state === "recording";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={state === "scoring"}
          aria-label={recording ? "Berhenti merekam" : "Mulai merekam"}
          className={clsx("btn h-20 w-20 shrink-0 rounded-full p-0", recording ? "btn-bad" : "btn-primary")}
        >
          {recording ? <Square aria-hidden className="h-8 w-8 fill-current" /> : <Mic aria-hidden className="h-9 w-9" />}
        </button>
        <div className="min-w-0 text-[16px] font-bold text-ink-soft">
          {state === "idle" && "Ketuk mikrofon, lalu ucapkan."}
          {recording && (
            <span className="text-bad">
              Merekam… {(elapsed / 1000).toFixed(1)} dtk · ketuk lagi untuk selesai
            </span>
          )}
          {state === "scoring" && "Menilai ucapanmu…"}
          {state === "done" && "Mau coba lagi? Ketuk mikrofon."}
          {state === "error" && <span className="text-bad">{error}</span>}
        </div>
      </div>
      {recording && (
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-bad transition-[width] duration-100" style={{ width: `${(elapsed / MAX_MS) * 100}%` }} />
        </div>
      )}
      {result && state !== "recording" && (
        <div className="tile space-y-2 p-4" role="status">
          {result.score !== undefined && (
            <p className={clsx("text-[22px] font-black", result.score >= 70 ? "text-good" : "text-bad")}>
              Skor ucapan: {result.score}
            </p>
          )}
          {result.words && (
            <p className="ar text-[26px]" dir="rtl">
              {result.words.map((w, i) => (
                <span key={i} className={clsx("me-2", w.ok ? "text-good" : "text-bad underline decoration-2 underline-offset-8")}>
                  {w.w}
                </span>
              ))}
            </p>
          )}
          <p className="text-[15px] text-ink-soft">
            Terdengar: <span className="ar text-[19px] text-ink">{result.transcript || "(tidak terdengar)"}</span>
          </p>
        </div>
      )}
    </div>
  );
}
