import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { user, userPrefs } from "@/db/schema";
import { verifyUnsubscribeToken } from "@/lib/email";
import { setEmailOptOut } from "@/lib/email-optout";

export const metadata: Metadata = { title: "Berhenti menerima email", robots: { index: false } };

async function update(token: string, optOut: boolean) {
  "use server";
  const userId = verifyUnsubscribeToken(token);
  if (!userId) return;
  await setEmailOptOut(userId, optOut);
  revalidatePath("/berhenti-email");
}

// Halaman ini tidak langsung mengubah apa pun saat dibuka, karena pemindai
// tautan di kotak masuk bisa membuka link otomatis. Perubahan lewat tombol.
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const userId = verifyUnsubscribeToken(t);
  const [row] = userId
    ? await db
        .select({ email: user.email, optOut: userPrefs.emailOptOut })
        .from(user)
        .leftJoin(userPrefs, eq(userPrefs.userId, user.id))
        .where(eq(user.id, userId))
    : [];

  return (
    <main className="mx-auto max-w-md px-4 pt-16 pb-16">
      <div className="tile space-y-4 p-6">
        {!row ? (
          <>
            <h1 className="text-[24px] font-extrabold">Tautan tidak valid</h1>
            <p className="text-ink-soft">
              Tautan ini rusak atau akunnya sudah dihapus. Kamu juga bisa mengatur email dari halaman Profil.
            </p>
          </>
        ) : row.optOut ? (
          <>
            <h1 className="text-[24px] font-extrabold">Kamu sudah berhenti berlangganan</h1>
            <p className="text-ink-soft">
              <span className="font-semibold text-ink">{row.email}</span> tidak akan menerima email motivasi, kabar,
              atau pengingat lagi.
            </p>
            <form action={update.bind(null, t, false)}>
              <button type="submit" className="btn btn-secondary w-full">
                Aktifkan lagi
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-extrabold">Berhenti menerima email?</h1>
            <p className="text-ink-soft">
              <span className="font-semibold text-ink">{row.email}</span> tidak akan menerima email motivasi, kabar,
              atau pengingat dari arabic.yogency.work. Akun dan progresmu tetap aman.
            </p>
            <form action={update.bind(null, t, true)}>
              <button type="submit" className="btn btn-primary w-full">
                Ya, berhenti
              </button>
            </form>
          </>
        )}
        <Link href="/" className="block text-center font-semibold text-accent">
          Ke beranda
        </Link>
      </div>
    </main>
  );
}
