export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";

export const metadata = { title: "Track Your Order — FijiFish" };

const ALL_STEPS = [
  { status: "caught",           icon: "🎣", label: "Fish Caught",        desc: "Fresh from Fiji's reefs" },
  { status: "processing",       icon: "🔪", label: "Processing",          desc: "Cleaned and prepared" },
  { status: "packed",           icon: "📦", label: "Packed",              desc: "Packed on ice for travel" },
  { status: "at_airport",       icon: "🏢", label: "At Airport",          desc: "Ready for cargo check-in" },
  { status: "cargo_accepted",   icon: "✅", label: "Cargo Accepted",       desc: "Check-in confirmed" },
  { status: "departed",         icon: "✈️",  label: "Flight Departed",     desc: "Your fish is in the air!" },
  { status: "in_flight",        icon: "🛫", label: "In Flight",           desc: "Crossing the Pacific" },
  { status: "landed",           icon: "🛬", label: "Landed",              desc: "Arrived in Australia" },
  { status: "customs_cleared",  icon: "🇦🇺", label: "Customs Cleared",    desc: "BICON inspection complete" },
  { status: "out_for_delivery", icon: "🚚", label: "Out for Delivery",    desc: "Driver is on the way" },
  { status: "delivered",        icon: "🎉", label: "Delivered",           desc: "Enjoy your fish!" },
] as const;

type StepStatus = typeof ALL_STEPS[number]["status"];

type Update = {
  id: string;
  status: StepStatus;
  note: string | null;
  photo_url: string | null;
  created_at: string;
  village_name: string | null;
};

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=/dashboard/tracking/${orderId}`);

  const supabase = createServerSupabaseClient();

  // Resolve buyer's customer id
  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!dbUser) redirect("/dashboard");

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", dbUser.id)
    .maybeSingle();

  if (!customer) redirect("/dashboard");

  // Fetch the order — validate buyer owns it
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, flight_window_id, flight_windows:flight_window_id(id, flight_date, flight_number, status)")
    .eq("id", orderId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!order) notFound();

  const fw = (order as unknown as {
    flight_windows: { id: string; flight_date: string; flight_number: string | null; status: string } | null;
  }).flight_windows;

  if (!fw) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <p className="text-text-secondary text-sm">No flight window linked to this order.</p>
        <Link href="/dashboard" className="text-ocean-teal text-sm mt-3 block">← Back to orders</Link>
      </div>
    );
  }

  // Fetch all shipment updates for this flight window (all villages = full picture)
  const { data: updateRows } = await supabase
    .from("shipment_updates")
    .select("id, status, note, photo_url, created_at, village_id")
    .eq("flight_window_id", fw.id)
    .order("created_at", { ascending: true });

  // Fetch village names
  const villageIds = [...new Set((updateRows ?? []).map((u) => u.village_id).filter(Boolean))];
  const villageMap: Record<string, string> = {};
  if (villageIds.length > 0) {
    const { data: villages } = await supabase
      .from("villages")
      .select("id, name")
      .in("id", villageIds);
    for (const v of villages ?? []) villageMap[v.id] = v.name;
  }

  const updates: Update[] = (updateRows ?? []).map((u) => ({
    id: u.id,
    status: u.status as StepStatus,
    note: u.note,
    photo_url: u.photo_url,
    created_at: u.created_at,
    village_name: u.village_id ? (villageMap[u.village_id] ?? null) : null,
  }));

  // Find the most recent status posted
  const postedStatuses = new Set(updates.map((u) => u.status));
  const lastPostedIndex = ALL_STEPS.reduce((acc, step, i) => {
    return postedStatuses.has(step.status) ? i : acc;
  }, -1);
  const currentStepIndex = lastPostedIndex;

  // Build a map of status → most recent update (for display)
  const updateByStatus: Record<string, Update> = {};
  for (const u of updates) {
    updateByStatus[u.status] = u; // later entries overwrite earlier — keeps newest
  }

  const flightLabel = new Date(fw.flight_date + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-ocean-teal transition-colors mb-6"
      >
        ← My Orders
      </Link>

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-mono text-ocean-teal uppercase tracking-widest mb-1">
          Order Tracking
        </p>
        <h1 className="text-xl font-bold text-text-primary">Your Shipment</h1>
        <p className="text-sm text-text-secondary mt-1">
          ✈️ {fw.flight_number ?? "FJ-"} · {flightLabel}
        </p>
      </div>

      {/* No updates yet */}
      {updates.length === 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl px-5 py-8 text-center mb-6">
          <span className="text-4xl block mb-3" aria-hidden="true">🌊</span>
          <p className="text-text-secondary text-sm font-semibold">Your fish is being prepared</p>
          <p className="text-text-secondary text-xs mt-1">
            Updates will appear here as your order moves through each stage.
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical track */}
        <div
          className="absolute left-5 top-4 bottom-4 w-0.5 bg-white/10"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-0">
          {ALL_STEPS.map((step, i) => {
            const isDone = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            const isFuture = i > currentStepIndex;
            const update = updateByStatus[step.status];

            return (
              <div key={step.status} className="flex gap-4 relative">
                {/* Icon circle */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-lg border-2 transition-all ${
                    isCurrent
                      ? "border-ocean-teal bg-ocean-teal/10"
                      : isDone
                      ? "border-lagoon-green/50 bg-lagoon-green/5"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                  style={isCurrent ? { boxShadow: "0 0 12px rgba(79,195,247,0.3)" } : undefined}
                >
                  <span
                    style={{
                      filter: isFuture ? "grayscale(1) opacity(0.3)" : undefined,
                    }}
                    aria-hidden="true"
                  >
                    {step.icon}
                  </span>
                </div>

                {/* Content */}
                <div
                  className={`flex-1 min-w-0 pb-6 ${
                    isFuture ? "opacity-30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 pt-1.5">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          isCurrent
                            ? "text-ocean-teal"
                            : isDone
                            ? "text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        {step.label}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-mono bg-ocean-teal/15 text-ocean-teal px-1.5 py-0.5 rounded-full">
                            NOW
                          </span>
                        )}
                      </p>
                      {!update && (
                        <p className="text-xs text-text-secondary/50 mt-0.5">{step.desc}</p>
                      )}
                      {update?.note && (
                        <p className="text-xs text-text-secondary mt-0.5">{update.note}</p>
                      )}
                      {update?.village_name && (
                        <p className="text-[10px] text-text-secondary/60 font-mono mt-0.5">
                          {update.village_name}
                        </p>
                      )}
                    </div>
                    {update && (
                      <span className="text-[10px] font-mono text-text-secondary/70 whitespace-nowrap shrink-0 pt-0.5">
                        {new Date(update.created_at).toLocaleDateString("en-AU", {
                          day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Photo */}
                  {update?.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={update.photo_url}
                      alt={`${step.label} photo`}
                      loading="lazy"
                      className="mt-2 w-full max-h-48 object-cover rounded-xl border border-white/10"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
