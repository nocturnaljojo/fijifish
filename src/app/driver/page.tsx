export const dynamic = "force-dynamic";

import { getSupabaseUser } from "@/lib/supabase-auth";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import RunManager from "./RunManager";
import type { DeliveryRun, DeliveryStop } from "@/types/database";

interface StopWithRelations extends DeliveryStop {
  orders: {
    id: string;
    status: string;
    total_aud_cents: number;
    delivery_address: string | null;
    delivery_notes: string | null;
    order_items: {
      quantity_kg: number;
      fish_species: { name_english: string } | null;
    }[];
  } | null;
  customers: {
    users: { full_name: string | null; phone: string | null } | null;
  } | null;
}

interface RunWithWindow extends DeliveryRun {
  flight_windows: {
    flight_number: string | null;
    flight_date: string;
    canberra_arrival_time: string | null;
  } | null;
}

async function getRunData() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = await getSupabaseUser();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) return { run: null, stops: [] };

  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!driver) return { run: null, stops: [], noDriver: true };

  const { data: run } = await supabase
    .from("delivery_runs")
    .select("*, flight_windows(flight_number, flight_date, canberra_arrival_time)")
    .eq("driver_id", driver.id)
    .in("status", ["active", "planned"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run) return { run: null, stops: [] };

  const { data: stops } = await supabase
    .from("delivery_stops")
    .select(`
      *,
      orders(
        id, status, total_aud_cents, delivery_address, delivery_notes,
        order_items(quantity_kg, fish_species:fish_species_id(name_english))
      ),
      customers(
        users:user_id(full_name, phone)
      )
    `)
    .eq("delivery_run_id", run.id)
    .order("sequence_number", { ascending: true });

  return {
    run: run as RunWithWindow,
    stops: (stops ?? []) as StopWithRelations[],
  };
}

export default async function DriverPage() {
  const { run, stops, noDriver } = await getRunData() as {
    run: RunWithWindow | null;
    stops: StopWithRelations[];
    noDriver?: boolean;
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6 pt-2">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">
          FijiFish Driver
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Today&apos;s Run</h1>
      </div>

      {noDriver ? (
        <div className="py-16 text-center border border-dashed border-white/15 rounded-xl">
          <span className="text-4xl block mb-3" aria-hidden="true">🚛</span>
          <p className="text-text-primary font-semibold mb-1">No driver account found</p>
          <p className="text-text-secondary text-sm">
            Contact admin to set up your driver profile.
          </p>
        </div>
      ) : !run ? (
        <div className="py-16 text-center border border-dashed border-white/15 rounded-xl">
          <span className="text-4xl block mb-3" aria-hidden="true">✈️</span>
          <p className="text-text-primary font-semibold mb-1">No run assigned</p>
          <p className="text-text-secondary text-sm">
            You don&apos;t have a delivery run for today. Check back after the flight lands.
          </p>
        </div>
      ) : (
        <RunManager run={run} stops={stops} />
      )}
    </div>
  );
}
