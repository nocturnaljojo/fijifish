"use client";

import CountdownTimer from "./CountdownTimer";
import { CARGO_CONFIG, THRESHOLDS } from "@/lib/config";
import { useFlightWindow } from "@/hooks/useFlightWindow";
import type { FlightWindowStatus } from "@/types/database";

function cargoLabel(pct: number): string {
  if (pct >= THRESHOLDS.cargoLastSpots) return `${pct}% Full — Last spots!`;
  if (pct >= THRESHOLDS.cargoAlmostFull) return `${pct}% Full — Almost gone!`;
  if (pct >= THRESHOLDS.cargoFillingFast) return `${pct}% Full — Filling fast`;
  return `${pct}% Full — Secure your spot`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Australia/Sydney",
  });
}

// ── Post-order banner (packing → delivered / cancelled) ───────────────────────

function PostOrderMessage({ status, flightNumber }: { status: FlightWindowStatus; flightNumber: string | null }) {
  const messages: Partial<Record<FlightWindowStatus, string>> = {
    packing:    "Supplier is packing your order",
    shipped:    `Your fish is on its way! ✈️${flightNumber ? ` ${flightNumber}` : ""}`,
    in_transit: `Your fish is on its way! ✈️${flightNumber ? ` ${flightNumber}` : ""}`,
    landed:     "Flight landed — fish is at the airport",
    customs:    "Clearing BICON customs inspection",
    delivering: "Out for delivery today",
    delivered:  "Delivered! How was your fish?",
    cancelled:  "This order window was cancelled",
  };

  const icon: Partial<Record<FlightWindowStatus, string>> = {
    packing:    "📦",
    shipped:    "✈️",
    in_transit: "✈️",
    landed:     "🛬",
    customs:    "🔍",
    delivering: "🚚",
    delivered:  "🐟",
    cancelled:  "❌",
  };

  const colors: Partial<Record<FlightWindowStatus, string>> = {
    delivering: "text-lagoon-green",
    delivered:  "text-lagoon-green",
    cancelled:  "text-reef-coral",
  };

  const msg = messages[status] ?? "Shipment in progress";
  const ic = icon[status] ?? "📦";
  const color = colors[status] ?? "text-ocean-teal";

  return (
    <div className="flex items-center justify-center gap-2.5 py-2.5 sm:py-3">
      <span className="text-lg" aria-hidden="true">{ic}</span>
      <span className={`text-sm font-semibold ${color}`}>{msg}</span>
    </div>
  );
}

// ── Main banner ───────────────────────────────────────────────────────────────

