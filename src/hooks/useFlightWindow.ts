"use client";

/**
 * src/hooks/useFlightWindow.ts
 *
 * Client hook that surfaces the current/next flight window and its effective status.
 *
 * Strategy:
 *   1. Fetch the most relevant window from Supabase on mount.
 *   2. For time-driven states (upcoming/open/closing_soon/closed), recompute
 *      every 30 seconds so the UI stays current without a page reload.
 *   3. Admin-driven states (packing → delivered, cancelled) are stable DB values
 *      and don't change every 30 seconds — they're still refreshed on the same
 *      interval so live status updates propagate to buyers within ~30 s.
 *
 * Usage:
 *   const { status, isOrderingOpen, timeUntilClose, currentWindow } = useFlightWindow();
 */

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import {
  getFlightWindowStatus,
  isOrderingOpen as computeIsOrderingOpen,
} from "@/lib/flight-window-state";
import type { FlightWindow, FlightWindowStatus } from "@/types/database";

export interface FlightWindowState {
  /** The raw DB row, or null while loading / no window found. */
  currentWindow: FlightWindow | null;
  /** Effective status — time-driven states computed client-side. */
  status: FlightWindowStatus;
  /** Milliseconds until order_close_at (0 when closed). Null while loading. */
  timeUntilClose: number | null;
  /** Milliseconds until order_open_at (0 when already open). Null while loading. */
  timeUntilOpen: number | null;
  /** True when status is 'open' or 'closing_soon' — buyers can order. */
  isOrderingOpen: boolean;
  loading: boolean;
}

const LOADING_STATE: FlightWindowState = {
  currentWindow: null,
  status: "upcoming",
  timeUntilClose: null,
  timeUntilOpen: null,
  isOrderingOpen: false,
  loading: true,
};

function derive(window: FlightWindow | null): FlightWindowState {
  if (!window) {
    return { ...LOADING_STATE, loading: false };
  }

  const now = new Date();
  const status = getFlightWindowStatus(window, now);
  const nowMs = now.getTime();
  const closeMs = new Date(window.order_close_at).getTime();
  const openMs = new Date(window.order_open_at).getTime();

  return {
    currentWindow: window,
    status,
    timeUntilClose: Math.max(0, closeMs - nowMs),
    timeUntilOpen: Math.max(0, openMs - nowMs),
    isOrderingOpen: computeIsOrderingOpen(status),
    loading: false,
  };
}

export function useFlightWindow(): FlightWindowState {
  const [window, setWindow] = useState<FlightWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<FlightWindowState>(LOADING_STATE);

  const fetchWindow = useCallback(async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      const today = new Date().toISOString().split("T")[0];

      // Priority 1: any window in an active admin-driven state
      const { data: activeAdminWindow } = await supabase
        .from("flight_windows")
        .select("*")
        .in("status", ["packing", "shipped", "in_transit", "landed", "customs", "delivering"])
        .order("flight_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeAdminWindow) {
        setWindow(activeAdminWindow as FlightWindow);
        setLoading(false);
        return;
      }

      // Priority 2: next upcoming/open/closed window (flight_date >= today)
      const { data: nextWindow } = await supabase
        .from("flight_windows")
        .select("*")
        .gte("flight_date", today)
        .neq("status", "delivered")
        .neq("status", "cancelled")
        .order("flight_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      setWindow((nextWindow as FlightWindow) ?? null);
    } catch {
      // Non-fatal — banner will fall back to loading state
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    void fetchWindow();
  }, [fetchWindow]);

  // Recompute derived state (and re-fetch) every 30 seconds
  useEffect(() => {
    setState(derive(window));

    const interval = setInterval(() => {
      setState(derive(window));
      // Re-fetch to catch admin state changes
      void fetchWindow();
    }, 30_000);

    return () => clearInterval(interval);
  }, [window, fetchWindow]);

  return loading ? LOADING_STATE : state;
}
