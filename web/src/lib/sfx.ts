"use client";

/**
 * Efek suara benar/salah bernuansa Arab, disintesis dengan Web Audio (tanpa file).
 * Benar: petikan naik D–F♯–A (warna maqam Hijaz). Salah: dua nada turun yang lembut.
 */
let ctx: AudioContext | null = null;

export function sfxEnabled() {
  try {
    return localStorage.getItem("sfx") !== "0";
  } catch {
    return true;
  }
}

export function setSfxEnabled(v: boolean) {
  try {
    localStorage.setItem("sfx", v ? "1" : "0");
  } catch {}
}

function pluck(ac: AudioContext, freq: number, at: number, dur = 0.45, gain = 0.18) {
  // Suara petik ala oud: gelombang segitiga + harmonik, redaman cepat.
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(3200, at);
  lp.frequency.exponentialRampToValueAtTime(900, at + dur);
  for (const [mult, type, g] of [
    [1, "triangle", 1],
    [2, "sine", 0.35],
    [3, "sine", 0.12],
  ] as const) {
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * mult, at);
    og.gain.value = g;
    o.connect(og).connect(lp);
    o.start(at);
    o.stop(at + dur + 0.05);
  }
  lp.connect(out).connect(ac.destination);
}

function audio() {
  if (typeof window === "undefined" || !sfxEnabled()) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function playCorrect() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  pluck(ac, 293.66, t, 0.35); // D4
  pluck(ac, 369.99, t + 0.09, 0.35); // F#4
  pluck(ac, 440.0, t + 0.18, 0.6, 0.2); // A4
}

export function playWrong() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  pluck(ac, 311.13, t, 0.3, 0.14); // Eb4
  pluck(ac, 277.18, t + 0.16, 0.5, 0.14); // C#4 (setengah nada Hijaz)
}

export function playComplete() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  [293.66, 311.13, 369.99, 392.0, 440.0, 587.33].forEach((f, i) => pluck(ac, f, t + i * 0.11, 0.5, 0.16));
}
