"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const STOP_SUFFIX = "\n\nReply STOP to unsubscribe";
const SMS_LIMIT = 160;

const TEMPLATES = [
  {
    label: "New catch arriving",
    text: "Fresh [species] arriving [date]! Pre-order now at fijifishpacific.com.au",
  },
  {
    label: "Order in transit",
    text: "Your order is on its way! Flight [number] departed Fiji. Delivering [date].",
  },
  {
    label: "New delivery zone",
    text: "New delivery zone unlocked: [zone]! Fresh Fiji fish now delivering to your area.",
  },
  {
    label: "Orders closing soon",
    text: "Orders closing in 6 hours for [date] delivery. Don't miss out!",
  },
] as const;

export type ZoneOption = { id: string; name: string; state: string };

type AudienceFilter = {
  segment: "all" | "state" | "zone";
  state?: string;
  zone_id?: string;
  active_only: boolean;
};

export default function BroadcastCompose({
  zones,
  states,
}: {
  zones: ZoneOption[];
  states: string[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp" | "both">("sms");
  const [filter, setFilter] = useState<AudienceFilter>({ segment: "all", active_only: false });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Final message with STOP suffix appended (for display + count)
  const finalMessage =
    message.trim() && !message.toLowerCase().includes("reply stop")
      ? message + STOP_SUFFIX
      : message;

  const charCount = finalMessage.length;
  const overLimit = channel !== "whatsapp" && charCount > SMS_LIMIT;

  // ── Fetch preview count on filter/channel change ────────────────────────────

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({
        preview: "1",
        segment: filter.segment,
        channel,
        active_only: String(filter.active_only),
      });
      if (filter.segment === "state" && filter.state) params.set("state", filter.state);
      if (filter.segment === "zone" && filter.zone_id) params.set("zone_id", filter.zone_id);

      const res = await fetch(`/api/broadcasts?${params.toString()}`);
      const json = await res.json() as { count?: number };
      setPreviewCount(json.count ?? 0);
    } catch {
      setPreviewCount(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [filter, channel]);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchPreview(); }, 400);
    return () => clearTimeout(timer);
  }, [fetchPreview]);

  // ── Send broadcast ──────────────────────────────────────────────────────────

  async function handleSend() {
    setSending(true);
    setSendError(null);

    const res = await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_text: message.trim(),
        channels: channel,
        audience_filter: filter,
      }),
    });

    const json = await res.json() as { error?: string; recipient_count?: number };
    setSending(false);

    if (!res.ok) {
      setSendError(json.error ?? "Failed to send broadcast");
      setConfirming(false);
      return;
    }

    setSendSuccess(true);
    setConfirming(false);
    setMessage("");
    setFilter({ segment: "all", active_only: false });
    setPreviewCount(null);
    router.refresh();

    setTimeout(() => setSendSuccess(false), 5000);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function setSegment(segment: AudienceFilter["segment"]) {
    setFilter((f) => ({ ...f, segment, state: undefined, zone_id: undefined }));
  }

  const inputCls = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-text-primary text-sm focus:outline-none focus:border-ocean-teal/60 transition-colors";
  const radioCls = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
      active
        ? "border-ocean-teal/50 bg-ocean-teal/8 text-ocean-teal"
        : "border-white/15 text-text-secondary hover:border-white/30"
    }`;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 flex flex-col gap-6">
      <h2 className="text-base font-bold text-text-primary">New Broadcast</h2>

      {sendSuccess && (
        <div className="bg-lagoon-green/10 border border-lagoon-green/30 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-lagoon-green">Broadcast sent ✓</p>
          <p className="text-xs text-lagoon-green/80 mt-0.5">
            Recipients have been logged. Twilio integration will handle delivery once connected.
          </p>
        </div>
      )}

      {/* Template selector */}
      <div>
        <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2">
          Template
        </label>
        <select
          className={inputCls}
          defaultValue=""
          onChange={(e) => {
            const tmpl = TEMPLATES.find((t) => t.label === e.target.value);
            if (tmpl) setMessage(tmpl.text);
            e.target.value = "";
          }}
        >
          <option value="">— Load a template —</option>
          {TEMPLATES.map((t) => (
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Message textarea */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
            Message *
          </label>
          <span
            className={`text-[10px] font-mono ${
              overLimit ? "text-reef-coral" : charCount > SMS_LIMIT * 0.85 ? "text-sunset-gold" : "text-text-secondary"
            }`}
          >
            {charCount}/{channel === "whatsapp" ? "1000" : SMS_LIMIT}
          </span>
        </div>
        <textarea
          className={`${inputCls} resize-none`}
          rows={4}
          placeholder="Type your message here. &quot;Reply STOP to unsubscribe&quot; will be appended automatically."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={channel === "whatsapp" ? 1000 : 480} // 480 = 3 SMS segments max
        />
        {overLimit && (
          <p className="text-xs text-reef-coral mt-1">
            Message exceeds 160 chars — will be split into {Math.ceil(charCount / 153)} SMS segments.
          </p>
        )}
        <p className="text-[10px] text-text-secondary/60 mt-1.5 font-mono">
          Final message will include: &ldquo;Reply STOP to unsubscribe&rdquo;
        </p>
      </div>

      {/* Channel */}
      <div>
        <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2">
          Channel *
        </label>
        <div className="flex gap-2 flex-wrap">
          {(["sms", "whatsapp", "both"] as const).map((ch) => (
            <label key={ch} className={radioCls(channel === ch)}>
              <input
                type="radio"
                name="channel"
                value={ch}
                checked={channel === ch}
                onChange={() => setChannel(ch)}
                className="sr-only"
              />
              {ch === "sms" ? "📱 SMS" : ch === "whatsapp" ? "💬 WhatsApp" : "📱💬 Both"}
            </label>
          ))}
        </div>
      </div>

      {/* Audience filter */}
      <div>
        <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2">
          Audience
        </label>
        <div className="flex flex-col gap-2">
          {/* Segment */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "state", "zone"] as const).map((seg) => (
              <label key={seg} className={radioCls(filter.segment === seg)}>
                <input
                  type="radio"
                  name="segment"
                  value={seg}
                  checked={filter.segment === seg}
                  onChange={() => setSegment(seg)}
                  className="sr-only"
                />
                {seg === "all" ? "All customers" : seg === "state" ? "By state" : "By zone"}
              </label>
            ))}
          </div>

          {/* State sub-filter */}
          {filter.segment === "state" && (
            <select
              className={inputCls}
              value={filter.state ?? ""}
              onChange={(e) => setFilter((f) => ({ ...f, state: e.target.value || undefined }))}
            >
              <option value="">Select state…</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Zone sub-filter */}
          {filter.segment === "zone" && (
            <select
              className={inputCls}
              value={filter.zone_id ?? ""}
              onChange={(e) => setFilter((f) => ({ ...f, zone_id: e.target.value || undefined }))}
            >
              <option value="">Select zone…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.state})</option>
              ))}
            </select>
          )}

          {/* Active-only modifier */}
          <label className="flex items-center gap-2.5 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={filter.active_only}
              onChange={(e) => setFilter((f) => ({ ...f, active_only: e.target.checked }))}
              className="w-4 h-4 rounded accent-ocean-teal"
            />
            <span className="text-sm text-text-secondary">
              Active customers only <span className="text-text-secondary/50 text-xs">(has at least 1 order)</span>
            </span>
          </label>
        </div>
      </div>

      {/* Compliance reminder */}
      <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg px-4 py-3">
        <p className="text-xs font-semibold text-sunset-gold">Spam Act 2003 Compliance</p>
        <ul className="text-xs text-sunset-gold/80 mt-1 space-y-0.5 list-disc list-inside">
          <li>Opt-out customers are automatically excluded</li>
          <li>&ldquo;Reply STOP to unsubscribe&rdquo; appended to every message</li>
          <li>Sending entity: FijiFish Pacific Pty Ltd</li>
        </ul>
      </div>

      {/* Preview count */}
      <div className="flex items-center justify-between gap-4 py-2 border-t border-white/10">
        <div>
          <p className="text-xs text-text-secondary">Estimated recipients</p>
          <p className="text-xl font-bold text-text-primary mt-0.5">
            {previewLoading ? (
              <span className="text-text-secondary/50 text-sm">Loading…</span>
            ) : previewCount === null ? (
              <span className="text-text-secondary/50 text-sm">—</span>
            ) : (
              previewCount
            )}
          </p>
        </div>

        {!confirming ? (
          <button
            type="button"
            disabled={!message.trim() || previewCount === 0 || previewLoading}
            onClick={() => { setSendError(null); setConfirming(true); }}
            className="px-5 py-2.5 rounded-lg bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Send Broadcast
          </button>
        ) : (
          <div className="flex flex-col gap-2 items-end">
            <p className="text-sm font-semibold text-text-primary">
              Send to {previewCount ?? "?"} recipient{previewCount !== 1 ? "s" : ""}?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="px-4 py-2 rounded-lg border border-white/20 text-text-secondary text-sm hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending}
                className="px-4 py-2 rounded-lg bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {sending ? "Sending…" : "Confirm Send"}
              </button>
            </div>
          </div>
        )}
      </div>

      {sendError && (
        <p className="text-sm text-reef-coral font-mono">{sendError}</p>
      )}
    </div>
  );
}
