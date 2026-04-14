import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    await requireRole(["driver", "admin"]);
    const supabase = createServerSupabaseClient();

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    const stopId = formData.get("stop_id") as string | null;
    const orderId = formData.get("order_id") as string | null;
    const receivedByName = formData.get("received_by_name") as string | null;
    const isProxy = formData.get("is_proxy_delivery") === "true";
    const gpsLat = formData.get("gps_lat") ? Number(formData.get("gps_lat")) : null;
    const gpsLng = formData.get("gps_lng") ? Number(formData.get("gps_lng")) : null;

    if (!file || !stopId || !orderId) {
      return NextResponse.json({ error: "photo, stop_id, and order_id are required" }, { status: 400 });
    }

    // Upload photo to delivery-proofs bucket
    const bytes = await file.arrayBuffer();
    const uint8 = new Uint8Array(bytes);
    const filename = `${stopId}/${Date.now()}.jpg`;

    const { error: uploadErr } = await supabase.storage
      .from("delivery-proofs")
      .upload(filename, uint8, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("delivery-proofs")
      .getPublicUrl(filename);

    // Insert proof record
    const { data: proof, error: proofErr } = await supabase
      .from("delivery_proofs")
      .insert({
        delivery_stop_id: stopId,
        order_id: orderId,
        photo_url: publicUrl,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        captured_at: new Date().toISOString(),
        received_by_name: receivedByName || null,
        is_proxy_delivery: isProxy,
        admin_approval_required: isProxy,
      })
      .select("id")
      .single();

    if (proofErr) {
      return NextResponse.json({ error: proofErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, proof_id: proof.id, photo_url: publicUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
