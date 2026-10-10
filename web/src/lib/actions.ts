"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { attempts, lessonProgress, reviewItems, studyDays, userPrefs } from "@/db/schema";
import { getLesson, lessonQuestions, questionByKey, XP_LESSON_DONE, XP_PER_CORRECT } from "@/lib/content";
import { dayIn } from "@/lib/dates";
import { setEmailOptOut } from "@/lib/email-optout";
import { getPrefs } from "@/lib/queries";
import { requireMember } from "@/lib/session";
import { schedule } from "@/lib/srs";

export type AnswerResult = { key: string; kind: string; correct: boolean };

// Hasil datang dari browser: pastikan tipenya benar dan panjang teksnya wajar.
const sanitize = (results: AnswerResult[]) =>
  (Array.isArray(results) ? results : [])
    .filter((r) => typeof r?.key === "string")
    .map((r) => ({ key: r.key, kind: String(r.kind ?? "").slice(0, 32), correct: r.correct === true }));

async function addXp(userId: string, tz: string, xp: number, seconds: number) {
  const day = dayIn(tz);
  await db
    .insert(studyDays)
    .values({ userId, day, xp, seconds })
    .onConflictDoUpdate({
      target: [studyDays.userId, studyDays.day],
      set: {
        xp: sql`${studyDays.xp} + ${xp}`,
        seconds: sql`${studyDays.seconds} + ${seconds}`,
      },
    });
}

async function updateReviews(userId: string, allResults: AnswerResult[]) {
  // Latihan ucapan (r:) tidak masuk antrean ulasan.
  const results = allResults.filter((r) => !r.key.startsWith("r:"));
  if (!results.length) return;
  const keys = [...new Set(results.map((r) => r.key))];
  const existing = await db
    .select()
    .from(reviewItems)
    .where(and(eq(reviewItems.userId, userId), inArray(reviewItems.itemKey, keys)));
  const byKey = new Map(existing.map((e) => [e.itemKey, e]));
  for (const key of keys) {
    // Jawaban terakhir untuk kunci ini yang menentukan jadwal.
    const correct = results.filter((r) => r.key === key).every((r) => r.correct);
    const next = schedule(byKey.get(key) ?? null, correct);
    await db
      .insert(reviewItems)
      .values({ userId, itemKey: key, ...next })
      .onConflictDoUpdate({
        target: [reviewItems.userId, reviewItems.itemKey],
        set: next,
      });
  }
}

/** Simpan posisi kartu terakhir supaya pelajaran bisa dilanjutkan. */
export async function saveCardPosition(lessonId: string, cardIndex: number) {
  const user = await requireMember();
  if (!getLesson(lessonId)) return;
  cardIndex = Math.min(Math.max(Math.trunc(Number(cardIndex)) || 0, 0), 1000);
  await db
    .insert(lessonProgress)
    .values({ userId: user.id, lessonId, status: "started", lastCard: cardIndex })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: { lastCard: cardIndex, updatedAt: new Date() },
    });
}

export async function submitQuiz(lessonId: string, results: AnswerResult[], seconds: number) {
  const user = await requireMember();
  const lesson = getLesson(lessonId);
  if (!lesson) throw new Error("Pelajaran tidak ditemukan.");
  const validKeys = new Set(lessonQuestions(lesson).map((q) => q.key));
  const clean = sanitize(results).filter((r) => validKeys.has(r.key)).slice(0, 50);
  const prefs = await getPrefs(user.id);

  if (clean.length) {
    await db.insert(attempts).values(
      clean.map((r) => ({ userId: user.id, lessonId, itemKey: r.key, kind: r.kind, correct: r.correct })),
    );
  }
  await updateReviews(user.id, clean);

  const firstTry = new Map<string, boolean>();
  for (const r of clean) if (!firstTry.has(r.key)) firstTry.set(r.key, r.correct);
  const correctCount = [...firstTry.values()].filter(Boolean).length;
  const score = firstTry.size ? Math.round((correctCount / firstTry.size) * 100) : 0;

  const [prev] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonId)));
  const firstCompletion = prev?.status !== "completed";
  const xp = correctCount * XP_PER_CORRECT + (firstCompletion ? XP_LESSON_DONE : 0);

  await db
    .insert(lessonProgress)
    .values({
      userId: user.id,
      lessonId,
      status: "completed",
      lastCard: 0,
      bestScore: score,
      completedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        status: "completed",
        bestScore: sql`greatest(${lessonProgress.bestScore}, ${score})`,
        completedAt: sql`coalesce(${lessonProgress.completedAt}, now())`,
        updatedAt: new Date(),
      },
    });
  await addXp(user.id, prefs.timezone, xp, Math.min(Math.max(Math.round(Number(seconds)) || 0, 0), 3600));
  revalidatePath("/belajar");
  revalidatePath("/progres");
  return { score, xp, correct: correctCount, total: firstTry.size };
}

export async function submitReview(results: AnswerResult[], seconds: number) {
  const user = await requireMember();
  const clean = sanitize(results).filter((r) => questionByKey(r.key)).slice(0, 50);
  const prefs = await getPrefs(user.id);
  if (clean.length) {
    await db.insert(attempts).values(
      clean.map((r) => ({
        userId: user.id,
        lessonId: questionByKey(r.key)!.lesson.id,
        itemKey: r.key,
        kind: r.kind,
        correct: r.correct,
      })),
    );
  }
  await updateReviews(user.id, clean);
  const xp = clean.filter((r) => r.correct).length * XP_PER_CORRECT;
  await addXp(user.id, prefs.timezone, xp, Math.min(Math.max(Math.round(Number(seconds)) || 0, 0), 3600));
  revalidatePath("/ulasan");
  revalidatePath("/belajar");
  return { xp };
}

export async function updateDailyGoal(xp: number) {
  const user = await requireMember();
  const goal = [20, 30, 50].includes(xp) ? xp : 30;
  await db
    .insert(userPrefs)
    .values({ userId: user.id, dailyGoalXp: goal })
    .onConflictDoUpdate({ target: userPrefs.userId, set: { dailyGoalXp: goal } });
  revalidatePath("/profil");
  revalidatePath("/belajar");
}

/** Toggle di Profil: terima atau tidak email dari admin. */
export async function updateEmailOptIn(wantsEmail: boolean) {
  const user = await requireMember();
  await setEmailOptOut(user.id, !wantsEmail);
  revalidatePath("/profil");
}
