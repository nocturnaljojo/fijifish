import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import {
  withErrorHandling,
  requireAdmin,
  successResponse,
  errorResponse,
} from "@/lib/api-helpers";

// GET — list inventory for a specific flight window
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const windowId = new URL(req.url).searchParams.get("window_id");
  if (!windowId) return errorResponse("window_id query param required", 400);

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_availability")
    .select(`
      id,
      fish_species_id,
      village_id,
      total_capacity_kg,
      reserved_kg,
      available_kg,
      price_aud_cents,
      price_fjd_cents,
      confirmed_by_supplier,
      fish_species ( name_fijian, name_english ),
      villages ( name )
    `)
    .eq("flight_window_id", windowId);

  if (error) return errorResponse("Failed to fetch inventory", 500);
  return successResponse(data);
});

// POST — create inventory row (species + window + village + prices + capacity)
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json() as {
    flight_window_id?: unknown;
    fish_species_id?: unknown;
    village_id?: unknown;
    total_capacity_kg?: unknown;
    reserved_kg?: unknown;
    price_aud_cents?: unknown;
    price_fjd_cents?: unknown;
  };

  const { flight_window_id, fish_species_id, village_id, total_capacity_kg, reserved_kg, price_aud_cents, price_fjd_cents } = body;

  if (!flight_window_id || !fish_species_id || !village_id) {
    return errorResponse("flight_window_id, fish_species_id, village_id are required", 400);
  }
  if (typeof total_capacity_kg !== "number" || total_capacity_kg < 0) {
    return errorResponse("total_capacity_kg must be a non-negative number", 400);
  }
  if (typeof price_aud_cents !== "number" || price_aud_cents < 0) {
    return errorResponse("price_aud_cents must be a non-negative integer", 400);
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_availability")
    .insert({
      flight_window_id,
      fish_species_id,
      village_id,
      total_capacity_kg,
      reserved_kg: typeof reserved_kg === "number" ? reserved_kg : 0,
      price_aud_cents,
      price_fjd_cents: typeof price_fjd_cents === "number" ? price_fjd_cents : 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return errorResponse("Inventory already exists for this species/window/village combination", 409);
    return errorResponse("Failed to create inventory row", 500);
  }
  return successResponse(data, 201);
});

// PATCH — update price or capacity
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json() as {
    id?: unknown;
    total_capacity_kg?: unknown;
    reserved_kg?: unknown;
    price_aud_cents?: unknown;
    price_fjd_cents?: unknown;
  };

  const { id, ...updates } = body;
  if (typeof id !== "string" || !id) return errorResponse("id is required", 400);

  const allowed: Record<string, unknown> = {};
  if (typeof updates.total_capacity_kg === "number") allowed.total_capacity_kg = updates.total_capacity_kg;
  if (typeof updates.reserved_kg === "number") allowed.reserved_kg = updates.reserved_kg;
  if (typeof updates.price_aud_cents === "number") allowed.price_aud_cents = updates.price_aud_cents;
  if (typeof updates.price_fjd_cents === "number") allowed.price_fjd_cents = updates.price_fjd_cents;
  allowed.updated_at = new Date().toISOString();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_availability")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse("Failed to update inventory", 500);
  return successResponse(data);
});
