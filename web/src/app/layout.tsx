import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Nunito } from "next/font/google";
import { Tracker } from "@/components/Tracker";
import "./globals.css";

// Nunito: sans bulat, pengganti Feather (font Duolingo) yang tidak tersedia bebas.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const naskh = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Belajar Bahasa Arab — Yogency",
    template: "%s · Belajar Bahasa Arab",
  },
  description:
    "Belajar bahasa Arab mandiri, gratis, sedikit demi sedikit setiap hari: dengar, ucap, baca, tulis.",
  applicationName: "Arabic Yogency",
  // Materi orisinal & pendaftaran terbuka: boleh diindeks mesin pencari.
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: "Arabic", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fef7d6" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1614" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${nunito.variable} ${naskh.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Tracker />
      </body>
    </html>
  );
}
