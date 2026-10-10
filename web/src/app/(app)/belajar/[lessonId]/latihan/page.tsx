import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonFlow } from "@/components/LessonFlow";
import { getLesson } from "@/lib/content";
import { newSeed } from "@/lib/seed";
import { requireMember } from "@/lib/session";

export const metadata: Metadata = { title: "Latihan ulang" };

export default async function PracticePage(props: PageProps<"/belajar/[lessonId]/latihan">) {
  await requireMember();
  const { lessonId } = await props.params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  return (
    <LessonFlow
      steps={lesson.practice.map((q) => ({ t: "q" as const, q }))}
      seed={newSeed()}
      mode={{ kind: "practice", lessonId, title: `Latihan ulang · Dars ${lesson.dars}` }}
    />
  );
}
