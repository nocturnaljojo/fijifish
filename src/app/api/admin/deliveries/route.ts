import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase";

interface StopInput {
  order_id: string;
  customer_id: string;
  address: string | null;
  sequence_number: number;
  is_communal: boolean;
  communal_group_id: string | null;
}

interface CreateRunBody {
  window_id: string;
  driver_id: string;
  stops: StopInput[];
}

// POST /api/admin/deliveries — create delivery_run + bulk insert delivery_stops
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerSupabaseClient();

    const body = await req.json() as CreateRunBody;
    const { window_id, driver_id, stops } = body;

    if (!window_id || !driver_id) {
      return NextResponse.json({ error: "window_id and driver_id are required" }, { status: 400 });
    }
    if (!stops?.length) {
      return NextResponse.json({ error: "At least one stop is required" }, { status: 400 });
    }

    // Validate flight window exists
    const { data: window } = await supabase
      .from("flight_windows")
      .select("id, status")
      .eq("id", window_id)
      .single();

    if (!window) {
      return NextResponse.json({ error: "Flight window not found" }, { status: 404 });
    }

    const validStatuses = ["packing", "shipped", "in_transit", "landed", "customs", "delivering", "closed"];
    if (!validStatuses.includes(window.status)) {
      return NextResponse.json(
        { error: `Cannot create delivery run for window in status '${window.status}'. Window must be closed or later.` },
        { status: 422 },
      );
    }

    // Validate driver exists
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("id", driver_id)
      .eq("is_active", true)
      .single();

    if (!driver) {
      return NextResponse.json({ error: "Driver not found or inactive" }, { status: 404 });
    }

    // Resolve clerk_id → users.id for created_by
    const { data: creatorUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    // Create the delivery run
    const { data: run, error: runErr } = await supabase
      .from("delivery_runs")
      .insert({
        flight_window_id: window_id,
        driver_id,
        status: "planned",
        stop_count: stops.length,
        created_by: creatorUser?.id ?? null,
      })
      .select("id")
      .single();

    if (runErr || !run) {
      return NextResponse.json({ error: runErr?.message ?? "Failed to create run" }, { status: 500 });
    }

    // Bulk insert delivery_stops
    const stopRows = stops.map((s) => ({
      delivery_run_id: run.id,
      order_id: s.order_id,
      customer_id: s.customer_id,
      sequence_number: s.sequence_number,
      address: s.address,
      status: "pending" as const,
      is_communal: s.is_communal,
      communal_group_id: s.communal_group_id ?? null,
    }));

    const { error: stopsErr } = await supabase.from("delivery_stops").insert(stopRows);
    if (stopsErr) {
      // Roll back the run
      await supabase.from("delivery_runs").delete().eq("id", run.id);
      return NextResponse.json({ error: stopsErr.message }, { status: 500 });
    }

    // Link orders to this run
    const orderIds = [...new Set(stops.map((s) => s.order_id))];
    const { error: orderErr } = await supabase
      .from("orders")
      .update({ delivery_run_id: run.id })
      .in("id", orderIds);

    if (orderErr) {
      // Non-fatal — run and stops are created; just log
      console.error("Failed to link orders to run:", orderErr.message);
    }

    return NextResponse.json({ ok: true, run_id: run.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// GET /api/admin/deliveries — list all runs with driver + window + progress
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServerSupabaseClient();

    const { data: runs, error } = await supabase
      .from("delivery_runs")
      .select(`
        id, status, started_at, completed_at, stop_count, created_at,
        flight_windows(id, flight_number, flight_date),
        drivers(id, users:user_id(full_name))
      `)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch stop progress for all runs
    const runIds = (runs ?? []).map((r) => r.id);
    let stopProgress: { delivery_run_id: string; status: string }[] = [];

    if (runIds.length > 0) {
      const { data: stops } = await supabase
        .from("delivery_stops")
        .select("delivery_run_id, status")
        .in("delivery_run_id", runIds);
      stopProgress = stops ?? [];
    }

    const runsWithProgress = (runs ?? []).map((run) => {
      const stops = stopProgress.filter((s) => s.delivery_run_id === run.id);
      return {
        ...run,
        stops_total: stops.length,
        stops_delivered: stops.filter((s) => s.status === "delivered").length,
      };
    });

    return NextResponse.json({ runs: runsWithProgress });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
