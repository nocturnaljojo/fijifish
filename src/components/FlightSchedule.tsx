"use client";

import { useState, useEffect } from "react";

// ── Schedule data ─────────────────────────────────────────────────────────────
// Fiji Airways published timetable — Nadi (NAN) → Sydney (SYD).
// FJT = UTC+12 | AEST = UTC+10 | FJT is 2h ahead of AEST.
// These times are the timetable values; actual times subject to change.

interface ScheduleDef {
  flightNo: string;
  depFJT: string;   // "HH:MM" in Fiji Time
  arrAEST: string;  // "HH:MM" in AEST
  // days of week this flight operates: 0=Sun…6=Sat, empty = daily
  operatingDays?: number[];
}

const SCHEDULES: ScheduleDef[] = [
  { flightNo: "FJ911", depFJT: "09:30", arrAEST: "11:30" },                 // daily
  { flightNo: "FJ915", depFJT: "19:15", arrAEST: "21:15", operatingDays: [1, 3, 5] }, // Mon/Wed/Fri
];

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface FlightEntry {
  key: string;
  dayLabel: string;   // "Thu 10 Apr"
  flightNo: string;
  depFJT: string;
  arrAEST: string;
  isToday: boolean;
}

function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildSchedule(baseStr: string, numDays: number): FlightEntry[] {
  const [y, mo, dd] = baseStr.split("-").map(Number);
  const entries: FlightEntry[] = [];

  for (let i = 0; i < numDays; i++) {
    const date = new Date(y, mo - 1, dd + i);
    const dow = date.getDay();
    const dayLabel = `${DAY_SHORT[dow]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
    const isToday = i === 0;

    for (const sched of SCHEDULES) {
      const runs =
        !sched.operatingDays || sched.operatingDays.includes(dow);
      if (!runs) continue;
      entries.push({
        key: `${baseStr}-${i}-${sched.flightNo}`,
        dayLabel,
        flightNo: sched.flightNo,
        depFJT: sched.depFJT,
        arrAEST: sched.arrAEST,
        isToday,
      });
    }
  }

  return entries;
}

// Partition entries into first-7-days / remaining-7-days
function splitByDays(entries: FlightEntry[], cutoffDay: number): [FlightEntry[], FlightEntry[]] {
  // Count unique day labels up to cutoff
  const seen = new Set<string>();
  const first: FlightEntry[] = [];
  const rest: FlightEntry[] = [];

  for (const e of entries) {
    seen.add(e.dayLabel);
    if (seen.size <= cutoffDay) first.push(e);
    else rest.push(e);
  }
  return [first, rest];
}

export default function FlightSchedule() {
  const [todayStr, setTodayStr] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Set date on client only to avoid hydration mismatch (intentional pattern)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTodayStr(todayLocalStr()); }, []);

  if (!todayStr) {
    // Skeleton while hydrating
    return (
      <div className="flex flex-col gap-2 pt-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-bg-tertiary animate-pulse" />
        ))}
      </div>
    );
  }

  const allEntries = buildSchedule(todayStr, 14);
  const [first7, rest7] = splitByDays(allEntries, 7);
  const visible = showAll ? allEntries : first7;
  const nextIdx = 0; // first entry is always the next upcoming flight

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-mono text-text-secondary uppercase tracking-wider">
            Upcoming Flights
          </p>
          <span className="text-xs font-mono text-ocean-teal/70">NAN → SYD</span>
        </div>
        <div className="h-px bg-border-default" />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 px-2 mb-1">
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider w-16">Date</span>
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Flight</span>
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider text-right">Dep FJT</span>
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider text-right">Arr AEST</span>
      </div>

      {/* Flight rows */}
      <div className="flex flex-col gap-1 flex-1 min-h-0">
        {visible.map((entry, i) => {
          const isNext = i === nextIdx;
          return (
            <div
              key={entry.key}
              className={`grid grid-cols-[auto_1fr_auto_auto] gap-x-2 items-center px-2 py-1.5 rounded-lg border transition-colors ${
                isNext
                  ? "bg-ocean-teal/8 border-ocean-teal/25"
                  : entry.isToday
                  ? "bg-bg-tertiary border-border-default"
                  : "bg-bg-secondary border-border-default"
              }`}
            >
              {/* Date */}
              <span
                className={`text-[10px] font-mono w-16 leading-tight ${
                  isNext ? "text-ocean-teal" : "text-text-secondary"
                }`}
              >
                {entry.dayLabel}
                {entry.isToday && (
                  <span className="block text-[9px] text-lagoon-green font-semibold tracking-wider uppercase">
                    today
                  </span>
                )}
              </span>

              {/* Flight number + NEXT badge */}
              <span className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-mono font-semibold ${
                    isNext ? "text-ocean-teal" : "text-text-primary"
                  }`}
                >
                  {entry.flightNo}
                </span>
                {isNext && (
                  <span className="text-[9px] font-mono font-bold bg-ocean-teal/15 text-ocean-teal border border-ocean-teal/30 px-1 py-0.5 rounded uppercase tracking-wider leading-none">
                    next
                  </span>
                )}
              </span>

              {/* Dep FJT */}
              <span
                className={`text-xs font-mono text-right tabular-nums ${
                  isNext ? "text-ocean-teal" : "text-text-secondary"
                }`}
              >
                {entry.depFJT}
              </span>

              {/* Arr AEST */}
              <span
                className={`text-xs font-mono text-right tabular-nums ${
                  isNext ? "text-ocean-teal" : "text-text-secondary"
                }`}
              >
                {entry.arrAEST}
              </span>
            </div>
          );
        })}
      </div>

      {/* Show more / show less */}
      {rest7.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-xs font-mono text-ocean-teal/70 hover:text-ocean-teal transition-colors text-left"
        >
          {showAll ? "← Show 7 days" : `Show all 14 days (${rest7.length} more) →`}
        </button>
      )}

      {/* Disclaimer */}
      <p className="mt-2 text-[10px] font-mono text-text-secondary/40 leading-relaxed">
        Times approx. FJT = UTC+12, AEST = UTC+10.{" "}
        <span className="whitespace-nowrap">Confirm with Fiji Airways.</span>
      </p>
    </div>
  );
}
