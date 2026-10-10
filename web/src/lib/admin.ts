import "server-only";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { account, betaAccess } from "@/db/schema";
import { adminEmails } from "@/lib/auth";
import { getSession } from "@/lib/session";

/** Admin = email terdaftar di ADMIN_EMAILS, terverifikasi, dan tertaut ke akun Google. */
export async function isAdmin(user: { id: string; email: string; emailVerified: boolean }) {
  if (!user.emailVerified || !adminEmails().includes(user.email.toLowerCase())) return false;
  const [google] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "google")));
  return !!google;
}

export async function requireAdmin() {
  const session = await getSession();
  // 404, bukan 403: jangan beri tahu bahwa halaman ini ada.
  if (!session || !(await isAdmin(session.user))) notFound();
  // Admin otomatis punya akses beta.
  await db.insert(betaAccess).values({ userId: session.user.id }).onConflictDoNothing();
  return session.user;
}
