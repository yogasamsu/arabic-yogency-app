import type { Metadata } from "next";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { reviewItems } from "@/db/schema";
import { ALL_LESSONS } from "@/lib/content";
import { addDays } from "@/lib/dates";
import { getDashboard } from "@/lib/queries";
import { requireMember } from "@/lib/session";

export const metadata: Metadata = { title: "Progres" };

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default async function ProgresPage() {
  const user = await requireMember();
  const d = await getDashboard(user.id);
  const [words] = await db.select({ n: count() }).from(reviewItems).where(eq(reviewItems.userId, user.id));
  const done = ALL_LESSONS.filter((l) => d.progress[l.id]?.status === "completed").length;
  const accuracy = d.attempts ? Math.round((d.correct / d.attempts) * 100) : null;

  const week = Array.from({ length: 7 }, (_, i) => addDays(d.today, i - 6));
  const xpByDay = new Map(d.days.map((x) => [x.day, x.xp]));
  const maxXp = Math.max(d.prefs.dailyGoalXp, ...week.map((w) => xpByDay.get(w) ?? 0));

  const stats = [
    { label: "Streak", value: `${d.streak} hari` },
    { label: "Total XP", value: d.totalXp },
    { label: "Pelajaran selesai", value: `${done}/${ALL_LESSONS.length}` },
    { label: "Kata & kalimat dilatih", value: words?.n ?? 0 },
    { label: "Akurasi jawaban", value: accuracy === null ? "–" : `${accuracy}%` },
    { label: "Perlu diulas", value: d.dueCount },
  ];

  return (
    <main className="mx-auto max-w-xl px-4 pt-6 pb-28">
      <h1 className="text-[28px] font-extrabold">Progres</h1>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="tile p-4">
            <dt className="text-[14px] text-ink-soft">{s.label}</dt>
            <dd className="mt-1 text-[24px] font-extrabold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section className="tile mt-6 p-4" aria-labelledby="week-title">
        <h2 id="week-title" className="font-bold">
          XP 7 hari terakhir
        </h2>
        <p className="text-[14px] text-ink-soft">Garis putus-putus: target harian {d.prefs.dailyGoalXp} XP</p>
        <div className="relative mt-4 flex h-40 items-end gap-2">
          <div
            aria-hidden
            className="absolute inset-x-0 border-t-2 border-dashed border-rose"
            style={{ bottom: `${(d.prefs.dailyGoalXp / maxXp) * 100}%` }}
          />
          {week.map((day) => {
            const xp = xpByDay.get(day) ?? 0;
            const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
            return (
              <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[12px] text-ink-soft tabular-nums">{xp || ""}</span>
                <div
                  className={day === d.today ? "w-full rounded-t-lg bg-accent" : "w-full rounded-t-lg bg-blush"}
                  style={{ height: `${Math.max(4, (xp / maxXp) * 100)}%` }}
                  title={`${day}: ${xp} XP`}
                />
                <span className="text-[13px] text-ink-soft">{DAY_NAMES[dow]}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
