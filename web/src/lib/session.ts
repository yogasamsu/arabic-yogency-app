import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { betaAccess } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Wajib login; jika belum, arahkan ke halaman masuk. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/masuk");
  return session.user;
}

export async function hasBetaAccess(userId: string) {
  const [row] = await db.select().from(betaAccess).where(eq(betaAccess.userId, userId));
  return !!row;
}

/**
 * Wajib login. Sejak materi orisinal (Oktober 2026) pendaftaran terbuka tanpa kode undangan:
 * setiap pengguna yang login otomatis tercatat sebagai peserta (tabel beta_access dipakai
 * sebagai daftar peserta, mis. untuk email).
 */
export async function requireMember() {
  const user = await requireUser();
  await grantMembership(user.id);
  return user;
}

export async function grantMembership(userId: string) {
  await db.insert(betaAccess).values({ userId }).onConflictDoNothing();
}
