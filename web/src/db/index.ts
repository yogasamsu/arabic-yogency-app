import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

// Satu pool per instance server (dan dipakai ulang saat hot reload di dev).
export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // sslmode di DATABASE_URL selalu menang (produksi: sslmode=verify-full, lokal: sslmode=disable).
    // Tanpa sslmode, koneksi wajib TLS dengan sertifikat terverifikasi.
    ssl: process.env.DATABASE_URL?.includes("sslmode=") ? undefined : true,
    max: 5,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
