"use client";

import type { AudioRef } from "@/lib/content";

const elements = new Map<string, HTMLAudioElement>();
let active: HTMLAudioElement | null = null;
let stopAt: number | null = null;
let onEnd: (() => void) | null = null;

/** Satu elemen audio per sumber: track buku lama (/api/audio/…) atau berkas orisinal (/audio/o/…). */
function sourceEl(url: string) {
  let el = elements.get(url);
  if (!el) {
    el = new Audio(url);
    el.preload = "auto";
    el.addEventListener("timeupdate", () => {
      if (el === active && stopAt !== null && el.currentTime >= stopAt) {
        el.pause();
        finish();
      }
    });
    el.addEventListener("ended", () => el === active && finish());
    elements.set(url, el);
  }
  return el;
}

const trackEl = (track: string) => sourceEl(`/api/audio/${track}`);

function finish() {
  stopAt = null;
  const cb = onEnd;
  onEnd = null;
  cb?.();
}

// Naik setiap kali pemutaran dibatalkan dari luar (pindah halaman, tutup, dll.),
// supaya rangkaian audio (putar semua dialog) berhenti total.
let generation = 0;

function halt() {
  active?.pause();
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  active = null;
  finish();
}

/** Hentikan semua audio DAN batalkan rangkaian yang sedang berjalan. */
export function stopAll() {
  generation++;
  halt();
}

/** Putar beberapa teks berurutan; berhenti bila stopAll() dipanggil. */
export async function playSequence(
  items: { text: string; audio?: AudioRef | null }[],
  onStep?: (i: number) => void,
) {
  stopAll();
  const g = generation;
  for (let i = 0; i < items.length; i++) {
    if (generation !== g) return;
    onStep?.(i);
    await say(items[i].text, items[i].audio, false, true);
  }
  if (generation === g) onStep?.(-1);
}

/** Muat track lebih awal supaya ketukan pertama langsung berbunyi. */
export function preloadTrack(track: string | null | undefined) {
  if (track) trackEl(track).load();
}

function playClip(ref: AudioRef, rate: number): Promise<void> {
  halt();
  const whole = "src" in ref;
  const el = whole ? sourceEl(ref.src) : trackEl(ref.track);
  active = el;
  el.playbackRate = rate;
  return new Promise((resolve, reject) => {
    const start = () => {
      el.currentTime = whole ? 0 : Math.max(0, ref.start / 1000 - 0.05);
      stopAt = whole ? null : ref.end / 1000 + 0.15;
      onEnd = resolve;
      el.play().catch(reject);
    };
    if (el.readyState >= 1) start();
    else el.addEventListener("loadedmetadata", start, { once: true });
  });
}

function arabicVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "ar-SA") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("ar")) ??
    null
  );
}

export function ttsAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, rate = 0.85): Promise<void> {
  halt();
  return new Promise((resolve) => {
    if (!ttsAvailable()) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA";
    const v = arabicVoice();
    if (v) u.voice = v;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/** Putar audio asli bila ada; jika tidak, bacakan dengan TTS. */
export async function say(text: string, ref?: AudioRef | null, slow = false, inSequence = false) {
  // Ketukan tunggal membatalkan rangkaian yang sedang diputar.
  if (!inSequence) generation++;
  if (ref) {
    try {
      await playClip(ref, slow ? 0.75 : 1);
      return;
    } catch {
      // Gagal memutar (misal belum login atau jaringan): pakai TTS.
    }
  }
  await speak(text, slow ? 0.65 : 0.85);
}
