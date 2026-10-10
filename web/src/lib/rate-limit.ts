import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** IP klien. Di Vercel kedua header ini diisi oleh Vercel sendiri, bukan oleh klien. */
export function clientIp(h: Headers) {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Jendela waktu tetap: true selama `key` dipakai paling banyak `max` kali per `windowSec` detik.
 * Memakai tabel rate_limit milik Better Auth dengan awalan "app:" supaya kuncinya tidak bentrok.
 */
export async function allow(key: string, max: number, windowSec: number) {
  const now = Date.now();
  const start = now - windowSec * 1000;
  const res = await db.execute<{ count: number }>(sql`
    insert into rate_limit (id, key, count, last_request)
    values (gen_random_uuid()::text, ${`app:${key}`}, 1, ${now})
    on conflict (key) do update set
      count = case when rate_limit.last_request < ${start} then 1 else rate_limit.count + 1 end,
      last_request = case when rate_limit.last_request < ${start} then ${now} else rate_limit.last_request end
    returning count`);
  // Sesekali buang penghitung lama supaya tabelnya tidak terus tumbuh.
  if (Math.random() < 0.01) await db.execute(sql`delete from rate_limit where last_request < ${now - 86_400_000}`);
  return Number(res.rows[0]?.count ?? 0) <= max;
}
