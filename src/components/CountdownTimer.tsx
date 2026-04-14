"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetTimestamp: number;
  className?: string;
  urgentColor?: string;
  baseColor?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function getTimeLeft(targetTs: number) {
  const diff = Math.max(0, targetTs - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
}

export default function CountdownTimer({
  targetTimestamp,
  className = "",
  urgentColor,
  baseColor,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: -1 });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(getTimeLeft(targetTimestamp)); // initialise immediately so client shows real time, not "--h --m --s", after mount
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetTimestamp));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetTimestamp]);

  const isCritical =
    timeLeft.totalSeconds > 0 && timeLeft.totalSeconds < 6 * 3600;

  if (timeLeft.totalSeconds === -1) {
    return (
      <span className={`font-mono tabular-nums ${baseColor ?? "text-ocean-teal"} ${className}`}>
        --h --m --s
      </span>
    );
  }

  if (timeLeft.totalSeconds === 0) {
    return (
      <span className={`font-mono font-semibold text-reef-coral ${className}`}>
        CLOSED
      </span>
    );
  }

  const criticalClass = urgentColor ?? "text-sunset-gold";

  // >24h: "Xd Xh" — no seconds needed, too far away
  if (timeLeft.totalSeconds > 86400) {
    return (
      <span className={`font-mono tabular-nums ${baseColor ?? "text-ocean-teal"} ${className}`}>
        {timeLeft.days}d {pad(timeLeft.hours)}h
      </span>
    );
  }

  // <1h: "Xm Xs" in reef-coral + pulse — final countdown urgency
  if (timeLeft.totalSeconds <= 3600) {
    return (
      <span className={`font-mono tabular-nums text-reef-coral animate-pulse ${className}`}>
        {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
      </span>
    );
  }

  // 1h–24h: "Xh Xm Xs"
  return (
    <span
      className={`font-mono tabular-nums ${
        isCritical
          ? `${criticalClass} animate-pulse`
          : (baseColor ?? "text-ocean-teal")
      } ${className}`}
    >
      {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m{" "}
      <span className="text-text-primary">{pad(timeLeft.seconds)}s</span>
    </span>
  );
}
