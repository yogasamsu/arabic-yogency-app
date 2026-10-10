import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // File audio dibaca dari disk oleh route handler; pastikan ikut ter-deploy.
  outputFileTracingIncludes: {
    "/api/audio/[track]": ["./private-audio/**"],
    "/api/img/[name]": ["./private-images/**"],
  },
  // Satu domain utama supaya cookie login & callback Google konsisten.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "arabic-yogency.vercel.app" }],
        destination: "https://arabic.yogency.work/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
