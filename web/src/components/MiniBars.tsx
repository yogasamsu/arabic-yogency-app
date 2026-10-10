const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const fmtDay = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;

/** Grafik batang satu seri, 14 hari. Hover/fokus menampilkan nilai; ada tampilan tabel. */
export function MiniBars({ title, unit, data }: { title: string; unit: string; data: { day: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const last = data.at(-1)?.value ?? 0;
  return (
    <figure className="rounded-3xl bg-surface p-4 ring-1 ring-line">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="font-bold">{title}</span>
        <span className="text-[14px] text-ink-soft tabular-nums">
          hari ini {last} · 14 hari {total}
        </span>
      </figcaption>
      <div className="relative mt-3 flex h-28 items-end gap-[2px] border-b border-line" role="img" aria-label={`${title}, 14 hari terakhir, total ${total} ${unit}`}>
        <span className="absolute top-0 left-0 text-[12px] text-ink-soft tabular-nums">{max}</span>
        {data.map((d) => (
          <div key={d.day} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none">
            <div
              className="w-full rounded-t-[4px] bg-accent group-hover:opacity-80 group-focus:opacity-80"
              style={{ height: d.value ? `${(d.value / max) * 100}%` : "2px", opacity: d.value ? 1 : 0.25 }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-[12px] whitespace-nowrap text-bg group-hover:block group-focus:block">
              {fmtDay(d.day)}: {d.value} {unit}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[12px] text-ink-soft">
        <span>{fmtDay(data[0].day)}</span>
        <span>{fmtDay(data.at(-1)!.day)}</span>
      </div>
      <details className="mt-2 text-[14px]">
        <summary className="cursor-pointer text-ink-soft">Lihat tabel</summary>
        <table className="mt-2 w-full tabular-nums">
          <tbody>
            {data.map((d) => (
              <tr key={d.day} className="border-t border-line">
                <td className="py-1">{fmtDay(d.day)}</td>
                <td className="py-1 text-end">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
