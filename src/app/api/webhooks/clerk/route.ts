// src/app/api/webhooks/clerk/route.ts
//
// Clerk webhook receiver — syncs user lifecycle events to Supabase.
//
// CRITICAL: Signature verification requires the raw request body as a string.
// NEVER call req.json() here — it consumes the stream and breaks svix verification.
//
// Events handled:
//   user.created → upsert users + customers (default role: buyer)
//   user.updated → sync name, email, phone changes to users row
//   user.deleted → soft delete: is_active=false, deleted_at=now()
//                  (hard delete forbidden — would cascade and destroy order history)
//
// All other events → 200 OK, no action (Clerk retries on non-2xx).
//
// Setup: Clerk Dashboard → Webhooks → Add Endpoint
//   URL: https://vitifish.vercel.app/api/webhooks/clerk
//   Events: user.created, user.updated, user.deleted
//   Signing secret → CLERK_WEBHOOK_SECRET env var

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { withErrorHandling } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase";

// ── Clerk payload types ───────────────────────────────────────────────────────

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkPhoneNumber {
  id: string;
  phone_number: string;
}

interface ClerkUserData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: ClerkEmailAddress[];
  phone_numbers: ClerkPhoneNumber[];
}

interface ClerkUserDeletedData {
  id: string;
  deleted: boolean;
}

type ClerkWebhookEvent =
  | { type: "user.created"; data: ClerkUserData }
  | { type: "user.updated"; data: ClerkUserData }
  | { type: "user.deleted"; data: ClerkUserDeletedData }
  | { type: string; data: unknown };

// ── Helpers ───────────────────────────────────────────────────────────────────

function primaryEmail(data: ClerkUserData): string | null {
  return data.email_addresses[0]?.email_address ?? null;
}

function primaryPhone(data: ClerkUserData): string | null {
  return data.phone_numbers[0]?.phone_number ?? null;
}

function fullName(data: ClerkUserData): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleUserCreated(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  data: ClerkUserData,
): Promise<void> {
  const email = primaryEmail(data);
  const name = fullName(data);
  const phone = primaryPhone(data);

  // 1. Upsert into users (idempotent on clerk_id — safe to replay)
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        clerk_id: data.id,
        role: "buyer",
        full_name: name,
        email,
        phone,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (userError || !user) {
    console.error("[clerk webhook] user.created: users upsert failed:", userError);
    return;
  }

  // 2. Upsert into customers (buyer profile, bare row — delivery info added at checkout)
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (customerError || !customer) {
    console.error("[clerk webhook] user.created: customers upsert failed:", customerError);
    return;
  }

  // 3. Log the signup event (errors swallowed — notification log must never block)
  const { error: logError } = await supabase.from("notification_log").insert({
    customer_id: customer.id,
    event: "user_created",
    channel: "email",
    message_text: `Welcome to FijiFish${name ? `, ${name}` : ""}! Your account is ready.`,
    delivery_status: "pending",
  });

  if (logError) {
    console.error("[clerk webhook] user.created: notification_log insert failed:", logError);
  }
}

async function handleUserUpdated(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  data: ClerkUserData,
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({
      full_name: fullName(data),
      email: primaryEmail(data),
      phone: primaryPhone(data),
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_id", data.id);

  if (error) {
    console.error("[clerk webhook] user.updated: update failed:", error);
  }
}

async function handleUserDeleted(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  data: ClerkUserDeletedData,
): Promise<void> {
  // Soft delete only. Hard deleting a users row cascades through:
  //   users → customers → orders → order_items
  // destroying order history needed for financial records.
  const { error } = await supabase
    .from("users")
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_id", data.id);

  if (error) {
    console.error("[clerk webhook] user.deleted: soft delete failed:", error);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export const POST = withErrorHandling(async (req: NextRequest) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk webhook] CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // CRITICAL: must use raw text — req.json() would break svix signature verification
  const rawBody = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("[clerk webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  switch (event.type) {
    case "user.created":
      await handleUserCreated(supabase, event.data as ClerkUserData);
      break;

    case "user.updated":
      await handleUserUpdated(supabase, event.data as ClerkUserData);
      break;

    case "user.deleted":
      await handleUserDeleted(supabase, event.data as ClerkUserDeletedData);
      break;

    default:
      // Unknown event — return 200 so Clerk doesn't retry.
      // Clerk sends many event types; only handle what we need.
      break;
  }

  return NextResponse.json({ received: true });
});
