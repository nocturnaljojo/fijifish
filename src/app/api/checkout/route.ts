import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { withErrorHandling, requireAuth, errorResponse } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { isAustralian } from "@/lib/pricing";

interface CartItemInput {
  fishSpeciesId: string;
  quantityKg: number;
}

interface DeliveryInput {
  name: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
  state: string;
  notes?: string;
}

interface CheckoutBody {
  items?: unknown;
  delivery?: unknown;
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { userId } = await requireAuth();

  if (!stripe) {
    return errorResponse("Checkout is not available — Stripe is not configured.", 503);
  }

  const body = (await req.json()) as CheckoutBody;
  const items = body.items as CartItemInput[] | undefined;
  const delivery = body.delivery as DeliveryInput | undefined;

  // ── Validate input ────────────────────────────────────────────────────────

  if (!Array.isArray(items) || items.length === 0) {
    return errorResponse("No items in cart.", 400);
  }

  if (!delivery?.name || !delivery.phone || !delivery.address || !delivery.suburb || !delivery.postcode) {
    return errorResponse("Delivery details are incomplete.", 400);
  }

  for (const item of items) {
    if (typeof item.fishSpeciesId !== "string" || typeof item.quantityKg !== "number" || item.quantityKg < 1) {
      return errorResponse("Invalid cart item.", 400);
    }
  }

  const supabase = createServerSupabaseClient();

  // ── Get shoppable flight window ───────────────────────────────────────────
  // Accepts open/closing_soon windows (normal) AND upcoming windows (pre-order mode).
  // Uses timestamp logic so it's independent of whatever status value the DB holds.

  const now = new Date().toISOString();

  // 1. Currently-open window (order_open_at in past, order_close_at in future)
  const { data: openWindow } = await supabase
    .from("flight_windows")
    .select("id, flight_date, order_close_at, order_open_at")
    .lte("order_open_at", now)
    .gt("order_close_at", now)
    .neq("status", "packing")
    .neq("status", "shipped")
    .neq("status", "in_transit")
    .neq("status", "landed")
    .neq("status", "customs")
    .neq("status", "delivering")
    .neq("status", "delivered")
    .neq("status", "cancelled")
    .order("order_close_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // 2. Fall back to upcoming window (pre-order mode)
  const { data: upcomingWindow } = !openWindow
    ? await supabase
        .from("flight_windows")
        .select("id, flight_date, order_close_at, order_open_at")
        .gt("order_open_at", now)
        .neq("status", "delivered")
        .neq("status", "cancelled")
        .order("order_open_at", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const window = openWindow ?? upcomingWindow;
  const isPreOrder = !openWindow && !!upcomingWindow;

  if (!window) {
    return errorResponse("No flight window available. Orders are currently closed.", 409);
  }

  // ── Validate inventory — prices, availability, village ────────────────────

  const { data: inventory } = await supabase
    .from("inventory_availability")
    .select("id, fish_species_id, village_id, available_kg, price_aud_cents")
    .eq("flight_window_id", window.id)
    .in("fish_species_id", items.map((i) => i.fishSpeciesId));

  if (!inventory || inventory.length === 0) {
    return errorResponse("Selected fish are not available for the current flight.", 409);
  }

  const inventoryMap = new Map(
    (inventory as { id: string; fish_species_id: string; village_id: string; available_kg: number; price_aud_cents: number }[]).map(
      (r) => [r.fish_species_id, r],
    ),
  );

  for (const item of items) {
    const inv = inventoryMap.get(item.fishSpeciesId);
    if (!inv) return errorResponse(`${item.fishSpeciesId} is not available.`, 409);
    if (Number(inv.available_kg) < item.quantityKg) {
      return errorResponse(`Not enough ${item.fishSpeciesId} available (${inv.available_kg} kg left).`, 409);
    }
  }

  // ── Upsert user → customer ────────────────────────────────────────────────

  // Get user details from Clerk
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  // ── AU-only gate ───────────────────────────────────────────────────────────
  // Spec: non-AU users cannot reach Stripe checkout.
  // Source: Clerk publicMetadata.country_code (set on sign-up or by admin).
  // If not set, assume AU (platform is AU-targeted; non-AU users should not sign up).
  const countryCode =
    typeof clerkUser.publicMetadata?.country_code === "string"
      ? (clerkUser.publicMetadata.country_code as string).toUpperCase()
      : "AU"; // default to AU if not set

  if (!isAustralian(countryCode)) {
    return errorResponse("Checkout is only available for Australian customers.", 403);
  }

  const { data: dbUser } = await supabase
    .from("users")
    .upsert(
      { clerk_id: userId, role: "buyer", full_name: fullName, email, country_code: countryCode },
      { onConflict: "clerk_id" },
    )
    .select("id")
    .single();

  if (!dbUser) return errorResponse("Failed to upsert user.", 500);

  const { data: customer } = await supabase
    .from("customers")
    .upsert(
      { user_id: dbUser.id, delivery_address: `${delivery.address}, ${delivery.suburb} ${delivery.state} ${delivery.postcode}`, state: delivery.state },
      { onConflict: "user_id" },
    )
    .select("id")
    .single();

  if (!customer) return errorResponse("Failed to upsert customer.", 500);

  // ── Calculate total ───────────────────────────────────────────────────────

  const totalAudCents = items.reduce((sum, item) => {
    const inv = inventoryMap.get(item.fishSpeciesId)!;
    return sum + inv.price_aud_cents * item.quantityKg;
  }, 0);

  // ── Create order ──────────────────────────────────────────────────────────

  const { data: order } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      flight_window_id: window.id,
      status: "pending",
      total_aud_cents: totalAudCents,
      delivery_address: `${delivery.address}, ${delivery.suburb} ${delivery.state} ${delivery.postcode}`,
      delivery_notes: delivery.notes ?? null,
    })
    .select("id")
    .single();

