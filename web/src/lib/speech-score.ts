/** Nilai ucapan: bandingkan transkrip Whisper dengan kalimat target (abaikan harakat). */

const HARAKAT = /[ً-ْٰـ]/g;

export function normAr(s: string) {
  return s
    .replace(HARAKAT, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

const similar = (a: string, b: string) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

export type WordMark = { w: string; ok: boolean };

export function scoreSpeech(target: string, heard: string) {
  const tWords = target.split(/\s+/).filter(Boolean);
  const hNorm = normAr(heard).split(" ").filter(Boolean);
  const used = new Set<number>();
  // Setiap kata target dicocokkan dengan kata terdengar yang paling mirip (urutan maju).
  let cursor = 0;
  const words: WordMark[] = tWords.map((w) => {
    const n = normAr(w);
    if (!n) return { w, ok: true };
    let best = -1;
    let bestSim = 0;
    for (let j = cursor; j < hNorm.length; j++) {
      if (used.has(j)) continue;
      const sim = similar(n, hNorm[j]);
      if (sim > bestSim) {
        bestSim = sim;
        best = j;
      }
    }
    const ok = bestSim >= 0.75;
    if (ok) {
      used.add(best);
      cursor = best + 1;
    }
    return { w, ok };
  });
  const content = words.filter((x) => normAr(x.w));
  const wordScore = content.length ? content.filter((x) => x.ok).length / content.length : 0;
  const charScore = similar(normAr(target).replace(/ /g, ""), hNorm.join(""));
  const score = Math.round(100 * (0.7 * wordScore + 0.3 * charScore));
  return { score: Math.max(0, Math.min(100, score)), words };
}
