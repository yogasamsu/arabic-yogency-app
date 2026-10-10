import { BookOpen, Check, Ear, Flame, MessageCircle, PenLine, Repeat, Star, Type, Languages } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { UNITS } from "@/lib/content";
import { getDashboard } from "@/lib/queries";
import { requireMember } from "@/lib/session";

export const metadata: Metadata = { title: "Belajar" };

const SKILL_ICON: Record<string, typeof Star> = {
  Hiwar: MessageCircle,
  Mufradat: Star,
  Tarakib: Type,
  Ashwat: Ear,
  Kalam: MessageCircle,
  "Qira'ah": BookOpen,
  Kitabah: PenLine,
  Huruf: Languages,
};

// Posisi zig-zag seperti skill tree (dalam px dari tengah).
const OFFSETS = [0, -56, -84, -56, 0, 56, 84, 56];

export default async function BelajarPage() {
  const user = await requireMember();
  const d = await getDashboard(user.id);
  const lessons = UNITS.flatMap((u) => u.lessons);
  const next = lessons.find((l) => d.progress[l.id]?.status !== "completed") ?? lessons[0];
  const goalPct = Math.min(100, Math.round((d.todayXp / d.prefs.dailyGoalXp) * 100));

  return (
    <main className="mx-auto max-w-xl px-4 pt-4 pb-28">
      <header className="flex items-center justify-between gap-3">
        <p className="text-[20px] font-black">Assalamu&apos;alaikum, {user.name.split(" ")[0]}</p>
        <div className="flex items-center gap-1.5 text-[18px] font-black text-accent" aria-label={`Streak ${d.streak} hari`}>
          <Flame aria-hidden className={clsx("h-6 w-6", d.streak > 0 ? "fill-accent" : "text-ink-soft")} />
          {d.streak}
        </div>
      </header>

      <section aria-label="Target harian" className="tile mt-4 p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-black">Target hari ini</p>
          <p className="text-[15px] font-bold text-ink-soft tabular-nums">
            {d.todayXp}/{d.prefs.dailyGoalXp} XP
          </p>
        </div>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(goalPct, 3)}%` }} />
        </div>
      </section>

      {d.dueCount > 0 && (
        <Link href="/ulasan" className="btn btn-secondary mt-3 w-full normal-case">
          <Repeat aria-hidden className="h-5 w-5 text-accent" />
          {d.dueCount} kata siap diulas
        </Link>
      )}

      {UNITS.map((unit) => (
        <section key={unit.id} className="mt-6" aria-labelledby={`${unit.id}-title`}>
          <div className="rounded-2xl border-b-4 border-accent-deep bg-accent p-4 text-accent-ink">
            <p className="text-[13px] font-extrabold tracking-wide uppercase opacity-90">
              Jilid {unit.book.toUpperCase()} · Unit {unit.number}
            </p>
            <div className="flex items-end justify-between gap-3">
              <h2 id={`${unit.id}-title`} className="text-[22px] font-black">
                {unit.title_id}
              </h2>
              <p lang="ar" className="ar shrink-0 text-[24px] whitespace-nowrap">
                {unit.title_ar}
              </p>
            </div>
          </div>

          <ol className="mt-8 flex flex-col items-center gap-7">
            {unit.lessons.map((l, i) => {
              const p = d.progress[l.id];
              const done = p?.status === "completed";
              const isNext = l.id === next.id;
              const Icon = SKILL_ICON[l.skill] ?? Star;
              return (
                <li key={l.id} className="flex flex-col items-center" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}>
                  {isNext && (
                    <span className="tile mb-2 px-3 py-1 text-[13px] font-extrabold tracking-wide text-accent uppercase">
                      {p?.status === "started" ? "Lanjutkan" : "Mulai"}
                    </span>
                  )}
                  <Link
                    href={`/belajar/${l.id}`}
                    aria-label={`Dars ${l.dars}: ${l.title_id}${done ? ", selesai" : ""}`}
                    className={clsx(
                      "inline-flex h-[72px] w-[80px] items-center justify-center rounded-[50%] border-b-[6px] transition-transform active:translate-y-1 active:border-b-2",
                      done && "border-good-deep bg-good-strong text-white",
                      isNext && "node-pulse border-accent-deep bg-accent text-accent-ink",
                      !done && !isNext && "border-line bg-peach text-ink-soft",
                    )}
                  >
                    {done ? <Check aria-hidden className="h-9 w-9" strokeWidth={3} /> : <Icon aria-hidden className="h-8 w-8" strokeWidth={2.5} />}
                  </Link>
                  <span className="mt-2 max-w-[10rem] text-center text-[14px] leading-tight font-extrabold">
                    {l.dars}. {l.title_id}
                  </span>
                  {done && (
                    <Link href={`/belajar/${l.id}/latihan`} className="mt-0.5 text-[13px] font-bold text-accent">
                      Latihan ulang · {p.bestScore}%
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <p className="mt-10 text-center text-[14px] text-ink-soft">Unit berikutnya menyusul, in syā Allāh.</p>
    </main>
  );
}
