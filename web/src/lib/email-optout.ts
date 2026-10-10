import "server-only";
import { db } from "@/db";
import { userPrefs } from "@/db/schema";

export async function setEmailOptOut(userId: string, optOut: boolean) {
  await db
    .insert(userPrefs)
    .values({ userId, emailOptOut: optOut })
    .onConflictDoUpdate({ target: userPrefs.userId, set: { emailOptOut: optOut } });
}
