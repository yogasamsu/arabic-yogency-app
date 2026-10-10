import { BottomNav } from "@/components/BottomNav";
import { getDashboard } from "@/lib/queries";
import { requireMember } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireMember();
  const { dueCount } = await getDashboard(user.id);
  return (
    <>
      {children}
      <BottomNav dueCount={dueCount} />
    </>
  );
}