  if (!order) return errorResponse("Failed to create order.", 500);

  // ── Create order items ────────────────────────────────────────────────────

  const orderItems = items.map((item) => {
    const inv = inventoryMap.get(item.fishSpeciesId)!;
    return {
      order_id: order.id,
      fish_species_id: item.fishSpeciesId,
      village_id: inv.village_id,
      quantity_kg: item.quantityKg,
      price_per_kg_aud_cents: inv.price_aud_cents,
      price_per_kg_fjd_cents: 0,
    };
  });

  await supabase.from("order_items").insert(orderItems);

  // ── Get fish names (needed for Stripe line items + sold-out error messages) ─

  const { data: speciesRows } = await supabase
    .from("fish_species")
    .select("id, name_fijian, name_english")
    .in("id", items.map((i) => i.fishSpeciesId));

  const speciesMap = new Map(
    ((speciesRows ?? []) as { id: string; name_fijian: string | null; name_english: string }[]).map(
      (s) => [s.id, s.name_fijian ?? s.name_english],
    ),
  );

  // ── Reserve inventory (atomic, race-condition safe) ──────────────────────
  // increment_reserved_kg returns 1 on success, 0 if stock ran out between
  // our availability check above and this reservation step.

  for (const item of items) {
    const inv = inventoryMap.get(item.fishSpeciesId)!;
    const { data: rowsUpdated, error: rpcError } = await supabase.rpc(
      "increment_reserved_kg",
      { inv_id: inv.id, delta: item.quantityKg },
    );

    if (rpcError || rowsUpdated === 0) {
      // Roll back the order and order_items so they don't sit as phantoms
      await supabase.from("orders").delete().eq("id", order.id);
      return errorResponse(
        `Sorry — ${speciesMap.get(item.fishSpeciesId) ?? "that fish"} just sold out. Please refresh and try again.`,
        409,
      );
    }
  }

  // ── Create Stripe checkout session ────────────────────────────────────────

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email ?? undefined,
    line_items: items.map((item) => {
      const inv = inventoryMap.get(item.fishSpeciesId)!;
      const name = speciesMap.get(item.fishSpeciesId) ?? "Fresh Fish from Fiji";
      return {
        price_data: {
          currency: "aud",
          product_data: { name: `${name} — Fresh from Fiji (${item.quantityKg} kg)` },
          unit_amount: inv.price_aud_cents * item.quantityKg,
        },
        quantity: 1,
      };
    }),
    success_url: `${appUrl}/order/success?session_id={CHECKOUT_SESSION_ID}${isPreOrder ? "&preorder=true" : ""}`,
    cancel_url: `${appUrl}/checkout?cancelled=true`,
    metadata: {
      order_id: order.id,
      clerk_user_id: userId,
    },
    payment_intent_data: {
      metadata: { order_id: order.id },
    },
  });

  return NextResponse.json({ checkoutUrl: session.url });
});
