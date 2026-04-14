"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import AuthPromptModal from "./AuthPromptModal";
import { recordVoteInStorage } from "./UnlockCelebration";

export interface LockedFish {
  id: string;
  name_english: string;
  name_fijian: string | null;
  name_scientific: string | null;
  unlock_votes_target: number;
  current_votes: number;
}

interface UnlockBoardProps {
  lockedFish: LockedFish[];
  isSignedIn: boolean;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  const isAlmostDone = pct >= 80;
  const isComplete = pct >= 100;

  return (
    <div className="flex-1 flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isComplete
              ? "bg-sunset-gold"
              : isAlmostDone
              ? "bg-ocean-teal"
              : "bg-ocean-teal/50"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-[11px] font-mono text-text-secondary whitespace-nowrap shrink-0">
        {value}/{max}
      </span>
    </div>
  );
}

export default function UnlockBoard({ lockedFish, isSignedIn }: UnlockBoardProps) {
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(lockedFish.map((f) => [f.id, f.current_votes])),
  );
  const [voted, setVoted] = useState<Set<string>>(new Set());

  // Restore previously-voted species from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("fijiFish_voted") ?? "[]") as string[];
      if (stored.length > 0) setVoted(new Set(stored));
    } catch {
      // ignore corrupt storage
    }
  }, []);
  const [loading, setLoading] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);

  const sorted = [...lockedFish].sort(
    (a, b) => (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0),
  );

  const handleVote = useCallback(
    async (fish: LockedFish) => {
      if (!isSignedIn) {
        setModalOpen(true);
        return;
      }
      if (voted.has(fish.id) || loading) return;

      setLoading(fish.id);
      try {
        const res = await fetch("/api/survey/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fish_species_id: fish.id }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          already_voted?: boolean;
          new_vote_count?: number;
        };

        if (res.ok && (data.success || data.already_voted)) {
          setVoted((prev) => new Set(prev).add(fish.id));
          recordVoteInStorage(fish.id);
          if (data.new_vote_count !== undefined) {
            const newCount = data.new_vote_count;
            setVoteCounts((prev) => ({ ...prev, [fish.id]: newCount }));
            if (newCount >= fish.unlock_votes_target) {
              setJustUnlocked((prev) => new Set(prev).add(fish.id));
            }
          } else if (!data.already_voted) {
            setVoteCounts((prev) => ({
              ...prev,
              [fish.id]: (prev[fish.id] ?? 0) + 1,
            }));
          }
        }
      } catch {
        // silent — vote failure doesn't disrupt UX
      } finally {
        setLoading(null);
      }
    },
    [isSignedIn, voted, loading],
  );

  if (lockedFish.length === 0) return null;

  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full border border-ocean-teal/20 bg-ocean-teal/5 text-ocean-teal text-xs font-mono tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-ocean-teal inline-block" aria-hidden="true" />
            Unlock the Next Catch
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-1">
            What&apos;s Coming Next?
          </h2>
          <p className="text-text-secondary text-sm">
            Vote for the fish you want on the next flight.{" "}
            <span className="text-ocean-teal font-mono">30 votes</span> unlocks a new species.
          </p>
        </div>

        {/* Leaderboard rows */}
        <div>
          {sorted.map((fish, i) => {
            const votes = voteCounts[fish.id] ?? 0;
            const target = fish.unlock_votes_target;
            const hasVoted = voted.has(fish.id);
            const isLoading = loading === fish.id;
            const isUnlocked = justUnlocked.has(fish.id);
            const remaining = Math.max(0, target - votes);
            const pct = Math.min(100, target > 0 ? Math.round((votes / target) * 100) : 0);
            const displayName = fish.name_fijian ?? fish.name_english;

            return (
              <motion.div
                key={fish.id}
                className={`flex items-center gap-4 px-6 py-4 border-b border-white/5 last:border-0 transition-colors ${
                  isUnlocked ? "bg-sunset-gold/5" : "hover:bg-white/3"
                }`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                {/* Rank + name */}
                <div className="w-6 shrink-0 text-center">
                  <span className="text-xs font-mono text-text-secondary">{i + 1}</span>
                </div>

                <div className="w-28 sm:w-36 shrink-0">
                  <p className={`text-sm font-semibold leading-tight ${isUnlocked ? "text-sunset-gold" : "text-text-primary"}`}>
                    {displayName}
                  </p>
                  {fish.name_fijian && fish.name_fijian !== fish.name_english && (
                    <p className="text-[11px] text-text-secondary truncate">{fish.name_english}</p>
                  )}
                </div>

                {/* Progress */}
                <div className="flex-1 min-w-0">
                  {isUnlocked ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sunset-gold text-xs font-mono font-bold animate-pulse">
                        🎉 UNLOCKED
                      </span>
                      <span className="text-sunset-gold/60 text-[10px] font-mono">
                        Coming on the next flight
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <ProgressBar value={votes} max={target} />
                      {remaining > 0 && (
                        <p className="text-[10px] font-mono text-text-secondary">
                          {pct >= 80 ? "🔥 " : ""}{remaining} more vote{remaining !== 1 ? "s" : ""} to unlock
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Vote button */}
                <div className="shrink-0">
                  {isUnlocked ? (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-sunset-gold/10 border border-sunset-gold/30 text-sunset-gold text-xs font-mono"
                    >
                      ✓ Unlocked
                    </span>
                  ) : hasVoted ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-ocean-teal/10 border border-ocean-teal/20 text-ocean-teal text-xs font-mono">
                      ✓ Voted
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleVote(fish)}
                      className="px-3 py-1.5 rounded-full bg-ocean-teal text-bg-primary text-xs font-bold font-mono hover:bg-[#29b6f6] active:scale-95 transition-all disabled:opacity-50 min-w-[64px] text-center"
                    >
                      {isLoading ? "…" : isSignedIn ? "Vote" : "Sign up"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between gap-4">
          <p className="text-[11px] text-text-secondary">
            {isSignedIn
              ? "Voted species get priority on the next flight window."
              : "Sign up to vote — we\u2019ll notify you when your fish is unlocked."}
          </p>
          {!isSignedIn && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="shrink-0 text-xs text-ocean-teal hover:text-[#29b6f6] font-mono transition-colors"
            >
              Sign up →
            </button>
          )}
        </div>
      </div>

      <AuthPromptModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        message="Sign up to vote and help unlock new fish for your community. We\u2019ll notify you when your voted species gets added to the next flight."
      />
    </>
  );
}
