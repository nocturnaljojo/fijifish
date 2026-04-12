import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-helpers";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase";

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe signature or webhook secret" }, { status: 400 });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

    if (!orderId) {
      console.error("[stripe webhook] checkout.session.completed missing order_id in metadata");
      return NextResponse.json({ received: true });
    }

    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from("orders")
      .update({
        status: "confirmed",
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "pending"); // Only update if still pending (idempotency)

    if (error) {
      console.error("[stripe webhook] failed to update order:", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    console.warn("[stripe webhook] order confirmed:", orderId);
  }

  return NextResponse.json({ received: true });
});
