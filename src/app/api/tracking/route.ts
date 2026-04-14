import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireAuth } from "@/lib/api-helpers";
import { getVillageId } from "@/lib/roles";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { ShipmentUpdateStatus } from "@/types/database";

const ALL_STATUSES: ShipmentUpdateStatus[] = [
  "caught",
  "processing",
  "packed",
  "at_airport",
  "cargo_accepted",
  "departed",
  "in_flight",
  "landed",
  "customs_cleared",
  "out_for_delivery",
  "delivered",
];

const SUPPLIER_STATUSES: ShipmentUpdateStatus[] = [
  "caught",
  "processing",
  "packed",
  "at_airport",
];

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireAuth();
    if (role !== "admin" && role !== "supplier") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const flightWindowId = formData.get("flight_window_id") as string | null;
    const villageIdParam = formData.get("village_id") as string | null;
    const status = formData.get("status") as ShipmentUpdateStatus | null;
    const note = formData.get("note") as string | null;
    const photo = formData.get("photo") as File | null;

    if (!flightWindowId || !status) {
      return NextResponse.json(
        { error: "flight_window_id and status are required" },
        { status: 400 },
      );
    }

    // Validate status is in the allowed list
    if (!ALL_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    // Suppliers can only post early-stage statuses
    if (role === "supplier" && !SUPPLIER_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Suppliers can only post: caught, processing, packed, at_airport" },
        { status: 403 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Resolve village_id
    let resolvedVillageId: string;

    if (role === "admin") {
      if (!villageIdParam) {
        return NextResponse.json({ error: "village_id is required for admin posts" }, { status: 400 });
      }
      resolvedVillageId = villageIdParam;
    } else {
      // Supplier: use their session village_id
      const sessionVillageId = await getVillageId();
      if (!sessionVillageId) {
        return NextResponse.json({ error: "No village assigned to your account" }, { status: 403 });
      }
      resolvedVillageId = sessionVillageId;
    }

    // Resolve users.id from clerk_id
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (!dbUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // Handle optional photo upload
    let photoUrl: string | null = null;

    if (photo && photo.size > 0) {
      if (photo.size > 2_097_152) {
        return NextResponse.json(
          { error: "Photo too large — maximum 2MB" },
          { status: 413 },
        );
      }

      const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const storagePath = `${resolvedVillageId}/${flightWindowId}/${Date.now()}.${ext}`;
      const buffer = new Uint8Array(await photo.arrayBuffer());

      const { error: uploadErr } = await supabase.storage
        .from("shipment-updates")
        .upload(storagePath, buffer, {
          contentType: photo.type || "image/jpeg",
          upsert: false,
        });

      if (uploadErr) {
        return NextResponse.json(
          { error: `Photo upload failed: ${uploadErr.message}` },
          { status: 500 },
        );
      }

      const { data: { publicUrl } } = supabase.storage
        .from("shipment-updates")
        .getPublicUrl(storagePath);

      photoUrl = publicUrl;
    }

    // Insert shipment_update row
    const { data: update, error: insertErr } = await supabase
      .from("shipment_updates")
      .insert({
        flight_window_id: flightWindowId,
        village_id: resolvedVillageId,
        status,
        updated_by: dbUser.id,
        photo_url: photoUrl,
        note: note?.trim() || null,
      })
      .select("id, status, photo_url, note, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, update });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
