// src/app/api/webhooks/stripe/route.ts
//
// Stripe webhook receiver — order lifecycle backbone.
//
// CRITICAL: Stripe signature verification requires the raw request body as a
// string. NEVER call req.json() here — it consumes the stream and the body
// Stripe signs will differ from what constructEvent receives.
//
// Events handled:
//   checkout.session.completed  → confirm order (inventory already reserved at checkout)
//   payment_intent.payment_failed → mark payment_failed, restore reserved cargo capacity
//   charge.refunded             → mark refunded, restore reserved cargo capacity
//
// All other events → 200 OK, no action (Stripe retries on non-2xx).
//
// Idempotency: each handler checks current order status before writing,
// so duplicate webhook deliveries are safe.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { withErrorHandling } from "@/lib/api-helpers";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  customer_id: string;
  flight_window_id: string;
  status: string;
}

interface OrderItemRow {
  fish_species_id: string;
  village_id: string;
  quantity_kg: number;
}

// ── Capacity restoration helper ───────────────────────────────────────────────
// Called on payment failure and refunds to release the cargo space reserved
// at checkout time. Looks up the inventory row by the three-part key and
// calls the decrement_reserved_kg RPC for each order item.

async function restoreCapacity(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orderId: string,
  flightWindowId: string,
): Promise<void> {
  const { data: items } = await supabase
    .from("order_items")
    .select("fish_species_id, village_id, quantity_kg")
    .eq("order_id", orderId);

  if (!items || items.length === 0) return;

  for (const item of items as OrderItemRow[]) {
    const { data: inv } = await supabase
      .from("inventory_availability")
      .select("id")
      .eq("fish_species_id", item.fish_species_id)
      .eq("flight_window_id", flightWindowId)
      .eq("village_id", item.village_id)
      .maybeSingle();

    if (!inv) continue;

    const { error } = await supabase.rpc("decrement_reserved_kg", {
      inv_id: inv.id,
      delta: Number(item.quantity_kg),
    });

    if (error) {
      console.error("[stripe webhook] decrement_reserved_kg failed:", error, {
        inv_id: inv.id,
        delta: item.quantity_kg,
      });
    }
  }
}

// ── Notification log helper ───────────────────────────────────────────────────
// Inserts a row into notification_log. Failures are swallowed — a notification
// log failure must never cause the webhook to return non-2xx (which would make
// Stripe retry and potentially double-process the event).

async function logNotification(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  customerId: string,
  event: string,
  messageText: string,
): Promise<void> {
  const { error } = await supabase.from("notification_log").insert({
    customer_id: customerId,
    event,
    channel: "email",          // Twilio not yet wired; placeholder for Phase 2
    message_text: messageText,
    delivery_status: "pending",
  });

  if (error) {
    console.error("[stripe webhook] notification_log insert failed:", error);
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.error("[stripe webhook] checkout.session.completed: missing order_id in metadata");
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  // Idempotent: only update if still pending
  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      status: "confirmed",
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id, customer_id")
    .maybeSingle();

  if (error) {
    console.error("[stripe webhook] checkout.session.completed: order update failed:", error);
    return;
  }

  if (!updated) {
    // Either order not found or already confirmed (duplicate event) — safe to ignore
    return;
  }

  // NOTE: Inventory capacity was already reserved by /api/checkout before
  // the Stripe session was created. No inventory change needed here.

  await logNotification(
    supabase,
    updated.customer_id as string,
    "order_confirmed",
    `Your FijiFish order has been confirmed. Order ref: ${orderId.slice(-8).toUpperCase()}.`,
  );
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, customer_id, flight_window_id, status")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (error) {
    console.error("[stripe webhook] payment_intent.payment_failed: lookup failed:", error);
    return;
  }

  if (!order) {
    // Order may not exist yet if the payment intent was created outside our flow
    return;
  }

  const o = order as OrderRow;

  // Idempotent: only act if the order is in a pre-completion state
  if (o.status !== "pending" && o.status !== "confirmed") return;

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "payment_failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", o.id);

  if (updateError) {
    console.error("[stripe webhook] payment_intent.payment_failed: status update failed:", updateError);
    return;
  }

  // Restore the cargo capacity that was reserved at checkout time
  await restoreCapacity(supabase, o.id, o.flight_window_id);

  await logNotification(
    supabase,
    o.customer_id,
    "payment_failed",
    `Your FijiFish payment could not be processed. Please try again or contact support.`,
  );
}

async function handleChargeRefunded(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  charge: Stripe.Charge,
): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : null;

  if (!paymentIntentId) {
    console.error("[stripe webhook] charge.refunded: no payment_intent on charge");
    return;
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, customer_id, flight_window_id, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (error) {
    console.error("[stripe webhook] charge.refunded: lookup failed:", error);
    return;
  }

  if (!order) return;

  const o = order as OrderRow;

  // Idempotent: don't re-process an already-refunded order
  if (o.status === "refunded") return;

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", o.id);

  if (updateError) {
    console.error("[stripe webhook] charge.refunded: status update failed:", updateError);
    return;
  }

  // Restore cargo capacity so the slot can be sold to another buyer
  await restoreCapacity(supabase, o.id, o.flight_window_id);

  await logNotification(
    supabase,
    o.customer_id,
    "order_refunded",
    `Your FijiFish order has been refunded. You should see the funds in 3–5 business days.`,
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing stripe-signature header or STRIPE_WEBHOOK_SECRET" },
      { status: 400 },
    );
  }

  // CRITICAL: must use raw text — req.json() would break signature verification
  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentFailed(supabase, event.data.object as Stripe.PaymentIntent);
      break;

    case "charge.refunded":
      await handleChargeRefunded(supabase, event.data.object as Stripe.Charge);
      break;

    default:
      // Unknown event — return 200 so Stripe doesn't retry.
      // Never throw on unknown events: Stripe sends dozens of event types.
      break;
  }

  return NextResponse.json({ received: true });
});
