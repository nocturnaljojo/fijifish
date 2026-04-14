import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/dashboard/DashboardNav";

export const metadata = { title: "My Dashboard — FijiFish" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard");

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const fullName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: "#0a0f1a" }}
    >
      <DashboardNav email={email} fullName={fullName} />

      {/* pb-20 reserves space for mobile bottom tab bar */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
