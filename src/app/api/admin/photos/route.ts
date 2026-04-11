import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import {
  withErrorHandling,
  requireAdmin,
  successResponse,
  errorResponse,
} from "@/lib/api-helpers";

// GET — list pending catch photos
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("catch_photos")
    .select(`
      id,
      image_url,
      estimated_weight_kg,
      note,
      status,
      created_at,
      fish_species ( name_fijian, name_english ),
      villages ( name ),
      flight_windows ( flight_date, flight_number )
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return errorResponse("Failed to fetch photos", 500);
  return successResponse(data);
});

// PATCH — approve or reject a catch photo
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const { userId } = await requireAdmin();
  const body = await req.json() as {
    id?: unknown;
    action?: unknown;
    update_species_image?: unknown;
    fish_species_id?: unknown;
    image_url?: unknown;
  };

  const { id, action, update_species_image, fish_species_id, image_url } = body;

  if (typeof id !== "string" || !id) return errorResponse("id is required", 400);
  if (action !== "approve" && action !== "reject") return errorResponse("action must be 'approve' or 'reject'", 400);

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("catch_photos")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse("Failed to update photo", 500);

  // Optionally update the species default image when approving
  if (action === "approve" && update_species_image && typeof fish_species_id === "string" && typeof image_url === "string") {
    await supabase
      .from("fish_species")
      .update({ default_image_url: image_url })
      .eq("id", fish_species_id);
  }

  return successResponse(data);
});
