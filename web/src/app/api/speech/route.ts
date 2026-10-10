import { headers } from "next/headers";
import { Agent, fetch as undiciFetch, FormData as UndiciFormData } from "undici";
import { auth } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { scoreSpeech } from "@/lib/speech-score";

// Server Whisper memakai CA internal Caddy. Bila STT_CA_CERT (PEM root CA) diisi, hanya CA itu
// yang dipercaya; sertifikatnya diterbitkan untuk IP internal kontainer, jadi nama host tidak dicocokkan.
// Tanpa STT_CA_CERT, sertifikat diverifikasi seperti biasa (cocok untuk sertifikat publik).
const sttCa = process.env.STT_CA_CERT?.replaceAll("\\n", "\n");
const sttAgent = sttCa ? new Agent({ connect: { ca: sttCa, checkServerIdentity: () => undefined } }) : undefined;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.STT_URL || !process.env.STT_TOKEN) {
    return Response.json({ error: "stt_unavailable" }, { status: 503 });
  }
  // Satu rekaman butuh beberapa detik CPU di VPS: batasi per pengguna.
  if (!(await allow(`speech:${session.user.id}`, 20, 60))) {
    return Response.json({ error: "too_many" }, { status: 429 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  const target = String(form.get("target") ?? "").slice(0, 300);
  if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ error: "no_audio" }, { status: 400 });
  if (audio.size > 2_000_000) return Response.json({ error: "too_large" }, { status: 413 });

  const out = new UndiciFormData();
  out.append("file", audio, "speech.webm");
  out.append("response_format", "json");
  out.append("temperature", "0");

  let text = "";
  try {
    const res = await undiciFetch(process.env.STT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STT_TOKEN}` },
      body: out,
      signal: AbortSignal.timeout(20_000),
      dispatcher: sttAgent,
    });
    if (!res.ok) throw new Error(`stt ${res.status}`);
    text = String(((await res.json()) as { text?: string }).text ?? "").trim();
  } catch {
    return Response.json({ error: "stt_failed" }, { status: 502 });
  }

  if (!target) return Response.json({ transcript: text });
  return Response.json({ transcript: text, ...scoreSpeech(target, text) });
}
