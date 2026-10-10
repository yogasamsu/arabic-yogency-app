import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Cek cepat (optimistik): tanpa cookie sesi, arahkan ke halaman masuk.
// Pemeriksaan sesi sesungguhnya tetap dilakukan di server (requireUser).
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/masuk", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/belajar/:path*", "/ulasan/:path*", "/progres/:path*", "/profil/:path*"],
};
