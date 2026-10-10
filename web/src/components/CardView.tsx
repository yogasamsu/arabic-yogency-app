"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { Card, Row } from "@/lib/content";
import { playSequence, say, stopAll } from "@/lib/audio";
import { AudioButton } from "./AudioButton";
import { BookImage } from "./BookImage";
import { TracePad } from "./TracePad";

const KIND_LABEL: Record<Card["kind"], string> = {
  dialogue: "Dialog",
  vocab: "Kosakata baru",
  grammar: "Pola kalimat",
  sounds: "Latihan bunyi",
  reading: "Bacaan",
  writing: "Menulis",
};

const hasArabic = (s?: string) => !!s && /[ء-ي]/.test(s);

/** Kartu materi (bukan soal): dialog, kosakata, kaidah, bunyi, bacaan, menulis. */
export function CardView({ card, showId }: { card: Card; showId: boolean }) {
  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <p className="text-[14px] font-extrabold tracking-wide text-accent uppercase">
          {card.section?.id ?? KIND_LABEL[card.kind]}
        </p>
        {card.title_ar && <h2 className="ar text-[28px] font-bold text-ink">{card.title_ar}</h2>}
        {card.instruction_id && (
          <div>
            {card.instruction_ar && <p className="ar text-[20px] text-ink-soft">{card.instruction_ar}</p>}
            <p className="text-[17px] font-semibold text-ink-soft">{card.instruction_id}</p>
          </div>
        )}
      </header>

      {card.imgs?.map((img) => <BookImage key={img} name={img} className="max-h-72 w-full" />)}

      {card.note_id && <p className="tile px-4 py-3 text-[16px]">{card.note_id}</p>}

      <Body card={card} showId={showId} />
    </article>
  );
}

function Body({ card, showId }: { card: Card; showId: boolean }) {
  switch (card.kind) {
    case "dialogue":
      return <Dialogue rows={card.rows} showId={showId} />;
    case "vocab":
      return <VocabGrid rows={card.rows} showId={showId} />;
    case "sounds":
      return <Sounds rows={card.rows} />;
    case "grammar":
      return (
        <div className="space-y-4">
          {card.groups?.map((g, i) => (
            <section key={i} className="tile space-y-2 p-4">
              {g.title_ar && <h3 className="ar text-[20px] font-bold text-accent">{g.title_ar}</h3>}
              {g.note_id && <p className="text-[16px] text-ink-soft">{g.note_id}</p>}
              <ul className="space-y-1">
                {g.rows?.map((r, j) => (
                  <li key={j}>
                    <Line row={r} showId={showId} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      );
    case "writing":
      return <Writing card={card} showId={showId} />;
    default:
      return (
        <ul className="space-y-2">
          {card.rows.map((r, i) => (
            <li key={i} className="tile px-3 py-2">
              <Line row={r} showId={showId} />
            </li>
          ))}
        </ul>
      );
  }
}

function Line({ row, showId }: { row: Row; showId: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {hasArabic(row.ar) && <AudioButton text={row.ar!} audio={row.audio} />}
      {row.emoji && (
        <span aria-hidden className="text-[28px] leading-none">
          {row.emoji}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {row.ar && <p className="ar text-[24px] text-ink">{row.ar}</p>}
        {showId && row.id && <p className="text-[16px] text-ink-soft">{row.id}</p>}
      </div>
    </div>
  );
}

function Dialogue({ rows, showId }: { rows: Row[]; showId: boolean }) {
  const speakers = [...new Set(rows.map((r) => r.speaker_ar).filter(Boolean))];
  const [playing, setPlaying] = useState<number | null>(null);
  // Kartu ditutup / pindah langkah: hentikan rangkaian audio.
  useEffect(() => () => stopAll(), []);
  const lines = rows.map((r, i) => ({ r, i })).filter((x) => x.r.ar);
  const playAll = () =>
    playSequence(
      lines.map((x) => ({ text: x.r.ar!, audio: x.r.audio })),
      (k) => setPlaying(k < 0 ? null : lines[k].i),
    );
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          if (playing !== null) {
            stopAll();
            setPlaying(null);
          } else playAll();
        }}
        className="btn btn-secondary"
      >
        <Play aria-hidden className="h-4 w-4" />
        {playing !== null ? "Berhenti" : "Putar dialog"}
      </button>
      <ol className="space-y-2">
        {rows.map((r, i) => {
          const first = speakers.indexOf(r.speaker_ar) % 2 === 0;
          return (
            <li key={i} className={clsx("flex", first ? "justify-end" : "justify-start")}>
              <div
                className={clsx(
                  "tile max-w-[90%] px-4 py-2",
                  first ? "rounded-tr-md" : "rounded-tl-md",
                  playing === i && "tile-selected",
                )}
              >
                <p className="ar text-[14px] font-bold text-accent">{r.speaker_ar}</p>
                <div className="flex items-center gap-2" dir="rtl">
                  <p className="ar text-[25px] text-ink">{r.ar}</p>
                  {r.ar && <AudioButton text={r.ar} audio={r.audio} />}
                </div>
                {showId && r.id && <p className="text-[16px] text-ink-soft">{r.id}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function VocabGrid({ rows, showId }: { rows: Row[]; showId: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {rows.map((r, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => r.ar && say(r.ar, r.audio)}
            className="tile flex h-full w-full flex-col items-center gap-1 p-2 pb-3 text-center"
          >
            {r.img && <BookImage name={r.img} className="aspect-[4/3] w-full object-cover" />}
            {!r.img && r.emoji && (
              <span aria-hidden className="pt-1 text-[44px] leading-none">
                {r.emoji}
              </span>
            )}
            {r.form && <span className="ar text-[34px] leading-tight text-accent">{r.form}</span>}
            <span className="ar text-[26px] leading-snug text-ink">{r.ar}</span>
            {showId && r.id && <span className="text-[15px] leading-tight text-ink-soft">{r.id}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Sounds({ rows }: { rows: Row[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2" dir="rtl">
      {rows.map((r, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => r.ar && say(r.ar, r.audio)}
            className={clsx("tile ar flex min-h-14 w-full items-center justify-center text-[26px]", r.pair_ar && i % 2 === 1 && "bg-blush/50")}
          >
            {r.ar}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Writing({ card, showId }: { card: Card; showId: boolean }) {
  const glyphs = card.rows.map((r) => r.ar).filter((a): a is string => hasArabic(a));
  const arrows = card.rows.filter((r) => r.ar && !hasArabic(r.ar));
  const [pick, setPick] = useState(0);
  return (
    <div className="space-y-4">
      {arrows.length > 0 && (
        <p className="tile px-4 py-3 text-[28px] tracking-widest" aria-label="Arah menulis">
          {arrows.map((r) => r.ar).join("   ")}
        </p>
      )}
      {glyphs.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2" dir="rtl">
            {glyphs.slice(0, 10).map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setPick(i);
                  say(g);
                }}
                aria-pressed={pick === i}
                className={clsx("tile ar min-h-12 px-3 text-[22px]", pick === i && "tile-selected")}
              >
                {g}
              </button>
            ))}
          </div>
          <p className="text-[15px] font-bold text-ink-soft">Telusuri hurufnya dengan jari</p>
          <TracePad guide={glyphs[Math.min(pick, glyphs.length - 1)]} />
          {showId && card.rows[pick]?.id && <p className="text-[16px] text-ink-soft">{card.rows[pick].id}</p>}
        </>
      )}
    </div>
  );
}
