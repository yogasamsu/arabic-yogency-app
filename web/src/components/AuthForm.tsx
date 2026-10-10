"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const field =
  "min-h-13 w-full rounded-xl border-2 border-line bg-surface px-4 text-[17px] text-ink placeholder:text-ink-soft/70 focus:border-accent focus:outline-none";

export function AuthForm({ mode, googleEnabled }: { mode: "signin" | "signup"; googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password"));
    const res =
      mode === "signin"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            password,
            name: String(f.get("name")).trim(),
          });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message ?? "";
      setError(
        /invalid email or password|credential/i.test(msg)
            ? "Email atau kata sandi salah."
            : /already exists|exist/i.test(msg)
              ? "Email ini sudah terdaftar. Silakan masuk."
              : /password.*short|too short/i.test(msg)
                ? "Kata sandi minimal 8 karakter."
                : msg || "Terjadi kesalahan. Coba lagi.",
      );
      return;
    }
    router.replace("/mulai");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-[32px] font-black">{mode === "signin" ? "Masuk" : "Daftar"}</h1>
      <p className="mt-1 text-ink-soft">
        {mode === "signin"
          ? "Lanjutkan belajarmu."
          : "Gratis selamanya. Cukup nama, email, dan kata sandi."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <label className="block space-y-1">
              <span className="text-[15px] font-semibold">Nama panggilan</span>
              <input name="name" required autoComplete="nickname" className={field} placeholder="Misal: Yoga" />
            </label>
          </>
        )}
        <label className="block space-y-1">
          <span className="text-[15px] font-semibold">Email</span>
          <input name="email" type="email" required autoComplete="email" inputMode="email" className={field} />
        </label>
        <label className="block space-y-1">
          <span className="text-[15px] font-semibold">Kata sandi</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={field}
          />
          {mode === "signup" && <span className="text-[14px] text-ink-soft">Minimal 8 karakter.</span>}
        </label>

        {error && (
          <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-[16px] text-bad">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary w-full"
        >
          {busy ? "Sebentar…" : mode === "signin" ? "Masuk" : "Buat akun"}
        </button>
      </form>

      {googleEnabled && (
        <button
          type="button"
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/mulai" })}
          className="btn btn-secondary mt-3 w-full"
        >
          {mode === "signin" ? "Masuk dengan Google" : "Daftar dengan Google"}
        </button>
      )}

      <p className="mt-6 text-center text-[16px] text-ink-soft">
        {mode === "signin" ? (
          <>
            Belum punya akun?{" "}
            <Link href="/daftar" className="font-semibold text-accent underline-offset-4 hover:underline">
              Daftar
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href="/masuk" className="font-semibold text-accent underline-offset-4 hover:underline">
              Masuk
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
