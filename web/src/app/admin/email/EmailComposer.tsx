"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { AUDIENCES, bodyToHtml, fillVars, PLACEHOLDERS, type Audience, type EmailVars } from "@/lib/email-template";
import { createCampaign, retryFailed, sendCampaignBatch, sendTestEmail } from "./actions";

const field =
  "w-full rounded-xl border-2 border-line bg-surface px-4 text-[17px] text-ink placeholder:text-ink-soft/70 focus:border-accent focus:outline-none";

const errMsg = (e: unknown) => (e instanceof Error && e.message ? e.message : "Koneksi terputus. Coba lagi.");

/** Panggil batch berulang sampai antrean habis, sambil melaporkan sisa. */
async function drain(id: number, onProgress: (remaining: number) => void) {
  for (;;) {
    const res = await sendCampaignBatch(id);
    if (!res.ok) throw new Error(res.error);
    onProgress(res.remaining);
    if (res.remaining === 0) return res;
  }
}

export function EmailComposer({
  counts,
  sample,
  from,
  canSend,
}: {
  counts: Record<Audience, number>;
  sample: EmailVars;
  from: string;
  canSend: boolean;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [progress, setProgress] = useState<{ total: number; remaining: number } | null>(null);

  const draft = { subject, body, audience };
  const ready = canSend && subject.trim() !== "" && body.trim() !== "";
  const n = counts[audience];

  async function run(task: () => Promise<string>) {
    setBusy(true);
    setStatus(null);
    try {
      setStatus({ ok: true, text: await task() });
    } catch (e) {
      setStatus({ ok: false, text: errMsg(e) });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const sendAll = () =>
    run(async () => {
      const res = await createCampaign(draft);
      if (!res.ok) throw new Error(res.error);
      const { id, total } = res;
      setProgress({ total, remaining: total });
      const done = await drain(id, (remaining) => setProgress({ total, remaining }));
      setSubject("");
      setBody("");
      setProgress(null);
      router.refresh();
      if (done.failed) throw new Error(`${done.sent} terkirim, ${done.failed} gagal. Lihat riwayat untuk kirim ulang.`);
      return `Selesai. ${done.sent} email terkirim.`;
    });

  return (
    <section className="mt-6 space-y-4 rounded-3xl bg-surface p-4 ring-1 ring-line">
      <p className="text-[14px] text-ink-soft">
        Dari: <span className="font-semibold text-ink">{from}</span>
      </p>

      <fieldset>
        <legend className="text-[15px] font-semibold">Penerima</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(Object.keys(AUDIENCES) as Audience[]).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={audience === a}
              onClick={() => setAudience(a)}
              className={clsx("tile min-h-14 px-3 py-2 text-start text-[15px]", audience === a && "tile-selected")}
            >
              <span className="block font-bold">{AUDIENCES[a]}</span>
              <span className="block text-[13px] text-ink-soft tabular-nums">{counts[a]} orang</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className="text-[15px] font-semibold">Subjek</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          className={clsx(field, "min-h-13")}
          placeholder="Misal: {nama}, sudah 3 hari nih!"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[15px] font-semibold">Isi</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          className={clsx(field, "py-3 leading-relaxed")}
          placeholder={"Assalamu'alaikum {nama},\n\nKamu sudah menyelesaikan {selesai} dari {total} pelajaran. ..."}
        />
        <span className="block text-[13px] text-ink-soft">
          Teks biasa; baris kosong = paragraf baru, tautan otomatis bisa diklik. Tombol &ldquo;Lanjut belajar&rdquo; dan
          tautan berhenti langganan ditambahkan otomatis. Isian:{" "}
          {PLACEHOLDERS.map((p, i) => (
            <span key={p.tag}>
              {i > 0 && ", "}
              <code className="font-semibold text-ink">{p.tag}</code> {p.desc}
            </span>
          ))}
          .
        </span>
      </label>

      {(subject || body) && (
        <div>
          <p className="text-[15px] font-semibold">Pratinjau (dengan data kamu)</p>
          <div className="mt-1 rounded-2xl bg-bg p-4 ring-1 ring-line">
            <p className="font-bold">{fillVars(subject, sample)}</p>
            <div
              className="mt-2 text-[16px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: bodyToHtml(fillVars(body, sample)) }}
            />
          </div>
        </div>
      )}

      {status && (
        <p
          role={status.ok ? "status" : "alert"}
          className={clsx("rounded-2xl px-4 py-3 text-[15px]", status.ok ? "bg-good-bg text-good" : "bg-bad-bg text-bad")}
        >
          {status.text}
        </p>
      )}

      {progress && busy && (
        <div role="status" aria-live="polite">
          <p className="text-[14px] text-ink-soft tabular-nums">
            Mengirim… {progress.total - progress.remaining}/{progress.total}. Jangan tutup halaman ini.
          </p>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-peach">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${(100 * (progress.total - progress.remaining)) / progress.total}%` }}
            />
          </div>
        </div>
      )}

      {confirming ? (
        <div className="space-y-3 rounded-2xl bg-peach/60 p-4" role="group" aria-label="Konfirmasi kirim">
          <p className="text-[16px]">
            Kirim &ldquo;{subject}&rdquo; ke <strong>{n} peserta</strong> ({AUDIENCES[audience].toLowerCase()})? Email yang
            sudah terkirim tidak bisa ditarik.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary flex-1" disabled={busy}>
              Batal
            </button>
            <button type="button" onClick={sendAll} className="btn btn-primary flex-1" disabled={busy}>
              <Send aria-hidden className="h-5 w-5" />
              Ya, kirim
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn btn-secondary flex-1"
            disabled={!ready || busy}
            onClick={() =>
              run(async () => {
                const res = await sendTestEmail(draft);
                if (!res.ok) throw new Error(res.error);
                return `Email tes terkirim ke ${res.to}.`;
              })
            }
          >
            Kirim tes ke saya
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={!ready || busy || n === 0}
            onClick={() => setConfirming(true)}
          >
            <Send aria-hidden className="h-5 w-5" />
            Kirim ke {n} peserta
          </button>
        </div>
      )}
    </section>
  );
}

/** Lanjutkan kampanye yang terputus, atau kirim ulang yang gagal. */
export function CampaignActions({ id, pending, failed, canSend }: { id: number; pending: number; failed: number; canSend: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async (retry: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (retry) await retryFailed(id);
      await drain(id, () => {});
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
      router.refresh();
    }
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {pending > 0 && (
        <button type="button" className="btn btn-secondary min-h-11 px-4 text-[15px]" disabled={busy || !canSend} onClick={() => go(false)}>
          {busy ? "Mengirim…" : `Lanjutkan (${pending} menunggu)`}
        </button>
      )}
      {failed > 0 && pending === 0 && (
        <button type="button" className="btn btn-secondary min-h-11 px-4 text-[15px]" disabled={busy || !canSend} onClick={() => go(true)}>
          {busy ? "Mengirim…" : `Kirim ulang ${failed} yang gagal`}
        </button>
      )}
      {error && (
        <p role="alert" className="text-[14px] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
