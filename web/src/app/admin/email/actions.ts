"use server";

import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { emailCampaigns, emailSends } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { mailConfigured, recipientsFor, sendOne, varsFor } from "@/lib/email";
import { isAudience } from "@/lib/email-template";

const BATCH = 10;

type Draft = { subject: string; body: string; audience: string };
// Pesan error dikembalikan sebagai nilai: error yang dilempar disamarkan Next di produksi.
type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

function clean(d: Draft) {
  const subject = d.subject.trim().slice(0, 200);
  const body = d.body.trim().slice(0, 20000);
  if (!subject || !body) return fail("Subjek dan isi wajib diisi.");
  if (!isAudience(d.audience)) return fail("Audiens tidak dikenal.");
  if (!mailConfigured()) return fail("SMTP belum diatur di env server.");
  return { ok: true as const, subject, body, audience: d.audience };
}

/** Kirim contoh ke email admin sendiri, dengan data progres admin. */
export async function sendTestEmail(d: Draft): Promise<{ ok: true; to: string } | Fail> {
  const admin = await requireAdmin();
  const c = clean(d);
  if (!c.ok) return c;
  const [me] = await recipientsFor("all", [admin.id]);
  const vars = varsFor(me ?? { name: admin.name, completed: 0, xp: 0 });
  try {
    await sendOne({ id: admin.id, email: admin.email, vars }, `[TES] ${c.subject}`, c.body);
  } catch (e) {
    return fail(`Gagal mengirim: ${errText(e)}`);
  }
  return { ok: true, to: admin.email };
}

/** Buat kampanye dan catat penerimanya. Pengiriman dilakukan bertahap lewat sendCampaignBatch. */
export async function createCampaign(d: Draft): Promise<{ ok: true; id: number; total: number } | Fail> {
  const admin = await requireAdmin();
  const c = clean(d);
  if (!c.ok) return c;
  const { subject, body, audience } = c;
  const people = await recipientsFor(audience);
  if (!people.length) return fail("Tidak ada penerima untuk audiens ini.");
  const id = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(emailCampaigns)
      .values({ subject, body, audience, createdBy: admin.id })
      .returning({ id: emailCampaigns.id });
    await tx.insert(emailSends).values(people.map((p) => ({ campaignId: c.id, userId: p.id, email: p.email })));
    return c.id;
  });
  revalidatePath("/admin/email");
  return { ok: true, id, total: people.length };
}

/** Kirim satu batch. Dipanggil berulang oleh browser admin sampai `remaining` = 0. */
export async function sendCampaignBatch(
  campaignId: number,
): Promise<{ ok: true; remaining: number; sent: number; failed: number } | Fail> {
  await requireAdmin();
  if (!mailConfigured()) return fail("SMTP belum diatur di env server.");
  const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId));
  if (!campaign) return fail("Kampanye tidak ditemukan.");

  // Klaim batch secara atomik supaya dua tab tidak mengirim email yang sama.
  // Baris "sending" yang macet lebih dari 5 menit (mis. fungsi terputus) diklaim ulang.
  const claimable = or(
    eq(emailSends.status, "pending"),
    and(eq(emailSends.status, "sending"), lt(emailSends.sentAt, sql`now() - interval '5 minutes'`)),
  );
  const claimed = await db
    .update(emailSends)
    .set({ status: "sending", sentAt: new Date() })
    .where(
      and(
        eq(emailSends.campaignId, campaignId),
        // Diperiksa ulang oleh Postgres setelah menunggu lock, jadi baris yang sudah
        // diklaim tab lain tidak ikut terkirim dua kali.
        claimable,
        inArray(
          emailSends.userId,
          db
            .select({ id: emailSends.userId })
            .from(emailSends)
            .where(and(eq(emailSends.campaignId, campaignId), claimable))
            .limit(BATCH),
        ),
      ),
    )
    .returning({ userId: emailSends.userId, email: emailSends.email });

  if (claimed.length) {
    // Data progres terbaru; penerima yang sudah berhenti langganan tidak ikut.
    const fresh = new Map((await recipientsFor("all", claimed.map((c) => c.userId))).map((r) => [r.id, r]));
    for (const c of claimed) {
      const r = fresh.get(c.userId);
      const where = and(eq(emailSends.campaignId, campaignId), eq(emailSends.userId, c.userId));
      if (!r) {
        await db.update(emailSends).set({ status: "skipped", error: "berhenti langganan" }).where(where);
        continue;
      }
      try {
        await sendOne({ id: r.id, email: r.email, vars: varsFor(r) }, campaign.subject, campaign.body);
        await db.update(emailSends).set({ status: "sent", sentAt: new Date(), error: null }).where(where);
      } catch (e) {
        await db.update(emailSends).set({ status: "failed", error: errText(e) }).where(where);
      }
    }
  }

  const [{ remaining, sent, failed }] = (
    await db.execute<{ remaining: number; sent: number; failed: number }>(sql`select
        count(*) filter (where status in ('pending', 'sending'))::int as remaining,
        count(*) filter (where status = 'sent')::int as sent,
        count(*) filter (where status = 'failed')::int as failed
      from email_sends where campaign_id = ${campaignId}`)
  ).rows;
  if (remaining === 0 && !campaign.finishedAt) {
    await db.update(emailCampaigns).set({ finishedAt: new Date() }).where(eq(emailCampaigns.id, campaignId));
  }
  return { ok: true, remaining, sent, failed };
}

/** Kembalikan email yang gagal ke antrean supaya bisa dikirim ulang. */
export async function retryFailed(campaignId: number) {
  await requireAdmin();
  await db
    .update(emailSends)
    .set({ status: "pending", error: null })
    .where(and(eq(emailSends.campaignId, campaignId), eq(emailSends.status, "failed")));
  await db.update(emailCampaigns).set({ finishedAt: null }).where(eq(emailCampaigns.id, campaignId));
  revalidatePath("/admin/email");
}
