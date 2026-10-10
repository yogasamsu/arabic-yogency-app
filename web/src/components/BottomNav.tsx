"use client";

import { BookOpen, ChartNoAxesColumn, Repeat, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/belajar", label: "Belajar", Icon: BookOpen },
  { href: "/ulasan", label: "Ulasan", Icon: Repeat },
  { href: "/progres", label: "Progres", Icon: ChartNoAxesColumn },
  { href: "/profil", label: "Profil", Icon: UserRound },
];

export function BottomNav({ dueCount }: { dueCount: number }) {
  const pathname = usePathname();
  // Saat pelajaran/latihan berjalan, navigasi disembunyikan agar fokus.
  if (/^\/belajar\/[^/]+/.test(pathname)) return null;
  return (
    <nav
      aria-label="Navigasi utama"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-bg"
    >
      <ul className="mx-auto flex max-w-xl">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 pt-2 text-[12px] font-extrabold tracking-wide uppercase",
                  active ? "text-accent" : "text-ink-soft",
                )}
              >
                <Icon aria-hidden className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
                {label}
                {href === "/ulasan" && dueCount > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-2 rounded-full bg-accent px-1.5 text-[11px] leading-5 text-accent-ink">
                    {dueCount > 99 ? "99+" : dueCount}
                    <span className="sr-only"> kata perlu diulas</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
