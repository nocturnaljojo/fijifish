"use client";

import { useState, useEffect } from "react";
import { useFlightWindow } from "@/hooks/useFlightWindow";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_SHORT  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(d: Date): string {
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

/** Returns the date of the next Thursday (or today if today is Thursday). */
function nextThursday(from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const dow = d.getDay(); // 0=Sun…6=Sat, Thu=4
  const diff = (4 - dow + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

interface FlightRow {
  key: string;
  flightDate: Date;
  flightLabel: string;   // "Thu 17 Apr"
  orderByLabel: string;  // "Tue 15 Apr 5pm"
  flightDateStr: string; // "2026-04-17" — matches flight_windows.flight_date
}

/** Build the next 4 Thursday flight rows from a base date. */
function buildThursdayRows(base: Date): FlightRow[] {
  const rows: FlightRow[] = [];
  let cursor = nextThursday(base);

  for (let i = 0; i < 4; i++) {
    const flightDate = new Date(cursor);

    // "Order by" = preceding Tuesday 5pm AEST
    const tuesdayBefore = new Date(flightDate);
    tuesdayBefore.setDate(flightDate.getDate() - 2); // Thu - 2 = Tue
    const orderByLabel = `${fmt(tuesdayBefore)} 5pm`;

    const yy = flightDate.getFullYear();
    const mm = String(flightDate.getMonth() + 1).padStart(2, "0");
    const dd = String(flightDate.getDate()).padStart(2, "0");

    rows.push({
      key: `${yy}-${mm}-${dd}`,
      flightDate,
      flightLabel: fmt(flightDate),
      orderByLabel,
      flightDateStr: `${yy}-${mm}-${dd}`,
    });

    // Advance to next Thursday
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return rows;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FlightSchedule() {
  const [todayDate, setTodayDate] = useState<Date | null>(null);
  const { shoppableWindow } = useFlightWindow();

  // Set on client only to avoid hydration mismatch
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTodayDate(new Date()); }, []);

  if (!todayDate) {
    return (
      <div className="flex flex-col gap-2 pt-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-bg-tertiary animate-pulse" />
        ))}
      </div>
    );
  }

  const rows = buildThursdayRows(todayDate);
  const shoppableDateStr = shoppableWindow?.flight_date ?? null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-mono text-text-secondary uppercase tracking-wider">
            Upcoming Flights
          </p>
          <span className="text-xs font-mono text-ocean-teal/70">NAN → SYD · Thursdays</span>
        </div>
        <div className="h-px bg-border-default" />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-2 mb-1">
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Delivery</span>
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider text-right">Order by</span>
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider text-right w-12">Flight</span>
      </div>

      {/* Flight rows */}
      <div className="flex flex-col gap-1 flex-1 min-h-0">
        {rows.map((row) => {
          const isShoppable = row.flightDateStr === shoppableDateStr;
          return (
            <div
              key={row.key}
              className={`grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-2 py-2 rounded-lg border transition-colors ${
                isShoppable
                  ? "bg-ocean-teal/8 border-ocean-teal/25"
                  : "bg-bg-secondary border-border-default"
              }`}
            >
              {/* Delivery date */}
              <span className={`text-xs font-mono leading-tight ${isShoppable ? "text-ocean-teal font-semibold" : "text-text-primary"}`}>
                {row.flightLabel}
                {isShoppable && (
                  <span className="ml-1.5 text-[9px] font-mono font-bold bg-ocean-teal/15 text-ocean-teal border border-ocean-teal/30 px-1 py-0.5 rounded uppercase tracking-wider leading-none align-middle">
                    open
                  </span>
                )}
              </span>

              {/* Order-by deadline */}
              <span className={`text-[10px] font-mono text-right tabular-nums ${isShoppable ? "text-ocean-teal/80" : "text-text-secondary"}`}>
                {row.orderByLabel}
              </span>

              {/* Flight number */}
              <span className={`text-[10px] font-mono text-right w-12 ${isShoppable ? "text-ocean-teal" : "text-text-secondary"}`}>
                FJ911
              </span>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="mt-3 text-[10px] font-mono text-text-secondary/40 leading-relaxed">
        Weekly Thursday delivery. Order by Tuesday 5pm AEST.{" "}
        <span className="whitespace-nowrap">Fiji Airways FJ911, Nadi → Sydney.</span>
      </p>
    </div>
  );
}
