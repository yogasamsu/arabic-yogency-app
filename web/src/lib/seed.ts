import { randomInt } from "node:crypto";

/** Benih acak per permintaan untuk mengacak urutan pilihan jawaban. */
export function newSeed() {
  return randomInt(2 ** 31);
}
