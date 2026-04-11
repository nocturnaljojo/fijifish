import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import {
  withErrorHandling,
  requireAdmin,
  successResponse,
  errorResponse,
} from "@/lib/api-helpers";

// GET — list all flight windows
export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("flight_windows")
    .select("*")
    .order("flight_date", { ascending: false });
  if (error) return errorResponse("Failed to fetch windows", 500);
  return successResponse(data);
});

// POST — create a new flight window
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json() as {
    flight_date?: unknown;
    flight_number?: unknown;
    order_open_at?: unknown;
    order_close_at?: unknown;
    status?: unknown;
    notes?: unknown;
  };

  const { flight_date, flight_number, order_open_at, order_close_at, status, notes } = body;

  if (typeof flight_date !== "string" || !flight_date) {
    return errorResponse("flight_date is required (YYYY-MM-DD)", 400);
  }
  if (typeof order_open_at !== "string" || !order_open_at) {
    return errorResponse("order_open_at is required (ISO timestamp)", 400);
  }
  if (typeof order_close_at !== "string" || !order_close_at) {
    return errorResponse("order_close_at is required (ISO timestamp)", 400);
  }

  const validStatuses = ["upcoming", "open", "closing_soon", "closed", "packing", "shipped", "in_transit", "landed", "customs", "delivering", "delivered", "cancelled"];
  const windowStatus = typeof status === "string" && validStatuses.includes(status) ? status : "upcoming";

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("flight_windows")
    .insert({
      flight_date,
      flight_number: typeof flight_number === "string" ? flight_number : null,
      order_open_at,
      order_close_at,
      status: windowStatus,
      notes: typeof notes === "string" ? notes : null,
    })
    .select()
    .single();

  if (error) return errorResponse("Failed to create window", 500);
  return successResponse(data, 201);
});

// PATCH — update window status or details
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json() as {
    id?: unknown;
    status?: unknown;
    flight_number?: unknown;
    order_open_at?: unknown;
    order_close_at?: unknown;
    notes?: unknown;
  };

  const { id, ...updates } = body;

  if (typeof id !== "string" || !id) {
    return errorResponse("id is required", 400);
  }

  // Only allow safe fields to be updated
  const allowed: Record<string, unknown> = {};
  if (typeof updates.status === "string") allowed.status = updates.status;
  if (typeof updates.flight_number === "string") allowed.flight_number = updates.flight_number;
  if (typeof updates.order_open_at === "string") allowed.order_open_at = updates.order_open_at;
  if (typeof updates.order_close_at === "string") allowed.order_close_at = updates.order_close_at;
  if (typeof updates.notes === "string") allowed.notes = updates.notes;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("flight_windows")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse("Failed to update window", 500);
  return successResponse(data);
});
