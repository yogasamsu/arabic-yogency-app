"use client";

import { Eraser } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

/** Kanvas sederhana: huruf panduan samar, pengguna menelusurinya dengan jari. */
export function TracePad({ guide }: { guide: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const reset = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const styles = getComputedStyle(document.documentElement);
    ctx.fillStyle = styles.getPropertyValue("--line").trim() || "#ecd9b8";
    const size = Math.min(rect.height * 0.62, (rect.width / Math.max(guide.length, 1)) * 1.6);
    ctx.font = `${size}px ${styles.getPropertyValue("--font-naskh")}, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    ctx.fillText(guide, rect.width / 2, rect.height / 2);
    ctx.strokeStyle = styles.getPropertyValue("--accent").trim() || "#a23e43";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [guide]);

  useEffect(() => {
    // Font Arab mungkin belum termuat saat kanvas pertama digambar.
    document.fonts?.ready.then(reset);
    reset();
  }, [reset]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        aria-label={`Area latihan menulis ${guide}`}
        className="h-52 w-full touch-none rounded-3xl bg-surface ring-1 ring-line"
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = pos(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = pos(e);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
      />
      <button
        type="button"
        onClick={reset}
        className="absolute top-2 left-2 inline-flex min-h-11 items-center gap-1 rounded-full bg-peach px-3 text-[14px] font-semibold text-ink"
      >
        <Eraser aria-hidden className="h-4 w-4" />
        Hapus
      </button>
    </div>
  );
}
