"use client";

import { Check, Volume2, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { speak } from "@/lib/audio";
import { playCorrect, playWrong } from "@/lib/sfx";

// Contoh soal buatan sendiri (bukan materi buku) untuk pratinjau di beranda publik.
const QUESTIONS = [
  { ar: "السَّلامُ عَلَيْكُم", answer: "Semoga keselamatan atasmu", options: ["Semoga keselamatan atasmu", "Selamat pagi", "Terima kasih"] },
  { ar: "كَيْفَ حالُكَ؟", answer: "Apa kabarmu?", options: ["Siapa namamu?", "Apa kabarmu?", "Dari mana kamu?"] },
  { ar: "شُكْرًا", answer: "Terima kasih", options: ["Maaf", "Tolong", "Terima kasih"] },
];

/** Soal mini yang bisa dicoba tanpa login: gambaran alur belajar. */
export function LandingDemo() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean | null>(null);
  const q = QUESTIONS[i % QUESTIONS.length];

  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[2.5rem] border-[10px] border-ink bg-bg p-4 shadow-[0_12px_0_var(--line)]">
      <div className="mb-4 flex items-center gap-2">
        <X aria-hidden className="h-5 w-5 text-ink-soft" />
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${((i % 3) + 1) * 30}%` }} />
        </div>
      </div>
      <p className="text-[18px] leading-tight font-black">Apa artinya?</p>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" aria-label="Putar" onClick={() => speak(q.ar)} className="btn btn-primary h-12 min-h-12 w-12 rounded-xl p-0">
          <Volume2 aria-hidden className="h-6 w-6" />
        </button>
        <p className="tile ar flex-1 px-3 py-1 text-[26px]" lang="ar">
          {q.ar}
        </p>
      </div>
      <ul className="mt-4 space-y-2">
        {q.options.map((o) => {
          const state = checked === null ? (picked === o ? "sel" : "") : o === q.answer ? "right" : picked === o ? "wrong" : "";
          return (
            <li key={o}>
              <button
                type="button"
                disabled={checked !== null}
                onClick={() => setPicked(o)}
                className={clsx(
                  "tile min-h-12 w-full px-3 text-[16px] font-bold",
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
      <div className={clsx("mt-4 -mx-4 -mb-4 rounded-b-[1.9rem] p-4", checked === null ? "" : checked ? "bg-good-bg" : "bg-bad-bg")}>
        {checked !== null && (
          <p className={clsx("mb-2 flex items-center gap-2 text-[18px] font-black", checked ? "text-good" : "text-bad")} role="status">
            {checked ? <Check aria-hidden className="h-5 w-5" strokeWidth={3} /> : <X aria-hidden className="h-5 w-5" strokeWidth={3} />}
            {checked ? "Mantap!" : `Jawaban: ${q.answer}`}
          </p>
        )}
        {checked === null ? (
          <button
            type="button"
            disabled={!picked}
            onClick={() => {
              const ok = picked === q.answer;
              setChecked(ok);
              if (ok) playCorrect();
              else playWrong();
            }}
            className="btn btn-primary w-full"
          >
            Periksa
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setI(i + 1);
              setPicked(null);
              setChecked(null);
            }}
            className={clsx("btn w-full", checked ? "btn-good" : "btn-bad")}
          >
            Lanjut
          </button>
        )}
      </div>
    </div>
  );
}
