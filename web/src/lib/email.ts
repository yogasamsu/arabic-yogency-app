import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ALL_LESSONS } from "@/lib/content";
import { addDays, dayIn } from "@/lib/dates";
import { renderEmail, type Audience, type EmailVars } from "@/lib/email-template";

/**
 * Pengiriman lewat SMTP biasa (Brevo, Amazon SES, dll.), jadi penyedia bisa
 * diganti cukup lewat env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 * MAIL_FROM (mis. "Arabic Yogency <admin@yogency.work>"), MAIL_REPLY_TO (opsional).
 */
export function mailConfigured() {
  return !!process.env.SMTP_HOST && !!process.env.MAIL_FROM;
}

const globalForMail = globalThis as unknown as { transporter?: Transporter };

function transporter() {
  if (!globalForMail.transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    globalForMail.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      pool: true,
      maxConnections: 2,
    });
  }
  return globalForMail.transporter;
}

export const appUrl = () => (process.env.BETTER_AUTH_URL ?? "https://arabic.yogency.work").replace(/\/$/, "");

// Token berhenti langganan: userId + HMAC, tanpa perlu tabel token.
const sign = (userId: string) =>
  createHmac("sha256", `${process.env.BETTER_AUTH_SECRET}:email-unsub`).update(userId).digest("base64url").slice(0, 32);

export function unsubscribeToken(userId: string) {
  return `${Buffer.from(userId).toString("base64url")}.${sign(userId)}`;
}

export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  const [idPart, sig] = (token ?? "").split(".");
  if (!idPart || !sig) return null;
  const userId = Buffer.from(idPart, "base64url").toString();
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? userId : null;
}

export type Recipient = { id: string; name: string; email: string; completed: number; xp: number };

const audienceFilter = (a: Audience, weekAgo: string) => {
  const studiedThisWeek = sql`exists(select 1 from study_days s where s.user_id = u.id and s.day >= ${weekAgo})`;
  const started = sql`exists(select 1 from lesson_progress lp where lp.user_id = u.id)`;
  switch (a) {
    case "active7":
      return studiedThisWeek;
    case "inactive7":
      return sql`${started} and not ${studiedThisWeek}`;
    case "not_started":
      return sql`not ${started}`;
    default:
      return sql`true`;
  }
};

/** Peserta beta yang belum berhenti langganan, disaring menurut audiens. */
export async function recipientsFor(audience: Audience, onlyUserIds?: string[]): Promise<Recipient[]> {
  const weekAgo = addDays(dayIn("Asia/Jakarta"), -6);
  const idFilter = onlyUserIds ? sql`u.id in (${sql.join(onlyUserIds.map((id) => sql`${id}`), sql`, `)})` : sql`true`;
  const res = await db.execute<Recipient>(sql`
    select u.id, u.name, u.email,
      (select count(*) from lesson_progress lp where lp.user_id = u.id and lp.status = 'completed')::int as completed,
      (select coalesce(sum(xp), 0) from study_days s where s.user_id = u.id)::int as xp
    from "user" u
    join beta_access b on b.user_id = u.id
    left join user_prefs p on p.user_id = u.id
    where coalesce(p.email_opt_out, false) = false
      and ${audienceFilter(audience, weekAgo)}
      and ${idFilter}
    order by u.created_at`);
  return res.rows;
}

export const varsFor = (r: Pick<Recipient, "name" | "completed" | "xp">): EmailVars => ({
  nama: r.name,
  selesai: r.completed,
  total: ALL_LESSONS.length,
  xp: r.xp,
});

export async function sendOne(to: { id: string; email: string; vars: EmailVars }, subject: string, body: string) {
  const unsubscribeUrl = `${appUrl()}/berhenti-email?t=${unsubscribeToken(to.id)}`;
  const mail = renderEmail({ subject, body, vars: to.vars, appUrl: appUrl(), unsubscribeUrl });
  await transporter().sendMail({
    from: process.env.MAIL_FROM,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
    to: to.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    headers: {
      // Berhenti langganan sekali klik (RFC 8058), dipakai Gmail/Yahoo.
      "List-Unsubscribe": `<${appUrl()}/api/email/unsubscribe?t=${unsubscribeToken(to.id)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
