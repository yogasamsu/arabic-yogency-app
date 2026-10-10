import { verifyUnsubscribeToken } from "@/lib/email";
import { setEmailOptOut } from "@/lib/email-optout";

// Berhenti langganan sekali klik (RFC 8058): klien email mengirim POST ke URL
// di header List-Unsubscribe tanpa membuka halaman.
export async function POST(req: Request) {
  const userId = verifyUnsubscribeToken(new URL(req.url).searchParams.get("t"));
  if (!userId) return new Response("Tautan tidak valid.", { status: 400 });
  try {
    await setEmailOptOut(userId, true);
  } catch {
    // Pengguna sudah dihapus: tidak ada yang perlu dihentikan.
  }
  return new Response("Berhasil berhenti berlangganan.");
}
