import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/roles";
import { createServerSupabaseClient } from "@/lib/supabase";

// Resolve clerk userId → drivers.id
async function resolveDriverId(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  clerkId: string,
) {
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .single();
  if (!user) throw new Error("User not found");

  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();
  if (!driver) throw new Error("Driver record not found");

  return driver.id;
}

// GET /api/driver — active or planned run with stops + order info
export async function GET() {
  try {
    await requireRole(["driver", "admin"]);
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const driverId = await resolveDriverId(supabase, userId);

    const { data: run, error: runErr } = await supabase
      .from("delivery_runs")
      .select("*, flight_windows(flight_number, flight_date, canberra_arrival_time)")
      .eq("driver_id", driverId)
      .in("status", ["active", "planned"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 });
    if (!run) return NextResponse.json({ run: null, stops: [] });

    const { data: stops, error: stopsErr } = await supabase
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

    if (stopsErr) return NextResponse.json({ error: stopsErr.message }, { status: 500 });

    return NextResponse.json({ run, stops: stops ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Driver record") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// PATCH /api/driver — update stop status or run status
export async function PATCH(req: NextRequest) {
  try {
    await requireRole(["driver", "admin"]);
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const driverId = await resolveDriverId(supabase, userId);

    const body = await req.json() as {
      action: "start_run" | "complete_run" | "mark_arrived" | "mark_delivered" | "skip_stop";
      run_id?: string;
      stop_id?: string;
    };

    if (!body.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // Verify run belongs to this driver
    if (body.run_id) {
      const { data: run } = await supabase
        .from("delivery_runs")
        .select("id, driver_id")
        .eq("id", body.run_id)
        .eq("driver_id", driverId)
        .single();
      if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (body.action === "start_run" && body.run_id) {
      const { error } = await supabase
        .from("delivery_runs")
        .update({ status: "active", started_at: now })
        .eq("id", body.run_id)
        .eq("driver_id", driverId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "complete_run" && body.run_id) {
      const { error } = await supabase
        .from("delivery_runs")
        .update({ status: "completed", completed_at: now })
        .eq("id", body.run_id)
        .eq("driver_id", driverId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "mark_arrived" && body.stop_id) {
      const { error } = await supabase
        .from("delivery_stops")
        .update({ status: "arrived", arrived_at: now })
        .eq("id", body.stop_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "mark_delivered" && body.stop_id) {
      const { data: stop } = await supabase
        .from("delivery_stops")
        .select("order_id")
        .eq("id", body.stop_id)
        .single();

      const [stopUpdate, orderUpdate] = await Promise.all([
        supabase
          .from("delivery_stops")
          .update({ status: "delivered", delivered_at: now })
          .eq("id", body.stop_id),
        stop
          ? supabase
              .from("orders")
              .update({ status: "delivered", delivered_at: now })
              .eq("id", stop.order_id)
          : Promise.resolve({ error: null }),
      ]);

      if (stopUpdate.error) return NextResponse.json({ error: stopUpdate.error.message }, { status: 500 });
      if (orderUpdate.error) return NextResponse.json({ error: orderUpdate.error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "skip_stop" && body.stop_id) {
      const { error } = await supabase
        .from("delivery_stops")
        .update({ status: "skipped" })
        .eq("id", body.stop_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Driver record") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