export default function DeliveryBanner() {
  const { currentWindow, status, loading } = useFlightWindow();

  const CARGO_PCT = CARGO_CONFIG.capacityPercent; // TODO: wire to inventory_availability in Phase 1b

  const barColor =
    CARGO_PCT >= 90
      ? "#ff7043"
      : CARGO_PCT >= 70
      ? "#ffab40"
      : "#4fc3f7";

  // ── Post-order states: simplified single-row banner ──────────────────────
  const POST_ORDER_STATES: FlightWindowStatus[] = [
    "packing", "shipped", "in_transit", "landed",
    "customs", "delivering", "delivered", "cancelled",
  ];

  if (!loading && currentWindow && POST_ORDER_STATES.includes(status)) {
    return (
      <div
        className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md"
        style={{ background: "rgba(10,15,26,0.97)" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <PostOrderMessage status={status} flightNumber={currentWindow.flight_number} />
        </div>
      </div>
    );
  }

  // ── Time-driven states: full 3-column banner ─────────────────────────────

  // Determine label and countdown target based on status
  let leftLabel: string;
  let leftValue: string;
  let rightLabel: string;
  let countdownTarget: number | null = null;
  let isUrgent = false;

  if (!currentWindow || loading) {
    leftLabel = "Next Delivery";
    leftValue = "—";
    rightLabel = "Catch Window Closes";
  } else if (status === "upcoming") {
    leftLabel = "Next Order Window";
    leftValue = formatDate(currentWindow.order_open_at);
    rightLabel = "Window Opens In";
    countdownTarget = new Date(currentWindow.order_open_at).getTime();
  } else if (status === "open") {
    leftLabel = "Next Delivery";
    leftValue = currentWindow.flight_date
      ? formatDate(currentWindow.flight_date + "T00:00:00")
      : "—";
    rightLabel = "Catch Window Closes";
    countdownTarget = new Date(currentWindow.order_close_at).getTime();
  } else if (status === "closing_soon") {
    leftLabel = "Next Delivery";
    leftValue = currentWindow.flight_date
      ? formatDate(currentWindow.flight_date + "T00:00:00")
      : "—";
    rightLabel = "Closing Soon!";
    countdownTarget = new Date(currentWindow.order_close_at).getTime();
    isUrgent = true;
  } else {
    // closed — show next window if we have date info
    leftLabel = "Orders Closed";
    leftValue = "Next window TBA";
    rightLabel = "Window Status";
    countdownTarget = null;
  }

  return (
    <div
      className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md"
      style={{ background: "rgba(10,15,26,0.97)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-2 md:py-0">
        <div className="flex flex-col md:flex-row md:items-stretch gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">

          {/* Left — status / delivery label */}
          <div className="flex items-center gap-2.5 md:py-3 py-2 md:pr-6">
            <span className="text-lg" aria-hidden="true">
              {status === "upcoming" ? "🗓️" : status === "closed" ? "🔒" : "✈️"}
            </span>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-secondary leading-none mb-0.5">
                {leftLabel}
              </p>
              <p className={`text-sm font-bold leading-none ${isUrgent ? "text-reef-coral" : "text-text-primary"}`}>
                {leftValue}
              </p>
            </div>
          </div>

          {/* Centre — cargo bar (only relevant when open or closing_soon) */}
          {(status === "open" || status === "closing_soon") && (
            <div className="hidden md:flex items-center gap-3 md:py-3 md:px-6 flex-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-secondary whitespace-nowrap">
                Flight Cargo
              </span>
              <div
                className="flex-1 h-3 rounded-full overflow-hidden"
                style={{ background: "rgba(30,42,58,0.8)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${CARGO_PCT}%`, backgroundColor: barColor }}
                />
              </div>
              <span
                className="text-xs font-mono font-bold whitespace-nowrap"
                style={{ color: barColor }}
              >
                {cargoLabel(CARGO_PCT)}
              </span>
            </div>
          )}

          {/* Right — countdown */}
          <div className="flex items-center gap-2.5 md:py-3 md:pl-6 py-2">
            {status === "closed" ? (
              <>
                <span
                  className="w-2 h-2 rounded-full bg-text-secondary shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-secondary leading-none mb-0.5">
                    Window Status
                  </p>
                  <p className="text-sm font-bold text-text-secondary font-mono leading-none">
                    CLOSED
                  </p>
                </div>
              </>
            ) : countdownTarget ? (
              <>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${isUrgent ? "bg-reef-coral animate-pulse" : "bg-reef-coral animate-pulse"}`}
                  aria-hidden="true"
                />
                <div>
                  <p
                    className={`text-[9px] font-mono uppercase tracking-[0.2em] leading-none mb-0.5 ${isUrgent ? "text-reef-coral/70" : "text-reef-coral/70"}`}
                  >
                    {rightLabel}
                  </p>
                  <CountdownTimer
                    targetTimestamp={countdownTarget}
                    className="text-lg sm:text-xl font-bold leading-none"
                    baseColor={isUrgent ? "text-reef-coral" : "text-ocean-teal"}
                    urgentColor="text-reef-coral"
                  />
                </div>
              </>
            ) : null}
          </div>

        </div>

        {/* Mobile: cargo bar */}
        {(status === "open" || status === "closing_soon") && (
          <div className="md:hidden pb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
            <span className="text-text-secondary shrink-0">Cargo</span>
            <div
              className="flex-1 h-2.5 rounded-full overflow-hidden"
              style={{ background: "rgba(30,42,58,0.8)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${CARGO_PCT}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="font-bold shrink-0" style={{ color: barColor }}>
              {cargoLabel(CARGO_PCT)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
