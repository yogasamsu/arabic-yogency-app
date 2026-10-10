import { BookOpen, ChartNoAxesColumn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { grantMembership, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Pilih mode" };

// Tujuan setelah login: admin memilih mode, pelajar langsung belajar.
export default async function MulaiPage() {
  const user = await requireUser();
  await grantMembership(user.id);
  if (!(await isAdmin(user))) redirect("/belajar");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5 py-10">
      <h1 className="text-[30px] font-extrabold">Assalamu&apos;alaikum, {user.name.split(" ")[0]}</h1>
      <p className="text-ink-soft">Masuk sebagai apa hari ini?</p>
      <Link href="/belajar" className="flex items-center gap-4 rounded-2xl border-b-4 border-accent-deep bg-accent p-5 text-accent-ink active:translate-y-1">
        <BookOpen aria-hidden className="h-8 w-8 shrink-0" />
        <span>
          <span className="block text-[20px] font-extrabold">Pelajar</span>
          <span className="block text-[15px] opacity-90">Belajar seperti peserta lain, progres tercatat di akunmu.</span>
        </span>
      </Link>
      <Link href="/admin" className="tile flex items-center gap-4 p-5">
        <ChartNoAxesColumn aria-hidden className="h-8 w-8 shrink-0 text-accent" />
        <span>
          <span className="block text-[20px] font-extrabold">Admin</span>
          <span className="block text-[15px] text-ink-soft">Kunjungan, login, pendaftar, dan progres semua pelajar.</span>
        </span>
      </Link>
    </main>
  );
}
