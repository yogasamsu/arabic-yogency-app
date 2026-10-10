import "server-only";
import { and, count, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, lessonProgress, reviewItems, studyDays, userPrefs } from "@/db/schema";
import { UNITS } from "@/lib/content";
import { computeStreak, dayIn } from "@/lib/dates";

/**
 * Hanya kunci soal dari materi yang sedang dipakai. Riwayat lama (mis. materi ABY yang sudah diganti)
 * tetap tersimpan, tetapi tidak boleh memenuhi antrean ulasan.
 */
const currentKeys = () => or(...UNITS.map((u) => like(reviewItems.itemKey, `${u.id}-%`)));

export async function getPrefs(userId: string) {
  const [p] = await db.select().from(userPrefs).where(eq(userPrefs.userId, userId));
  return p ?? { userId, dailyGoalXp: 30, timezone: "Asia/Jakarta", showTranslit: true, emailOptOut: false };
}

export async function getDashboard(userId: string) {
  const prefs = await getPrefs(userId);
  const today = dayIn(prefs.timezone);
  const [progress, days, due, totals] = await Promise.all([
    db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)),
    db
      .select({ day: studyDays.day, xp: studyDays.xp })
      .from(studyDays)
      .where(eq(studyDays.userId, userId))
      .orderBy(desc(studyDays.day))
      .limit(400),
    db
      .select({ n: count() })
      .from(reviewItems)
      .where(and(eq(reviewItems.userId, userId), lte(reviewItems.dueAt, new Date()), currentKeys())),
    db
      .select({
        total: count(),
        correct: sql<number>`sum(case when ${attempts.correct} then 1 else 0 end)::int`,
      })
      .from(attempts)
      .where(eq(attempts.userId, userId)),
  ]);
  const progressMap = Object.fromEntries(progress.map((p) => [p.lessonId, p]));
  const todayXp = days.find((d) => d.day === today)?.xp ?? 0;
  const totalXp = days.reduce((s, d) => s + d.xp, 0);
  return {
    prefs,
    today,
    progress: progressMap,
    todayXp,
    totalXp,
    streak: computeStreak(
      days.map((d) => d.day),
      today,
    ),
    days,
    dueCount: due[0]?.n ?? 0,
    attempts: totals[0]?.total ?? 0,
    correct: totals[0]?.correct ?? 0,
  };
}

export async function getDueKeys(userId: string, limit = 12) {
  const rows = await db
    .select({ key: reviewItems.itemKey })
    .from(reviewItems)
    .where(and(eq(reviewItems.userId, userId), lte(reviewItems.dueAt, new Date()), currentKeys()))
    .orderBy(reviewItems.dueAt)
    .limit(limit);
  return rows.map((r) => r.key);
}

export async function getWeekXp(userId: string, fromDay: string) {
  return db
    .select({ day: studyDays.day, xp: studyDays.xp })
    .from(studyDays)
    .where(and(eq(studyDays.userId, userId), gte(studyDays.day, fromDay)));
}
