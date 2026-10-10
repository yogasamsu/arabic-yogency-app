import { ORISINAL_UNITS } from "@/content/orisinal";

/** Potongan dari track panjang (audio lama) atau satu berkas utuh (audio orisinal, publik). */
export type AudioRef = { track: string; start: number; end: number } | { src: string };

export type Row = {
  ar?: string;
  id?: string;
  speaker_ar?: string;
  img?: string;
  emoji?: string;
  pair_ar?: string;
  letter?: string;
  form?: string;
  audio?: AudioRef | null;
};

export type Card = {
  kind: "dialogue" | "vocab" | "grammar" | "sounds" | "reading" | "writing";
  title_ar?: string;
  instruction_ar?: string;
  instruction_id?: string;
  note_id?: string;
  imgs?: string[];
  section?: { ar?: string; id?: string };
  groups?: { title_ar?: string; note_id?: string; rows?: Row[] }[];
  rows: Row[];
};

export type Prompt = {
  ar?: string;
  id?: string;
  img?: string;
  emoji?: string;
  audio?: AudioRef | null;
  tts?: string;
  autoplay?: boolean;
};

export type Question =
  | { type: "choice"; key: string; instruction: string; prompt: Prompt; answer: string; options: string[]; lang: "ar" | "id"; audioMap?: Record<string, AudioRef> }
  | { type: "arrange"; key: string; instruction: string; prompt: Prompt; answer: string; tokens: string[]; audioMap?: Record<string, AudioRef> }
  | { type: "speak"; key: string; instruction: string; prompt: Prompt; model: { ar: string; id?: string; speaker_ar?: string; audio?: AudioRef }[] }
  | { type: "repeat"; key: string; instruction: string; prompt: Prompt; target: string };

export type Step = { t: "card"; card: Card } | { t: "q"; q: Question };

export type Lesson = {
  id: string;
  dars: number;
  title_id: string;
  skill: string;
  pages: [number, number];
  track: string | null;
  steps: Step[];
  practice: Question[];
};

export type Unit = {
  id: string;
  book: string;
  number: number;
  title_ar: string;
  title_id: string;
  lessons: Lesson[];
};

export const UNITS: Unit[] = ORISINAL_UNITS as unknown as Unit[];

export const ALL_LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);

export function getLesson(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}

export function nextLessonId(id: string): string | null {
  const i = ALL_LESSONS.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < ALL_LESSONS.length ? ALL_LESSONS[i + 1].id : null;
}

export function lessonQuestions(lesson: Lesson): Question[] {
  return [...lesson.steps.flatMap((s) => (s.t === "q" ? [s.q] : [])), ...lesson.practice];
}

export const isGraded = (q: Question) => q.type !== "speak";
/** Soal yang bisa muncul lagi di Ulasan (butuh mikrofon = tidak). */
export const isReviewable = (q: Question) => q.type === "choice" || q.type === "arrange";

/** Soal di seluruh unit, dipakai ulang oleh sesi ulasan. */
export function questionByKey(key: string): { lesson: Lesson; q: Question } | null {
  for (const lesson of ALL_LESSONS) {
    const q = lessonQuestions(lesson).find((x) => x.key === key && isReviewable(x));
    if (q) return { lesson, q };
  }
  return null;
}

export const XP_PER_CORRECT = 2;
export const XP_LESSON_DONE = 10;
