import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { LessonFlow } from "@/components/LessonFlow";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { getLesson, nextLessonId } from "@/lib/content";
import { newSeed } from "@/lib/seed";
import { requireMember } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/belajar/[lessonId]">): Promise<Metadata> {
  const l = getLesson((await props.params).lessonId);
  return { title: l ? `Dars ${l.dars}: ${l.title_id}` : "Pelajaran" };
}

export default async function LessonPage(props: PageProps<"/belajar/[lessonId]">) {
  const { lessonId } = await props.params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  const user = await requireMember();
  const [p] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonId)));
  // Lanjutkan dari langkah terakhir hanya bila pelajaran belum selesai.
  const start = p?.status === "started" ? p.lastCard : 0;
  return (
    <LessonFlow
      steps={lesson.steps}
      seed={newSeed()}
      startIndex={start}
      mode={{
        kind: "lesson",
        lessonId,
        nextLessonId: nextLessonId(lessonId),
        title: `Dars ${lesson.dars} · ${lesson.title_id}`,
        track: lesson.track,
      }}
    />
  );
}
