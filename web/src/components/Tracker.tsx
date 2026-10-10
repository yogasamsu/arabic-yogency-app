"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function visitorId() {
  try {
    let id = localStorage.getItem("vid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("vid", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Catat kunjungan halaman secara anonim (tanpa IP, tanpa cookie pelacak pihak ketiga). */
export function Tracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_TRACK_DEV) return;
    const payload = JSON.stringify({ path: pathname, vid: visitorId(), ref: document.referrer || undefined });
    fetch("/api/track", { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true }).catch(
      () => {},
    );
  }, [pathname]);
  return null;
}
