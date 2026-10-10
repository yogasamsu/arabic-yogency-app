import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Belajar Bahasa Arab — Yogency",
    short_name: "Arabic",
    description: "Belajar bahasa Arab mandiri, gratis, sedikit demi sedikit setiap hari.",
    start_url: "/belajar",
    display: "standalone",
    background_color: "#fef7d6",
    theme_color: "#fef7d6",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
