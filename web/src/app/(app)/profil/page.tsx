import type { Metadata } from "next";
import { DeleteAccount, EmailToggle, GoalPicker, SignOutButton, SoundToggle } from "@/components/ProfileActions";
import Link from "next/link";
import { ContributorCard } from "@/components/ContributorCard";
import { FeedbackLink } from "@/components/FeedbackLink";
import { isAdmin } from "@/lib/admin";
import { getPrefs } from "@/lib/queries";
import { requireMember } from "@/lib/session";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilPage() {
  const user = await requireMember();
  const [prefs, admin] = await Promise.all([getPrefs(user.id), isAdmin(user)]);
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 pt-6 pb-28">
      <header>
        <h1 className="text-[28px] font-extrabold">{user.name}</h1>
        <p className="text-ink-soft">{user.email}</p>
      </header>

      <section className="tile p-4">
        <GoalPicker current={prefs.dailyGoalXp} />
      </section>

      <section className="tile divide-y divide-line p-4 [&>*]:py-1">
        <SoundToggle />
        <EmailToggle initial={!prefs.emailOptOut} />
      </section>

      <section className="tile space-y-2 p-4 text-[16px]">
        <h2 className="font-bold">Tentang</h2>
        <p className="text-ink-soft">
          Proyek nirlaba dan gratis selamanya. Bayarannya cukup doa untuk Yoga dan umat Muslim.
        </p>
        <p className="text-ink-soft">
          Materi orisinal berkonteks Indonesia: tokoh, kota, dan keseharian yang dekat dengan kita.
          Suaranya masih sintetis (TTS); rekaman pengisi suara menyusul, in syā Allāh.
        </p>
      </section>

      {admin && (
        <Link href="/admin" className="btn btn-primary w-full">
          Buka dashboard admin
        </Link>
      )}
      <section className="tile space-y-3 p-4">
        <div>
          <h2 className="font-bold">Punya saran atau menemukan salah?</h2>
          <p className="text-[15px] text-ink-soft">Harakat keliru, audio tidak cocok, atau ide fitur: kabari Yoga langsung.</p>
        </div>
        <FeedbackLink context="profil" />
      </section>

      <ContributorCard />

      <SignOutButton />
      <div className="text-center">
        <DeleteAccount />
      </div>
    </main>
  );
}
