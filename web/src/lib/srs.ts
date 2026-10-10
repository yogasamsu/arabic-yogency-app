/** SM-2 sederhana: benar memperpanjang jeda, salah mengulang besok. */
export type SrsState = { intervalDays: number; ease: number; reps: number; lapses: number };

export function schedule(prev: SrsState | null, correct: boolean, now = new Date()) {
  const s: SrsState = prev ?? { intervalDays: 0, ease: 2.5, reps: 0, lapses: 0 };
  let { intervalDays, ease, reps, lapses } = s;
  if (correct) {
    reps += 1;
    intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(intervalDays * ease);
    ease = Math.min(3, ease + 0.1);
  } else {
    lapses += 1;
    reps = 0;
    intervalDays = 1;
    ease = Math.max(1.3, ease - 0.2);
  }
  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { intervalDays, ease, reps, lapses, dueAt };
}
