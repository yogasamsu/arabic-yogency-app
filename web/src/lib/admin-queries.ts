import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ALL_LESSONS } from "@/lib/content";
import { addDays, dayIn } from "@/lib/dates";

const TZ = "Asia/Jakarta";
// Timestamp disimpan dalam UTC tanpa zona; ubah ke tanggal WIB.
const localDay = (col: string) => sql.raw(`((${col} at time zone 'UTC') at time zone '${TZ}')::date`);

type DayRow = { day: string; n: number };

// Statistik pelajaran hanya untuk materi yang sedang dipakai (riwayat materi lama diabaikan).
const currentLesson = (col: string) =>
  sql`${sql.raw(col)} in (${sql.join(ALL_LESSONS.map((l) => sql`${l.id}`), sql`, `)})`;

async function daily(query: ReturnType<typeof sql>) {
  const res = await db.execute<DayRow>(query);
  return new Map(res.rows.map((r) => [String(r.day).slice(0, 10), Number(r.n)]));
}

export async function getAnalytics() {
  const today = dayIn(TZ);
  const from = addDays(today, -13);
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i));

  const [visits, visitors, logins, learners] = await Promise.all([
    daily(sql`select ${localDay("created_at")} as day, count(*)::int as n from page_views
      where ${localDay("created_at")} >= ${from} group by 1`),
    daily(sql`select ${localDay("created_at")} as day, count(distinct visitor_id)::int as n from page_views
      where ${localDay("created_at")} >= ${from} group by 1`),
    daily(sql`select ${localDay("created_at")} as day, count(*)::int as n from session
      where ${localDay("created_at")} >= ${from} group by 1`),
    daily(sql`select day::text as day, count(distinct user_id)::int as n from study_days
      where day >= ${from} group by 1`),
  ]);

  const series = (m: Map<string, number>) => days.map((d) => ({ day: d, value: m.get(d) ?? 0 }));

  const totals = (
    await db.execute<Record<string, number>>(sql`select
      (select count(*) from "user")::int as users,
      (select count(*) from "user" where created_at > now() - interval '7 days')::int as new_users_7d,
      (select count(*) from beta_access)::int as members,
      (select count(distinct visitor_id) from page_views where created_at > now() - interval '7 days')::int as visitors_7d,
      (select count(*) from page_views where created_at > now() - interval '7 days')::int as views_7d,
      (select count(*) from session where created_at > now() - interval '7 days')::int as logins_7d,
      (select count(distinct user_id) from study_days where day >= ${addDays(today, -6)})::int as learners_7d,
      (select count(*) from lesson_progress where status = 'completed' and ${currentLesson("lesson_id")})::int as completions,
      (select coalesce(sum(xp), 0) from study_days)::int as xp_total,
      (select count(*) from attempts)::int as answers,
      (select coalesce(round(100.0 * avg(case when correct then 1 else 0 end)), 0) from attempts)::int as accuracy`)
  ).rows[0];

  const lessons = (
    await db.execute<{ lesson_id: string; started: number; completed: number; avg_score: number | null; accuracy: number | null }>(sql`
      select lp.lesson_id,
        count(*)::int as started,
        count(*) filter (where lp.status = 'completed')::int as completed,
        round(avg(lp.best_score) filter (where lp.status = 'completed'))::int as avg_score,
        (select round(100.0 * avg(case when a.correct then 1 else 0 end))::int from attempts a where a.lesson_id = lp.lesson_id) as accuracy
      from lesson_progress lp group by lp.lesson_id`)
  ).rows;

  const users = (
    await db.execute<{
      id: string; name: string; email: string; created_at: string; providers: string; beta: boolean;
      completed: number; xp: number; last_study: string | null; last_seen: string | null;
    }>(sql`
      select u.id, u.name, u.email, u.created_at,
        coalesce((select string_agg(distinct provider_id, ',') from account a where a.user_id = u.id), '') as providers,
        exists(select 1 from beta_access b where b.user_id = u.id) as beta,
        (select count(*) from lesson_progress lp where lp.user_id = u.id and lp.status = 'completed' and ${currentLesson("lp.lesson_id")})::int as completed,
        (select coalesce(sum(xp), 0) from study_days s where s.user_id = u.id)::int as xp,
        (select max(day)::text from study_days s where s.user_id = u.id) as last_study,
        (select max(updated_at)::text from session s where s.user_id = u.id) as last_seen
      from "user" u order by u.created_at desc limit 200`)
  ).rows;

  const topPages = (
    await db.execute<{ path: string; n: number }>(sql`select path, count(*)::int as n from page_views
      where created_at > now() - interval '7 days' group by path order by n desc limit 8`)
  ).rows;
  const referrers = (
    await db.execute<{ referrer: string; n: number }>(sql`select referrer, count(distinct visitor_id)::int as n from page_views
      where created_at > now() - interval '30 days' and referrer is not null group by referrer order by n desc limit 8`)
  ).rows;
  const devices = (
    await db.execute<{ device: string; n: number }>(sql`select coalesce(device, 'lainnya') as device, count(distinct visitor_id)::int as n
      from page_views where created_at > now() - interval '30 days' group by 1 order by n desc`)
  ).rows;

  return {
    today,
    totals,
    series: {
      visits: series(visits),
      visitors: series(visitors),
      logins: series(logins),
      learners: series(learners),
    },
    lessons,
    users,
    topPages,
    referrers,
    devices,
  };
}
