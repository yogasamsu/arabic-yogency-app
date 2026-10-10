import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

// Status per pelajaran (dars) per pengguna.
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    status: text("status", { enum: ["started", "completed"] }).notNull(),
    lastCard: integer("last_card").notNull().default(0),
    bestScore: integer("best_score").notNull().default(0),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

// Setiap jawaban latihan, untuk statistik akurasi.
export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    itemKey: text("item_key").notNull(),
    kind: text("kind").notNull(),
    correct: boolean("correct").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("attempts_user_idx").on(t.userId, t.createdAt)],
);

// Antrean ulasan kosakata (spaced repetition sederhana).
export const reviewItems = pgTable(
  "review_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    dueAt: timestamp("due_at").notNull(),
    intervalDays: real("interval_days").notNull().default(0),
    ease: real("ease").notNull().default(2.5),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemKey] }),
    index("review_due_idx").on(t.userId, t.dueAt),
  ],
);

// Satu baris per hari belajar, untuk streak dan target harian.
export const studyDays = pgTable(
  "study_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    xp: integer("xp").notNull().default(0),
    seconds: integer("seconds").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

export const userPrefs = pgTable("user_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dailyGoalXp: integer("daily_goal_xp").notNull().default(30),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  showTranslit: boolean("show_translit").notNull().default(true),
  // Berhenti menerima email dari admin (motivasi, pengingat, kabar).
  emailOptOut: boolean("email_opt_out").notNull().default(false),
});

// Akses beta tertutup: diberikan saat daftar dengan kode undangan,
// atau setelah pengguna Google memasukkan kode di /undangan.
export const betaAccess = pgTable("beta_access", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
});

// Kunjungan halaman, anonim (tanpa IP). visitorId = UUID acak di perangkat.
export const pageViews = pgTable(
  "page_views",
  {
    id: serial("id").primaryKey(),
    path: text("path").notNull(),
    visitorId: text("visitor_id").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    device: text("device"),
    referrer: text("referrer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("page_views_created_idx").on(t.createdAt)],
);

// Email massal dari admin. Penerima dicatat saat kampanye dibuat (snapshot),
// lalu dikirim bertahap per batch supaya aman dari batas waktu serverless.
export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

export const emailSends = pgTable(
  "email_sends",
  {
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => emailCampaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    status: text("status", { enum: ["pending", "sending", "sent", "failed", "skipped"] }).notNull().default("pending"),
    error: text("error"),
    sentAt: timestamp("sent_at"),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.userId] }), index("email_sends_status_idx").on(t.campaignId, t.status)],
);
