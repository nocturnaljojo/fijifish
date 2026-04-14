import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/roles";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    await requireRole(["driver", "admin"]);
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerSupabaseClient();

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();
    if (!driver) return NextResponse.json({ error: "Driver record not found" }, { status: 404 });

    const body = await req.json() as {
      run_id: string;
      lat: number;
      lng: number;
    };

    if (!body.run_id || body.lat == null || body.lng == null) {
      return NextResponse.json({ error: "run_id, lat, and lng are required" }, { status: 400 });
    }

    const { error } = await supabase.from("driver_gps_logs").insert({
      delivery_run_id: body.run_id,
      driver_id: driver.id,
      lat: body.lat,
      lng: body.lng,
      captured_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
