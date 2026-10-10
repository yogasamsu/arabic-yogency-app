import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Masuk" };

export default async function Page() {
  if (await getSession()) redirect("/mulai");
  return <AuthForm mode="signin" googleEnabled={!!process.env.GOOGLE_CLIENT_ID} />;
}
