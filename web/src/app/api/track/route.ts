import { getSessionCookie } from "better-auth/cookies";
import { db } from "@/db";
import { pageViews } from "@/db/schema";
import { auth } from "@/lib/auth";
import { allow, clientIp } from "@/lib/rate-limit";

const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless/i;

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT.test(ua)) return new Response(null, { status: 204 });
  // Endpoint tanpa login: batasi per IP supaya tabel page_views tidak bisa dibanjiri.
  if (!(await allow(`track:${clientIp(req.headers)}`, 60, 60))) return new Response(null, { status: 429 });

  let body: { path?: string; vid?: string; ref?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const path = String(body.path ?? "").slice(0, 200);
  const vid = String(body.vid ?? "");
  if (!path.startsWith("/") || !/^[0-9a-f-]{36}$/.test(vid)) return new Response(null, { status: 400 });

  let userId: string | null = null;
  if (getSessionCookie(req)) {
    const session = await auth.api.getSession({ headers: req.headers });
    userId = session?.user.id ?? null;
  }
  let referrer: string | null = null;
  try {
    const host = body.ref ? new URL(body.ref).hostname : null;
    referrer = host && !host.endsWith("yogency.work") && !host.endsWith("vercel.app") ? host : null;
  } catch {}

  await db.insert(pageViews).values({
    path,
    visitorId: vid,
    userId,
    device: /mobile|android|iphone/i.test(ua) ? "mobile" : "desktop",
    referrer,
  });
  return new Response(null, { status: 204 });
}
