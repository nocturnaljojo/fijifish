import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase";

// GET /api/broadcasts/[id] — broadcast details + recipient list
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const [{ data: broadcast, error: bErr }, { data: recipients, error: rErr }] =
      await Promise.all([
        supabase
          .from("broadcasts")
          .select("*")
          .eq("id", id)
          .single(),
        supabase
          .from("broadcast_recipients")
          .select("id, channel_used, delivery_status, sent_at, customers:customer_id(users:user_id(full_name, email, phone))")
          .eq("broadcast_id", id)
          .order("created_at", { ascending: true })
          .limit(500),
      ]);

    if (bErr || !broadcast) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }
    if (rErr) {
      return NextResponse.json({ error: rErr.message }, { status: 500 });
    }

    return NextResponse.json({ broadcast, recipients: recipients ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
