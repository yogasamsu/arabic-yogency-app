"use client";

import { Volume2 } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { AudioRef } from "@/lib/content";
import { say } from "@/lib/audio";

export function AudioButton({
  text,
  audio,
  size = "md",
  label = "Putar audio",
  className,
}: {
  text: string;
  audio?: AudioRef | null;
  size?: "md" | "lg";
  label?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={audio ? "Putar suara" : "Suara sintetis (TTS) perangkat"}
      onClick={async () => {
        setPlaying(true);
        await say(text, audio);
        setPlaying(false);
      }}
      className={clsx(
        "btn shrink-0 p-0",
        size === "lg" ? "h-16 w-16 rounded-2xl" : "h-11 min-h-11 w-11 rounded-xl",
        playing ? "btn-primary" : "btn-secondary text-accent",
        className,
      )}
    >
      <Volume2 aria-hidden className={size === "lg" ? "h-8 w-8" : "h-5 w-5"} />
      {!audio && size === "md" && (
        <span className="sr-only"> (suara sintetis)</span>
      )}
    </button>
  );
}
