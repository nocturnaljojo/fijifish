import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { createServerSupabaseClient } from "@/lib/supabase";

// Spam Act 2003 — STOP instruction is mandatory on every broadcast
const STOP_SUFFIX = "\n\nReply STOP to unsubscribe";

function ensureStopInstruction(text: string): string {
  if (text.toLowerCase().includes("reply stop") || text.toLowerCase().includes("stop to unsubscribe")) {
    return text;
  }
  return text + STOP_SUFFIX;
}

type AudienceFilter = {
  segment: "all" | "state" | "zone";
  state?: string;
  zone_id?: string;
  active_only?: boolean;
};

type RecipientRow = {
  id: string; // customers.id
  phone: string | null;
};

async function buildRecipientList(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  filter: AudienceFilter,
  channel: string,
): Promise<RecipientRow[]> {
  // Determine which opt-out columns to apply
  const excludeSms = channel === "sms" || channel === "both";
  const excludeWhatsapp = channel === "whatsapp" || channel === "both";

  // Base query: customers joined to users for phone number
  // Uses service role — bypasses RLS
  let query = supabase
    .from("customers")
    .select("id, users:user_id(phone)")
    .eq("broadcast_opt_out", false);

  // Channel-specific opt-outs (migration 014)
  if (excludeSms) query = query.eq("sms_opt_out", false);
  if (excludeWhatsapp) query = query.eq("whatsapp_opt_out", false);

  // Segment filter
  if (filter.segment === "state" && filter.state) {
    query = query.eq("state", filter.state);
  } else if (filter.segment === "zone" && filter.zone_id) {
    query = query.eq("delivery_zone_id", filter.zone_id);
  }

  const { data: customers } = await query;
  if (!customers || customers.length === 0) return [];

  let results = (customers as unknown as { id: string; users: { phone: string | null } | null }[]).map(
    (c) => ({ id: c.id, phone: c.users?.phone ?? null }),
  );

  // Active-only filter: customers who have placed at least one order
  if (filter.active_only) {
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_id")
      .not("status", "eq", "cancelled");

    const activeIds = new Set((orders ?? []).map((o) => o.customer_id));
    results = results.filter((r) => activeIds.has(r.id));
  }

  // Require a phone number to receive SMS/WhatsApp
  return results.filter((r) => r.phone);
}

// ── GET /api/broadcasts — list or preview count ────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    // Preview mode: return recipient count for a given filter
    if (searchParams.get("preview") === "1") {
      const filter: AudienceFilter = {
        segment: (searchParams.get("segment") ?? "all") as AudienceFilter["segment"],
        state: searchParams.get("state") ?? undefined,
        zone_id: searchParams.get("zone_id") ?? undefined,
        active_only: searchParams.get("active_only") === "true",
      };
      const channel = searchParams.get("channel") ?? "sms";
      const recipients = await buildRecipientList(supabase, filter, channel);
      return NextResponse.json({ count: recipients.length });
    }

    // List mode: return all broadcasts newest first
    const { data: broadcasts, error } = await supabase
      .from("broadcasts")
      .select("id, channels, message_text, recipient_count, status, sent_at, created_at, audience_filter")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ broadcasts: broadcasts ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// ── POST /api/broadcasts — create and log broadcast ───────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();
    const supabase = createServerSupabaseClient();

    const body = await req.json() as {
      message_text: string;
      channels: string;
      audience_filter: AudienceFilter;
    };

    const { message_text, channels, audience_filter } = body;

    if (!message_text?.trim()) {
      return NextResponse.json({ error: "message_text is required" }, { status: 400 });
    }
    if (!["sms", "whatsapp", "both"].includes(channels)) {
      return NextResponse.json({ error: "channels must be sms, whatsapp, or both" }, { status: 400 });
    }

    // Enforce Spam Act 2003 — STOP instruction mandatory
    const finalMessage = ensureStopInstruction(message_text.trim());

    // Resolve sender's users.id from clerk_id
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    // Build recipient list
    const recipients = await buildRecipientList(supabase, audience_filter, channels);
    const recipientCount = recipients.length;

    // Insert broadcast row (status = 'sending')
    const { data: broadcast, error: broadcastErr } = await supabase
      .from("broadcasts")
      .insert({
        sent_by: dbUser?.id ?? null,
        audience_filter,
        channels,
        message_text: finalMessage,
        recipient_count: recipientCount,
        status: "sending",
      })
      .select("id")
      .single();

    if (broadcastErr || !broadcast) {
      return NextResponse.json({ error: broadcastErr?.message ?? "Insert failed" }, { status: 500 });
    }

    // Insert broadcast_recipients rows
    if (recipients.length > 0) {
      const channelList: ("sms" | "whatsapp")[] =
        channels === "both" ? ["sms", "whatsapp"] : [channels as "sms" | "whatsapp"];

      const recipientRows = recipients.flatMap((r) =>
        channelList.map((ch) => ({
          broadcast_id: broadcast.id,
          customer_id: r.id,
          channel_used: ch,
          delivery_status: "queued" as const,
        })),
      );

      const { error: recipientsErr } = await supabase
        .from("broadcast_recipients")
        .insert(recipientRows);

      if (recipientsErr) {
        // Roll back broadcast to failed status
        await supabase
          .from("broadcasts")
          .update({ status: "failed" })
          .eq("id", broadcast.id);
        return NextResponse.json({ error: recipientsErr.message }, { status: 500 });
      }
    }

    // TODO: integrate Twilio SMS/WhatsApp sending here
    // For each recipient in broadcast_recipients, call:
    //   twilioClient.messages.create({
    //     to: recipient.phone,
    //     from: process.env.TWILIO_PHONE_NUMBER,
    //     body: finalMessage,
    //   })
    // Update delivery_status = 'sent' + sent_at per recipient.
    // For now, mark everything as sent immediately (MVP log-only mode).

    const now = new Date().toISOString();

    // Mark all recipients as sent (log-only MVP)
    if (recipients.length > 0) {
      await supabase
        .from("broadcast_recipients")
        .update({ delivery_status: "sent", sent_at: now })
        .eq("broadcast_id", broadcast.id);
    }

    // Mark broadcast as sent
    await supabase
      .from("broadcasts")
      .update({ status: "sent", sent_at: now })
      .eq("id", broadcast.id);

    return NextResponse.json({
      success: true,
      broadcast_id: broadcast.id,
      recipient_count: recipientCount,
      message_text: finalMessage,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
