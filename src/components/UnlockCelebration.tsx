"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UnlockedFish {
  id: string;
  name_fijian: string | null;
  name_english: string;
}

interface UnlockCelebrationProps {
  availableFish: UnlockedFish[];
}

const VOTED_KEY = "fijiFish_voted";
const DISMISSED_KEY = "fijiFish_dismissed_unlock";

export default function UnlockCelebration({ availableFish }: UnlockCelebrationProps) {
  const [toasts, setToasts] = useState<UnlockedFish[]>([]);

  useEffect(() => {
    try {
      const voted: string[] = JSON.parse(localStorage.getItem(VOTED_KEY) ?? "[]");
      const dismissed: string[] = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");

      const celebrate = availableFish.filter(
        (f) => voted.includes(f.id) && !dismissed.includes(f.id),
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (celebrate.length > 0) setToasts(celebrate);
    } catch {
      // localStorage unavailable — skip silently
    }
  }, [availableFish]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    try {
      const dismissed: string[] = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, id]));
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-[70] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((fish) => (
          <motion.div
            key={fish.id}
            className="pointer-events-auto w-72 bg-[#0d1520] border border-sunset-gold/40 rounded-xl p-4 shadow-2xl"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0" aria-hidden="true">🎉</span>
              <div className="flex-1 min-w-0">
                <p className="text-sunset-gold font-bold text-sm mb-0.5">
                  {fish.name_fijian ?? fish.name_english} unlocked!
                </p>
                <p className="text-text-secondary text-xs leading-relaxed">
                  {fish.name_english} is on the next flight. You helped unlock it!
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(fish.id)}
                className="text-text-secondary hover:text-text-primary transition-colors text-lg leading-none shrink-0"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Call this from UnlockBoard when a user successfully votes */
export function recordVoteInStorage(id: string) {
  try {
    const voted: string[] = JSON.parse(localStorage.getItem(VOTED_KEY) ?? "[]");
    if (!voted.includes(id)) {
      localStorage.setItem(VOTED_KEY, JSON.stringify([...voted, id]));
    }
  } catch {
    // ignore
  }
}
