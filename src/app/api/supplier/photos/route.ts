import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/roles";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    await requireRole(["supplier", "admin"]);

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fishSpeciesId = formData.get("fish_species_id") as string | null;
    const flightWindowId = formData.get("flight_window_id") as string | null;
    const estimatedWeightRaw = formData.get("estimated_weight_kg") as string | null;
    const note = formData.get("note") as string | null;

    if (!file || !fishSpeciesId || !flightWindowId) {
      return NextResponse.json(
        { error: "file, fish_species_id, and flight_window_id are required" },
        { status: 400 },
      );
    }

    // 1MB hard limit (client should compress, but enforce server-side too)
    if (file.size > 1_048_576) {
      return NextResponse.json(
        { error: "Image too large — maximum 1MB after compression" },
        { status: 413 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Resolve users.id from clerk_id
    const { data: dbUser, error: userErr } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (userErr || !dbUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // Resolve supplier record (required for catch_photos FK)
    const { data: supplier, error: supplierErr } = await supabase
      .from("suppliers")
      .select("id, village_id")
      .eq("user_id", dbUser.id)
      .maybeSingle();

    if (supplierErr || !supplier) {
      return NextResponse.json(
        {
          error:
            "No supplier record found for this account. Ask admin to create a supplier entry.",
        },
        { status: 404 },
      );
    }

    // Upload to Supabase Storage (catch-photos bucket)
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const storagePath = `${supplier.village_id}/${flightWindowId}/${Date.now()}.${ext}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from("catch-photos")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("catch-photos").getPublicUrl(storagePath);

    // Insert catch_photos row
    const estimatedWeight =
      estimatedWeightRaw && !isNaN(parseFloat(estimatedWeightRaw))
        ? parseFloat(estimatedWeightRaw)
        : null;

    const { data: photo, error: insertErr } = await supabase
      .from("catch_photos")
      .insert({
        supplier_id: supplier.id,
        village_id: supplier.village_id,
        fish_species_id: fishSpeciesId,
        flight_window_id: flightWindowId,
        image_url: publicUrl,
        estimated_weight_kg: estimatedWeight,
        note: note?.trim() || null,
        status: "pending",
      })
      .select("id, image_url, status, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, photo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
