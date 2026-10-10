import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { fmtDay } from "@/components/MiniBars";
import { requireAdmin } from "@/lib/admin";
import { mailConfigured, recipientsFor, varsFor } from "@/lib/email";
import { AUDIENCES, type Audience } from "@/lib/email-template";
import { CampaignActions, EmailComposer } from "./EmailComposer";

export const metadata: Metadata = { title: "Email peserta" };
// Setiap batch pengiriman berjalan sebagai server action di halaman ini.
export const maxDuration = 60;

type CampaignRow = {
  id: number;
  subject: string;
  audience: Audience;
  created_at: string;
  finished_at: string | null;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
};

export default async function EmailPage() {
  const admin = await requireAdmin();
  const audiences = Object.keys(AUDIENCES) as Audience[];
  const [counts, me, campaigns] = await Promise.all([
    Promise.all(audiences.map(async (a) => [a, (await recipientsFor(a)).length] as const)),
    recipientsFor("all", [admin.id]),
    db.execute<CampaignRow>(sql`
      select c.id, c.subject, c.audience, c.created_at::text, c.finished_at::text,
        count(s.user_id)::int as total,
        count(*) filter (where s.status = 'sent')::int as sent,
        count(*) filter (where s.status = 'failed')::int as failed,
        count(*) filter (where s.status = 'skipped')::int as skipped,
        count(*) filter (where s.status in ('pending', 'sending'))::int as pending
      from email_campaigns c left join email_sends s on s.campaign_id = c.id
      group by c.id order by c.created_at desc limit 30`),
  ]);
  const sample = varsFor(me[0] ?? { name: admin.name, completed: 0, xp: 0 });

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-16">
      <Link href="/admin" className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent">
        <ArrowLeft aria-hidden className="h-5 w-5" />
        Analytics
      </Link>
      <h1 className="mt-2 text-[28px] font-extrabold">Email peserta</h1>
      <p className="text-[15px] text-ink-soft">
        Kirim motivasi, kabar, atau pengingat ke peserta. Peserta yang berhenti langganan otomatis dilewati.
      </p>

      {!mailConfigured() && (
        <p role="status" className="mt-4 rounded-2xl bg-bad-bg px-4 py-3 text-[15px] text-bad">
          SMTP belum diatur. Isi env <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>,{" "}
          <code>SMTP_PASS</code>, dan <code>MAIL_FROM</code> di server, lalu deploy ulang. Sampai saat itu tombol kirim
          nonaktif.
        </p>
      )}

      <EmailComposer
        counts={Object.fromEntries(counts) as Record<Audience, number>}
        sample={sample}
        from={process.env.MAIL_FROM ?? "(belum diatur)"}
        canSend={mailConfigured()}
      />

      <h2 className="mt-10 text-[20px] font-extrabold">Riwayat</h2>
      {campaigns.rows.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-soft">Belum ada email yang dikirim.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {campaigns.rows.map((c) => (
            <li key={c.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-bold">{c.subject}</span>
                <span className="text-[14px] text-ink-soft">{fmtDay(c.created_at.slice(0, 10))}</span>
              </div>
              <p className="text-[14px] text-ink-soft tabular-nums">
                {AUDIENCES[c.audience] ?? c.audience} · {c.sent}/{c.total} terkirim
                {c.failed ? ` · ${c.failed} gagal` : ""}
                {c.skipped ? ` · ${c.skipped} dilewati` : ""}
                {c.pending ? ` · ${c.pending} menunggu` : ""}
              </p>
              {(c.pending > 0 || c.failed > 0) && (
                <CampaignActions id={c.id} pending={c.pending} failed={c.failed} canSend={mailConfigured()} />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
