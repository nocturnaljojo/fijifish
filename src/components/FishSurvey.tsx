"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useCallback } from "react";

interface Species {
  fish_species_id: string;
  name_fijian: string | null;
  name_english: string;
  vote_count: number;
}

interface FishSurveyProps {
  species: Species[];
}

export default function FishSurvey({ species }: FishSurveyProps) {
  const { user, isLoaded } = useUser();
  const isSignedIn = isLoaded && !!user;

  const [voteCounts, setVoteCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(species.map((s) => [s.fish_species_id, s.vote_count])),
  );
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState<string | null>(null);
  const [thankYou, setThankYou] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleVote = useCallback(
    async (s: Species) => {
      if (!isSignedIn || voted.has(s.fish_species_id) || loading) return;

      setLoading(s.fish_species_id);
      setAnimating(s.fish_species_id);

      try {
        const res = await fetch("/api/survey/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fish_species_id: s.fish_species_id }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          already_voted?: boolean;
          error?: string;
        };

        if (res.ok && (data.success || data.already_voted)) {
          setVoted((prev) => new Set(prev).add(s.fish_species_id));
          if (!data.already_voted) {
            setVoteCounts((prev) => ({
              ...prev,
              [s.fish_species_id]: (prev[s.fish_species_id] ?? 0) + 1,
            }));
          }
          setThankYou(s.fish_species_id);
          setTimeout(() => setThankYou(null), 3000);
        }
      } catch {
        // silent — vote failure doesn't disrupt UX
      } finally {
        setLoading(null);
        setTimeout(() => setAnimating(null), 400);
      }
    },
    [isSignedIn, voted, loading],
  );

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-ocean-teal/20 bg-ocean-teal/5 text-ocean-teal text-xs font-mono tracking-wider uppercase">
              <span
                className="w-1.5 h-1.5 rounded-full bg-ocean-teal inline-block"
                aria-hidden="true"
              />
              Community Survey
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
              What fish would you like us to bring next?
            </h2>
            <p className="text-text-secondary text-sm">
              Your votes shape what we put on the next flight.
              {totalVotes > 0 && (
                <span className="ml-2 font-mono text-ocean-teal">
                  {totalVotes} vote{totalVotes !== 1 ? "s" : ""} so far
                </span>
              )}
            </p>
          </div>

          {/* Not signed in — prompt to log in */}
          {isLoaded && !isSignedIn ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-bg-tertiary border border-border-default">
              <div className="flex-1">
                <p className="text-text-primary text-sm font-medium mb-0.5">
                  Sign in to cast your vote
                </p>
                <p className="text-text-secondary text-xs">
                  We need to know who&apos;s voting so we can notify you when your fish arrives.
                </p>
              </div>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-sm min-h-[44px] hover:bg-[#29b6f6] transition-colors whitespace-nowrap shrink-0"
              >
                Sign in to vote
              </Link>
            </div>
          ) : !isLoaded ? (
            /* Loading skeleton */
            <div className="flex flex-wrap gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-11 w-36 rounded-xl bg-bg-tertiary animate-pulse"
                />
              ))}
            </div>
          ) : species.length === 0 ? (
            <p className="text-text-secondary text-sm italic">
              No species loaded — check back soon.
            </p>
          ) : (
            /* Species chips */
            <div className="flex flex-wrap gap-3">
              {species.map((s) => {
                const hasVoted = voted.has(s.fish_species_id);
                const isAnimating = animating === s.fish_species_id;
                const isThankYou = thankYou === s.fish_species_id;
                const count = voteCounts[s.fish_species_id] ?? 0;
                const fijianName = s.name_fijian ?? s.name_english;
                const fullLabel =
                  s.name_fijian && s.name_fijian !== s.name_english
                    ? `${s.name_fijian} (${s.name_english})`
                    : s.name_english;

                return (
                  <button
                    key={s.fish_species_id}
                    type="button"
                    onClick={() => handleVote(s)}
                    disabled={hasVoted || loading !== null}
                    className={[
                      "relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all min-h-[44px] select-none",
                      hasVoted
                        ? "bg-ocean-teal/10 border-ocean-teal/40 text-ocean-teal cursor-default"
                        : "bg-bg-tertiary border-border-default text-text-secondary hover:border-ocean-teal/40 hover:text-text-primary active:scale-95",
                      isAnimating ? "scale-95" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={hasVoted}
                    aria-label={`Vote for ${fijianName}${hasVoted ? " (voted)" : ""}`}
                  >
                    <span
                      className={`text-base transition-transform duration-200 ${isAnimating ? "scale-150" : "scale-100"}`}
                      aria-hidden="true"
                    >
                      {hasVoted ? "💙" : "🐟"}
                    </span>
                    <span className={hasVoted ? "text-ocean-teal" : ""}>
                      {isThankYou ? `Vinaka! (${count})` : fullLabel}
                    </span>
                    {count > 0 && !isThankYou && (
                      <span className="font-mono text-xs text-text-secondary opacity-70">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {isSignedIn && (
            <p className="mt-6 text-xs text-text-secondary opacity-50">
              Signed in as {user.primaryEmailAddress?.emailAddress ?? user.fullName ?? "you"} · One vote per species
            </p>
          )}
        </div>
    </div>
  );
}
