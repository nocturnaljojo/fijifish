import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserRole, getVillageId } from "@/lib/roles";
import { createPublicSupabaseClient } from "@/lib/supabase";
import { SignOutButton } from "@clerk/nextjs";
import SupplierNav from "@/components/supplier/SupplierNav";

export const metadata = { title: "Supplier Portal — FijiFish" };

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/supplier");

  const role = await getUserRole();

  // Safety gate — middleware should already block this, but belt-and-braces
  if (role !== "supplier" && role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <p className="text-lg font-bold text-gray-900 mb-2">Access denied</p>
          <p className="text-sm text-gray-500">
            This portal is for registered suppliers only. If you believe this is
            a mistake, contact your FijiFish administrator.
          </p>
        </div>
      </div>
    );
  }

  // Resolve village name from session claims
  const villageId = await getVillageId();
  let villageName = "Supplier Portal";

  if (villageId) {
    try {
      const supabase = createPublicSupabaseClient();
      const { data } = await supabase
        .from("villages")
        .select("name")
        .eq("id", villageId)
        .maybeSingle();
      if (data?.name) villageName = data.name;
    } catch {
      // fall back to default label
    }
  } else if (role === "admin") {
    villageName = "Admin View";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top navigation bar ────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14 max-w-xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-gray-900 text-sm shrink-0">FijiFish</span>
            <span className="text-gray-200 text-lg select-none" aria-hidden="true">|</span>
            <span className="text-sm text-cyan-600 font-semibold truncate">{villageName}</span>
          </div>
          <SignOutButton>
            <button
              type="button"
              className="ml-4 shrink-0 text-sm text-gray-500 hover:text-gray-800 font-medium py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </header>

      {/* ── Page content — pb-24 reserves space for bottom tab bar ── */}
      <main className="max-w-xl mx-auto pb-24">{children}</main>

      {/* ── Bottom tab navigation ─────────────────────────────────── */}
      <SupplierNav />
    </div>
  );
}
