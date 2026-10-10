import { BookOpen, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { fmtDay, MiniBars } from "@/components/MiniBars";
import { requireAdmin } from "@/lib/admin";
import { getAnalytics } from "@/lib/admin-queries";
import { ALL_LESSONS } from "@/lib/content";

export const metadata: Metadata = { title: "Admin" };

const fmtTs = (ts: string | null) => (ts ? fmtDay(ts.slice(0, 10)) : "–");

export default async function AdminPage() {
  await requireAdmin();
  const a = await getAnalytics();
  const t = a.totals;
  const lessonStats = new Map(a.lessons.map((l) => [l.lesson_id, l]));

  const tiles = [
    { label: "Pengguna terdaftar", value: t.users, note: `+${t.new_users_7d} dalam 7 hari` },
    { label: "Peserta", value: t.members, note: "pernah masuk ke halaman belajar" },
    { label: "Pengunjung unik", value: t.visitors_7d, note: `${t.views_7d} kunjungan halaman · 7 hari` },
    { label: "Login", value: t.logins_7d, note: "7 hari terakhir" },
    { label: "Pelajar aktif", value: t.learners_7d, note: "belajar dalam 7 hari" },
    { label: "Pelajaran selesai", value: t.completions, note: `${t.xp_total} XP terkumpul` },
    { label: "Jawaban latihan", value: t.answers, note: `akurasi ${t.accuracy}%` },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-accent">Admin</p>
          <h1 className="text-[28px] font-extrabold">Analytics</h1>
          <p className="text-[14px] text-ink-soft">Per {fmtDay(a.today)}, waktu Jakarta</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/email" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 font-semibold text-accent-ink">
            <Mail aria-hidden className="h-5 w-5" />
            Email peserta
          </Link>
          <Link href="/belajar" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-4 font-semibold">
            <BookOpen aria-hidden className="h-5 w-5" />
            Mode pelajar
          </Link>
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-3xl bg-surface p-4 ring-1 ring-line">
            <dt className="text-[14px] text-ink-soft">{x.label}</dt>
            <dd className="mt-1 text-[28px] font-extrabold tabular-nums">{x.value}</dd>
            <dd className="text-[13px] text-ink-soft">{x.note}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 text-[20px] font-extrabold">14 hari terakhir</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <MiniBars title="Kunjungan halaman" unit="kunjungan" data={a.series.visits} />
        <MiniBars title="Pengunjung unik" unit="pengunjung" data={a.series.visitors} />
        <MiniBars title="Login" unit="login" data={a.series.logins} />
        <MiniBars title="Pelajar aktif" unit="pelajar" data={a.series.learners} />
      </div>

      <h2 className="mt-8 text-[20px] font-extrabold">Progres per pelajaran</h2>
      <p className="text-[14px] text-ink-soft">Batang = pelajar yang menyelesaikan dari yang memulai.</p>
      <ol className="mt-3 space-y-2">
        {ALL_LESSONS.map((l) => {
          const s = lessonStats.get(l.id);
          const started = s?.started ?? 0;
          const completed = s?.completed ?? 0;
          const pct = started ? Math.round((completed / started) * 100) : 0;
          return (
            <li key={l.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-bold">
                  Dars {l.dars}: {l.title_id}
                </span>
                <span className="text-[14px] text-ink-soft tabular-nums">
                  {completed} selesai / {started} mulai
                  {s?.avg_score != null ? ` · skor rata-rata ${s.avg_score}%` : ""}
                  {s?.accuracy != null ? ` · akurasi ${s.accuracy}%` : ""}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-peach" role="img" aria-label={`${pct}% menyelesaikan`}>
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        <ListCard title="Halaman teratas · 7 hari" rows={a.topPages.map((p) => [p.path, p.n])} />
        <ListCard title="Asal pengunjung · 30 hari" rows={a.referrers.map((r) => [r.referrer, r.n])} empty="Belum ada rujukan dari situs lain." />
        <ListCard title="Perangkat · 30 hari" rows={a.devices.map((d) => [d.device === "mobile" ? "HP" : d.device === "desktop" ? "Desktop" : d.device, d.n])} />
      </div>

      <h2 className="mt-8 text-[20px] font-extrabold">Pengguna ({a.users.length})</h2>
      <div className="mt-3 overflow-x-auto rounded-3xl bg-surface ring-1 ring-line">
        <table className="w-full min-w-[720px] text-[14px]">
          <thead className="text-start text-ink-soft">
            <tr>
              {["Nama", "Email", "Login via", "Beta", "Daftar", "Terakhir login", "Terakhir belajar", "Selesai", "XP"].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {a.users.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-3 py-2 font-semibold">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.providers.replace("credential", "email").replace(",", ", ")}</td>
                <td className="px-3 py-2">{u.beta ? "Ya" : "Belum"}</td>
                <td className="px-3 py-2">{fmtTs(String(u.created_at))}</td>
                <td className="px-3 py-2">{fmtTs(u.last_seen)}</td>
                <td className="px-3 py-2">{fmtTs(u.last_study)}</td>
                <td className="px-3 py-2">
                  {u.completed}/{ALL_LESSONS.length}
                </td>
                <td className="px-3 py-2">{u.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] text-ink-soft">
        Kunjungan dicatat anonim (ID acak per perangkat, tanpa IP). Kunjungan saat pengembangan lokal tidak dicatat.
      </p>
    </main>
  );
}

function ListCard({ title, rows, empty = "Belum ada data." }: { title: string; rows: [string, number][]; empty?: string }) {
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-line">
      <h3 className="font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink-soft">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-[14px]">
          {rows.map(([k, n]) => (
            <li key={k} className="flex justify-between gap-2 border-t border-line pt-1">
              <span className="truncate">{k}</span>
              <span className="tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
