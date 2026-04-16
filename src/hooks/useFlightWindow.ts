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
 *   const { status, isOrderingOpen, shoppableWindow, isPreOrderMode } = useFlightWindow();
 */

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import {
  getFlightWindowStatus,
  isOrderingOpen as computeIsOrderingOpen,
} from "@/lib/flight-window-state";
import type { FlightWindow, FlightWindowStatus } from "@/types/database";

export interface FlightWindowState {
  /** The raw DB row used for status display (admin-driven if in packing+, else time-driven). */
  currentWindow: FlightWindow | null;
  /** The window buyers can order against RIGHT NOW. May differ from currentWindow. */
  shoppableWindow: FlightWindow | null;
  /** True when shoppableWindow is upcoming (not yet open) — pre-order mode. */
  isPreOrderMode: boolean;
  /** Effective status of currentWindow — time-driven states computed client-side. */
  status: FlightWindowStatus;
  /** Milliseconds until order_close_at (0 when closed). Null while loading. */
  timeUntilClose: number | null;
  /** Milliseconds until order_open_at (0 when already open). Null while loading. */
  timeUntilOpen: number | null;
  /** True when status is 'open' or 'closing_soon' — buyers can order the current window. */
  isOrderingOpen: boolean;
  loading: boolean;
}

interface WindowFetch {
  adminWindow: FlightWindow | null;
  openWindow: FlightWindow | null;
  upcomingWindow: FlightWindow | null;
}

const LOADING_STATE: FlightWindowState = {
  currentWindow: null,
  shoppableWindow: null,
  isPreOrderMode: false,
  status: "upcoming",
  timeUntilClose: null,
  timeUntilOpen: null,
  isOrderingOpen: false,
  loading: true,
};

function derive(fetch: WindowFetch): FlightWindowState {
  const { adminWindow, openWindow, upcomingWindow } = fetch;

  // currentWindow: admin-driven state for post-order banner, else the soonest time-driven
  const current = adminWindow ?? openWindow ?? upcomingWindow ?? null;

  // shoppableWindow: open window first, then upcoming (even alongside an admin window)
  const shoppable = openWindow ?? upcomingWindow ?? null;
  const isPreOrderMode = shoppable !== null && openWindow === null;

  if (!current) {
    return { ...LOADING_STATE, loading: false, shoppableWindow: null, isPreOrderMode: false };
  }

  const now = new Date();
  const status = getFlightWindowStatus(current, now);
  const nowMs = now.getTime();
  const closeMs = new Date(current.order_close_at).getTime();
  const openMs = new Date(current.order_open_at).getTime();

  return {
    currentWindow: current,
    shoppableWindow: shoppable,
    isPreOrderMode,
    status,
    timeUntilClose: Math.max(0, closeMs - nowMs),
    timeUntilOpen: Math.max(0, openMs - nowMs),
    isOrderingOpen: computeIsOrderingOpen(status),
    loading: false,
  };
}

export function useFlightWindow(): FlightWindowState {
  const [fetched, setFetched] = useState<WindowFetch>({
    adminWindow: null,
    openWindow: null,
    upcomingWindow: null,
  });
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<FlightWindowState>(LOADING_STATE);

  const fetchWindows = useCallback(async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      const now = new Date().toISOString();

      // Run all 3 queries in parallel for speed
      const [adminRes, openRes, upcomingRes] = await Promise.all([
        // 1. Admin-driven post-order window (packing → delivering)
        supabase
          .from("flight_windows")
          .select("*")
          .in("status", ["packing", "shipped", "in_transit", "landed", "customs", "delivering"])
          .order("flight_date", { ascending: false })
          .limit(1)
          .maybeSingle(),

        // 2. Currently-open window (opened but not yet closed, not admin-advanced)
        supabase
          .from("flight_windows")
          .select("*")
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
          .maybeSingle(),

        // 3. Next upcoming window (not yet open)
        supabase
          .from("flight_windows")
          .select("*")
          .gt("order_open_at", now)
          .neq("status", "delivered")
          .neq("status", "cancelled")
          .order("order_open_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      setFetched({
        adminWindow: (adminRes.data as FlightWindow) ?? null,
        openWindow: (openRes.data as FlightWindow) ?? null,
        upcomingWindow: (upcomingRes.data as FlightWindow) ?? null,
      });
    } catch {
      // Non-fatal — banner falls back to loading state
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    void fetchWindows();
  }, [fetchWindows]);

  // Recompute derived state (and re-fetch) every 30 seconds
  useEffect(() => {
    setState(derive(fetched));

    const interval = setInterval(() => {
      setState(derive(fetched));
      void fetchWindows();
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetched, fetchWindows]);

  return loading ? LOADING_STATE : state;
}
