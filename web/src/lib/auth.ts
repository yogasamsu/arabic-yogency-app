import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { betaAccess } from "@/db/schema";

/** Email admin (dipisah koma). Admin wajib masuk lewat Google. */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}


const googleEnabled =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  trustedOrigins: [
    "https://arabic-yogency.vercel.app",
    "https://arabic.yogency.work",
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
  ],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  session: { expiresIn: 60 * 60 * 24 * 60 },
  user: { deleteUser: { enabled: true } },
  // Di Vercel tiap permintaan bisa jatuh ke instance berbeda, jadi penghitungnya di database.
  // Aturan bawaan: login/daftar 3x per 10 detik per IP; selebihnya 100x per 10 detik.
  rateLimit: { storage: "database" },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      // Email admin tidak boleh didaftarkan dengan password (cegah pengambilalihan).
      const email = (ctx.body as { email?: string } | undefined)?.email?.trim().toLowerCase();
      if (email && adminEmails().includes(email)) {
        throw new APIError("BAD_REQUEST", { message: "Gunakan Masuk dengan Google untuk email ini." });
      }
    }),
    // Pendaftar baru langsung tercatat sebagai peserta.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const userId = ctx.context.newSession?.user.id;
      if (userId) await db.insert(betaAccess).values({ userId }).onConflictDoNothing();
    }),
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
