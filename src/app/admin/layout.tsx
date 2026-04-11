import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/roles";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin — FijiFish" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require authenticated admin
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const role = await getUserRole();
  if (role !== "admin") redirect("/");

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: "var(--bg-primary, #0a0f1a)" }}
    >
      <AdminSidebar />

      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
