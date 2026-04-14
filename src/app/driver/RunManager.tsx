"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DeliveryRun, DeliveryStop } from "@/types/database";

interface StopWithRelations extends DeliveryStop {
  orders: {
    id: string;
    status: string;
    total_aud_cents: number;
    delivery_address: string | null;
    delivery_notes: string | null;
    order_items: {
      quantity_kg: number;
      fish_species: { name_english: string } | null;
    }[];
  } | null;
  customers: {
    users: { full_name: string | null; phone: string | null } | null;
  } | null;
}

interface RunWithWindow extends DeliveryRun {
  flight_windows: {
    flight_number: string | null;
    flight_date: string;
    canberra_arrival_time: string | null;
  } | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "text-text-secondary",
  arrived: "text-sunset-gold",
  delivered: "text-lagoon-green",
  skipped: "text-text-secondary/50 line-through",
  escalated: "text-reef-coral",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  arrived: "Arrived",
  delivered: "Delivered",
  skipped: "Skipped",
  escalated: "Escalated",
};

export default function RunManager({
  run,
  stops,
}: {
  run: RunWithWindow;
  stops: StopWithRelations[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = run.status === "active";
  const allDone = stops.every((s) => s.status === "delivered" || s.status === "skipped");
  const completedCount = stops.filter((s) => s.status === "delivered").length;

  // GPS polling while run is active
  useEffect(() => {
    if (!isActive) return;

    function logGps() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void fetch("/api/driver/gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              run_id: run.id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
        },
        () => { /* GPS denied — silent */ },
        { timeout: 10000, enableHighAccuracy: false },
      );
    }

    logGps(); // immediate first log
    gpsIntervalRef.current = setInterval(logGps, 60_000);

    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, [isActive, run.id]);

  async function callApi(body: Record<string, unknown>) {
    setError(null);
    const res = await fetch("/api/driver", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    router.refresh();
  }

  async function handleAction(action: string, runId?: string, stopId?: string) {
    setLoading(action + (stopId ?? runId ?? ""));
    try {
      await callApi({ action, run_id: runId, stop_id: stopId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  const flightInfo = run.flight_windows;

  return (
    <div className="flex flex-col gap-5">
      {/* Flight info banner */}
      {flightInfo && (
        <div className="bg-ocean-teal/8 border border-ocean-teal/20 rounded-xl p-4">
          <p className="text-xs font-mono text-ocean-teal uppercase tracking-widest mb-1">Flight</p>
          <p className="font-bold text-text-primary">
            {flightInfo.flight_number ?? "—"} · {flightInfo.flight_date}
          </p>
          {flightInfo.canberra_arrival_time && (
            <p className="text-sm text-text-secondary mt-0.5">
              CBR arrival:{" "}
              {new Date(flightInfo.canberra_arrival_time).toLocaleTimeString("en-AU", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Australia/Sydney",
              })}{" "}
              AEST
            </p>
          )}
        </div>
      )}

      {/* Run status + progress */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">
            Run status
          </p>
          <p className="font-bold text-text-primary capitalize">{run.status}</p>
          <p className="text-sm text-text-secondary mt-0.5">
            {completedCount} / {stops.length} delivered
          </p>
        </div>

        {run.status === "planned" && (
          <button
            onClick={() => void handleAction("start_run", run.id)}
            disabled={!!loading}
            className="px-5 py-3 rounded-xl bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[56px]"
          >
            {loading === "start_run" + run.id ? "Starting…" : "Start Run"}
          </button>
        )}

        {isActive && allDone && (
          <button
            onClick={() => void handleAction("complete_run", run.id)}
            disabled={!!loading}
            className="px-5 py-3 rounded-xl bg-lagoon-green text-bg-primary text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[56px]"
          >
            {loading === "complete_run" + run.id ? "Completing…" : "Complete Run"}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-reef-coral font-mono px-1">{error}</p>
      )}

      {/* Stop list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest">
          Stops ({stops.length})
        </h2>

        {stops.map((stop) => {
          const customer = stop.customers?.users;
          const order = stop.orders;
          const items = order?.order_items ?? [];
          const isDone = stop.status === "delivered" || stop.status === "skipped";
          const loadingKey = loading?.slice(-stop.id.length);
          const isThisLoading = loading?.endsWith(stop.id);

          return (
            <div
              key={stop.id}
              className={`bg-white/[0.03] border rounded-xl p-4 flex flex-col gap-3 ${
                isDone ? "border-white/5 opacity-60" : "border-white/10"
              }`}
            >
              {/* Stop header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-white/10 text-xs font-mono font-bold text-text-secondary flex items-center justify-center shrink-0">
                    {stop.sequence_number}
                  </span>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">
                      {customer?.full_name ?? "Unknown customer"}
                    </p>
                    {customer?.phone && (
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-xs text-ocean-teal"
                      >
                        {customer.phone}
                      </a>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-mono ${STATUS_COLOR[stop.status] ?? "text-text-secondary"}`}>
                  {STATUS_LABEL[stop.status] ?? stop.status}
                </span>
              </div>

              {/* Address */}
              {stop.address && (
                <p className="text-sm text-text-secondary leading-relaxed">{stop.address}</p>
              )}
              {!stop.address && order?.delivery_address && (
                <p className="text-sm text-text-secondary leading-relaxed">{order.delivery_address}</p>
              )}

              {/* Items */}
              {items.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {items.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-text-secondary font-mono"
                    >
                      {item.quantity_kg}kg {item.fish_species?.name_english ?? "fish"}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {order?.delivery_notes && (
                <p className="text-xs text-sunset-gold bg-sunset-gold/8 border border-sunset-gold/20 rounded-lg px-3 py-2">
                  Note: {order.delivery_notes}
                </p>
              )}

              {/* Actions */}
              {!isDone && isActive && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {stop.status === "pending" && (
                    <button
                      onClick={() => void handleAction("mark_arrived", undefined, stop.id)}
                      disabled={!!loading}
                      className="flex-1 min-h-[48px] px-4 py-2 rounded-xl border border-sunset-gold/40 text-sunset-gold text-sm font-semibold hover:bg-sunset-gold/8 disabled:opacity-50 transition-colors"
                    >
                      {isThisLoading && loading?.startsWith("mark_arrived") ? "…" : "Mark Arrived"}
                    </button>
                  )}
                  {(stop.status === "arrived" || stop.status === "pending") && order && (
                    <Link
                      href={`/driver/deliver/${stop.id}`}
                      className="flex-1 min-h-[48px] px-4 py-2 rounded-xl bg-lagoon-green text-bg-primary text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                      Deliver + Photo
                    </Link>
                  )}
                  {stop.status === "pending" && (
                    <button
                      onClick={() => void handleAction("skip_stop", undefined, stop.id)}
                      disabled={!!loading}
                      className="px-4 py-2 min-h-[48px] rounded-xl border border-white/15 text-text-secondary text-sm hover:text-text-primary disabled:opacity-50 transition-colors"
                    >
                      Skip
                    </button>
                  )}
                </div>
              )}

              {/* Navigate button (always shown while active) */}
              {!isDone && isActive && (stop.address ?? order?.delivery_address) && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(stop.address ?? order?.delivery_address ?? "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-ocean-teal font-mono flex items-center gap-1"
                >
                  Open in Maps →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
