export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import BroadcastCompose, { type ZoneOption } from "./BroadcastCompose";
import type { Broadcast } from "@/types/database";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:   { label: "Draft",   cls: "bg-white/5 border border-white/15 text-text-secondary" },
  sending: { label: "Sending", cls: "bg-sunset-gold/10 border border-sunset-gold/30 text-sunset-gold" },
  sent:    { label: "Sent ✓",  cls: "bg-lagoon-green/10 border border-lagoon-green/30 text-lagoon-green" },
  failed:  { label: "Failed",  cls: "bg-reef-coral/10 border border-reef-coral/30 text-reef-coral" },
};

const CHANNEL_LABEL: Record<string, string> = {
  sms: "📱 SMS",
  whatsapp: "💬 WhatsApp",
  both: "📱💬 Both",
};

function audienceSummary(filter: Record<string, unknown>): string {
  const segment = filter.segment as string | undefined;
  const state = filter.state as string | undefined;
  const active = filter.active_only as boolean | undefined;
  let base = "All customers";
  if (segment === "state" && state) base = `${state} customers`;
  else if (segment === "zone") base = "Zone customers";
  if (active) base += " (active only)";
  return base;
}

async function getData() {
  const supabase = createServerSupabaseClient();

  const [
    { data: zones },
    { data: broadcasts },
  ] = await Promise.all([
    supabase
      .from("delivery_zones")
      .select("id, name, state")
      .eq("is_active", true)
      .order("state", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("broadcasts")
      .select("id, channels, message_text, recipient_count, status, sent_at, audience_filter, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const zoneList: ZoneOption[] = (zones ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    state: z.state,
  }));

  const stateList = [...new Set(zoneList.map((z) => z.state))].sort();

  return {
    zones: zoneList,
    states: stateList,
    broadcasts: (broadcasts ?? []) as Broadcast[],
  };
}

export default async function BroadcastsPage() {
  const { zones, states, broadcasts } = await getData();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Broadcasts</h1>
        <p className="text-text-secondary text-sm mt-1">
          Send SMS and WhatsApp messages to customer segments. Spam Act 2003 compliant.
        </p>
      </div>

      {/* Compose form */}
      <BroadcastCompose zones={zones} states={states} />

      {/* History */}
      <div className="mt-10">
        <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-4">
          Broadcast History
        </h2>

        {broadcasts.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/15 rounded-xl">
            <span className="text-3xl block mb-2" aria-hidden="true">📣</span>
            <p className="text-text-secondary text-sm">No broadcasts sent yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {broadcasts.map((b) => {
              const badge = STATUS_BADGE[b.status] ?? STATUS_BADGE.draft;
              const sentAt = b.sent_at
                ? new Date(b.sent_at).toLocaleString("en-AU", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })
                : new Date(b.created_at).toLocaleString("en-AU", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  });

              const preview =
                b.message_text.length > 120
                  ? b.message_text.slice(0, 120) + "…"
                  : b.message_text;

              const audience = audienceSummary(b.audience_filter as Record<string, unknown>);

              return (
                <div
                  key={b.id}
                  className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-mono text-text-secondary">
                        {CHANNEL_LABEL[b.channels] ?? b.channels}
                      </span>
                      <span className="text-[10px] font-mono text-text-secondary">
                        · {audience}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-text-secondary whitespace-nowrap shrink-0">
                      {sentAt}
                    </span>
                  </div>

                  <p className="text-sm text-text-primary leading-relaxed">{preview}</p>

                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>{b.recipient_count} recipient{b.recipient_count !== 1 ? "s" : ""}</span>
                    <span className="font-mono text-[10px] text-text-secondary/50">
                      #{b.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
