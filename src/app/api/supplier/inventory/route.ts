import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireRole, getVillageId } from "@/lib/roles";
import { createServerSupabaseClient } from "@/lib/supabase";

interface UpdateRow {
  id: string;
  total_capacity_kg: number;
  confirm: boolean;
}

interface PatchBody {
  rows: UpdateRow[];
  window_id: string;
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(["supplier", "admin"]);

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const villageId = await getVillageId();

    const body = (await req.json()) as PatchBody;
    if (!body.rows?.length || !body.window_id) {
      return NextResponse.json({ error: "Missing rows or window_id" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();

    for (const row of body.rows) {
      if (!row.id) continue;

      const updates: Record<string, unknown> = {
        total_capacity_kg: Math.max(0, Number(row.total_capacity_kg) || 0),
        updated_at: now,
      };

      if (row.confirm) {
        updates.confirmed_by_supplier = true;
        updates.confirmed_at = now;
      }

      // Scope updates to the supplier's own village for security
      // (service role is used, so RLS is bypassed — we enforce the constraint manually)
      let query = supabase
        .from("inventory_availability")
        .update(updates)
        .eq("id", row.id)
        .eq("flight_window_id", body.window_id);

      if (villageId) {
        query = query.eq("village_id", villageId);
      }

      const { error } = await query;
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
