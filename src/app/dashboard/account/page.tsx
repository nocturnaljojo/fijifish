import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";

export const metadata = { title: "Account — FijiFish" };

export default async function DashboardAccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard/account");

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const fullName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  const supabase = createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, phone, created_at")
    .eq("clerk_id", userId)
    .maybeSingle();

  const { data: customer } = dbUser
    ? await supabase
        .from("customers")
        .select("delivery_address, nationality, preferred_notification_channel")
        .eq("user_id", dbUser.id)
        .maybeSingle()
    : { data: null };

  const memberSince = dbUser?.created_at
    ? new Date(dbUser.created_at).toLocaleDateString("en-AU", {
        month: "long",
        year: "numeric",
      })
    : null;

  const fields: { label: string; value: string | null; placeholder: string }[] = [
    { label: "Full Name",         value: fullName,                           placeholder: "Set in Clerk → Profile" },
    { label: "Email",             value: email,                              placeholder: "—" },
    { label: "Phone",             value: dbUser?.phone ?? null,              placeholder: "Not on file" },
    { label: "Delivery Address",  value: customer?.delivery_address ?? null, placeholder: "Saved after first order" },
    { label: "Member Since",      value: memberSince,                        placeholder: "—" },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-10">
      <div className="mb-6">
        <p className="text-[10px] font-mono text-ocean-teal uppercase tracking-widest mb-1">
          Dashboard
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Account</h1>
      </div>

      <div
        className="rounded-xl overflow-hidden border"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        {fields.map((f, i) => (
          <div
            key={f.label}
            className={`px-4 py-4 ${i < fields.length - 1 ? "border-b" : ""}`}
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
              {f.label}
            </p>
            {f.value ? (
              <p className="text-sm text-text-primary">{f.value}</p>
            ) : (
              <p className="text-sm text-text-secondary italic">{f.placeholder}</p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-text-secondary font-mono mt-4 text-center">
        To update your name or email, use the account menu in the top navigation.
      </p>
    </div>
  );
}
