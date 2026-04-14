import { redirect } from "next/navigation";
import { isDriver } from "@/lib/roles";
import DriverNav from "@/components/driver/DriverNav";

export const metadata = { title: "FijiFish Driver" };

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isDriver().catch(() => false);
  if (!ok) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary pb-20">
      {children}
      <DriverNav />
    </div>
  );
}
