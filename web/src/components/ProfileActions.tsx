"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { authClient } from "@/lib/auth-client";
import { updateDailyGoal, updateEmailOptIn } from "@/lib/actions";
import { playCorrect, setSfxEnabled, sfxEnabled } from "@/lib/sfx";

export function GoalPicker({ current }: { current: number }) {
  const [goal, setGoal] = useState(current);
  const [pending, start] = useTransition();
  return (
    <fieldset>
      <legend className="font-bold">Target harian</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          { xp: 20, label: "Santai" },
          { xp: 30, label: "Rutin" },
          { xp: 50, label: "Serius" },
        ].map((o) => (
          <button
            key={o.xp}
            type="button"
            aria-pressed={goal === o.xp}
            disabled={pending}
            onClick={() => {
              setGoal(o.xp);
              start(() => updateDailyGoal(o.xp));
            }}
            className={clsx("tile min-h-14 text-[15px] font-extrabold", goal === o.xp && "tile-selected")}
          >
            {o.label}
            <span className="block text-[13px] font-normal text-ink-soft">{o.xp} XP</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/");
        router.refresh();
      }}
      className="btn btn-secondary w-full"
    >
      <LogOut aria-hidden className="h-5 w-5" />
      Keluar
    </button>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="min-h-11 text-[15px] font-semibold text-bad">
        Hapus akun…
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-3xl bg-bad-bg p-4" role="group" aria-label="Konfirmasi hapus akun">
      <p className="text-[16px]">
        Akun dan seluruh progresmu akan dihapus permanen. Ini tidak bisa dibatalkan.
      </p>
      {error && <p role="alert" className="text-bad">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary flex-1">
          Batal
        </button>
        <button
          type="button"
          onClick={async () => {
            const res = await authClient.deleteUser();
            if (res.error) {
              setError("Gagal menghapus. Keluar lalu masuk lagi, kemudian coba ulang.");
              return;
            }
            router.replace("/");
            router.refresh();
          }}
          className="btn btn-bad flex-1"
        >
          Hapus permanen
        </button>
      </div>
    </div>
  );
}

export function SoundToggle() {
  const [on, setOn] = useState(() => (typeof window === "undefined" ? true : sfxEnabled()));
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
      <span>
        <span className="block font-bold">Efek suara</span>
        <span className="block text-[14px] text-ink-soft">Nada petik saat jawaban benar atau salah</span>
      </span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          setSfxEnabled(e.target.checked);
          if (e.target.checked) playCorrect();
        }}
        className="h-6 w-6 accent-[var(--accent)]"
      />
    </label>
  );
}

export function EmailToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
      <span>
        <span className="block font-bold">Email dari pengelola</span>
        <span className="block text-[14px] text-ink-soft">Motivasi, kabar materi baru, dan pengingat belajar</span>
      </span>
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(() => updateEmailOptIn(next));
        }}
        className="h-6 w-6 accent-[var(--accent)]"
      />
    </label>
  );
}
