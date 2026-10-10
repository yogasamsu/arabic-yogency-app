import { Repeat } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LessonFlow } from "@/components/LessonFlow";
import { questionByKey, type Question } from "@/lib/content";
import { getDueKeys } from "@/lib/queries";
import { newSeed } from "@/lib/seed";
import { requireMember } from "@/lib/session";

export const metadata: Metadata = { title: "Ulasan" };

export default async function UlasanPage() {
  const user = await requireMember();
  const keys = await getDueKeys(user.id, 12);
  const questions = keys.map((k) => questionByKey(k)?.q).filter((q): q is Question => !!q);

  if (questions.length === 0) {
    return (
      <main className="mx-auto flex min-h-[80dvh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <Repeat aria-hidden className="h-14 w-14 text-accent" />
        <h1 className="text-[26px] font-extrabold">Belum ada yang perlu diulas</h1>
        <p className="text-ink-soft">
          Kata dan kalimat dari latihan akan muncul di sini sesuai jadwal: besok, 3 hari lagi, lalu makin jarang saat kamu makin hafal.
        </p>
        <Link href="/belajar" className="btn btn-primary">
          Lanjut belajar
        </Link>
      </main>
    );
  }

  return <LessonFlow steps={questions.map((q) => ({ t: "q" as const, q }))} seed={newSeed()} mode={{ kind: "review" }} />;
}
