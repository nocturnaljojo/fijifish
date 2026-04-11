"use client";

import { useEffect, useState } from "react";
import { FLIGHT_CONFIG, CARGO_CONFIG, THRESHOLDS } from "@/lib/config";

interface UrgencyBannerProps {
  orderCloseAt?: number;
  cargoPercent?: number;
  totalKg?: number;
}

function getTimeLeft(target: number) {
  const diff = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { hours, minutes, totalSeconds };
}

export default function UrgencyBanner({
  orderCloseAt,
  cargoPercent,
  totalKg,
}: UrgencyBannerProps = {}) {
  const closeAt = orderCloseAt ?? FLIGHT_CONFIG.orderCloseAt;
  const cargoPct = cargoPercent ?? CARGO_CONFIG.capacityPercent;
  const totalCapacity = totalKg ?? CARGO_CONFIG.totalKg;

  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(closeAt));

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(closeAt)), 1000);
    return () => clearInterval(timer);
  }, [closeAt]);

  const isCargoUrgent = cargoPct >= THRESHOLDS.cargoAlmostFull;
  const isWindowUrgent = timeLeft.hours < THRESHOLDS.countdownUrgentHours && timeLeft.totalSeconds > 0;

  if (!isCargoUrgent && !isWindowUrgent) return null;

  if (isWindowUrgent) {
    const label =
      timeLeft.hours > 0
        ? `${timeLeft.hours}h ${timeLeft.minutes}m`
        : `${timeLeft.minutes}m`;

    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-reef-coral/30 bg-reef-coral/5 backdrop-blur-sm mb-6"
        role="alert"
      >
        <span className="w-2 h-2 rounded-full bg-reef-coral animate-pulse shrink-0" aria-hidden="true" />
        <p className="text-sm font-mono font-semibold text-reef-coral flex-1">
          🔴 Catch window closing in {label} — last chance to order
        </p>
      </div>
    );
  }

  const kgRemaining = Math.round(totalCapacity * (1 - cargoPct / 100));
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-sunset-gold/30 bg-sunset-gold/5 backdrop-blur-sm mb-6"
      role="alert"
    >
      <span className="w-2 h-2 rounded-full bg-sunset-gold animate-pulse shrink-0" aria-hidden="true" />
      <p className="text-sm font-mono font-semibold text-sunset-gold flex-1">
        ⚠️ Cargo space almost full — only ~{kgRemaining} kg remaining on this flight
      </p>
    </div>
  );
}
