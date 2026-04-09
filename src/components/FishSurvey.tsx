"use client";

import { useEffect, useState, useCallback } from "react";

interface Species {
  fish_species_id: string;
  name_fijian: string | null;
  name_english: string;
  vote_count: number;
}

interface FishSurveyProps {
  species: Species[];
}

const SESSION_KEY = "fijifish_survey_session";
const VOTED_KEY = "fijifish_voted_species";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getVotedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveVoted(set: Set<string>): void {
  localStorage.setItem(VOTED_KEY, JSON.stringify(Array.from(set)));
}

export default function FishSurvey({ species }: FishSurveyProps) {
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(species.map((s) => [s.fish_species_id, s.vote_count])),
  );
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState<string | null>(null);
  const [thankYou, setThankYou] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    setVoted(getVotedSet());
  }, []);

  const handleVote = useCallback(
    async (s: Species) => {
      if (voted.has(s.fish_species_id) || loading) return;

      const sessionId = getOrCreateSessionId();
      setLoading(s.fish_species_id);
      setAnimating(s.fish_species_id);

      try {
        const res = await fetch("/api/survey/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fish_species_id: s.fish_species_id,
            session_id: sessionId,
          }),
        });
        const data = (await res.json()) as { success?: boolean; already_voted?: boolean; error?: string };

        if (res.ok && (data.success || data.already_voted)) {
          const newVoted = new Set(voted).add(s.fish_species_id);
          setVoted(newVoted);
          saveVoted(newVoted);
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
        // Vote failure is silent — don't disrupt UX
      } finally {
        setLoading(null);
        setTimeout(() => setAnimating(null), 400);
      }
    },
    [voted, loading],
  );

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-ocean-teal/20 bg-ocean-teal/5 text-ocean-teal text-xs font-mono tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-ocean-teal inline-block" aria-hidden="true" />
              Community Survey
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
              What fish would you like us to bring next?
            </h2>
            <p className="text-text-secondary text-sm">
              Tap to vote — your choices shape what we bring on the next flight.
              {totalVotes > 0 && (
                <span className="ml-2 font-mono text-ocean-teal">
                  {totalVotes} vote{totalVotes !== 1 ? "s" : ""} so far
                </span>
              )}
            </p>
          </div>

          {/* Species chips */}
          {species.length === 0 ? (
            <p className="text-text-secondary text-sm italic">
              No species loaded — check back soon.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {species.map((s) => {
                const hasVoted = voted.has(s.fish_species_id);
                const isAnimating = animating === s.fish_species_id;
                const isThankYou = thankYou === s.fish_species_id;
                const count = voteCounts[s.fish_species_id] ?? 0;
                const displayName = s.name_fijian ?? s.name_english;

                return (
                  <button
                    key={s.fish_species_id}
                    type="button"
                    onClick={() => handleVote(s)}
                    disabled={hasVoted || loading !== null}
                    className={[
                      "relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all min-h-[44px]",
                      "select-none",
                      hasVoted
                        ? "bg-ocean-teal/10 border-ocean-teal/40 text-ocean-teal cursor-default"
                        : "bg-bg-tertiary border-border-default text-text-secondary hover:border-ocean-teal/40 hover:text-text-primary hover:bg-bg-tertiary active:scale-95",
                      isAnimating ? "scale-95" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={hasVoted}
                    aria-label={`Vote for ${displayName}${hasVoted ? " (voted)" : ""}`}
                  >
                    <span
                      className={`text-base transition-transform duration-200 ${
                        isAnimating ? "scale-150" : "scale-100"
                      }`}
                      aria-hidden="true"
                    >
                      {hasVoted ? "💙" : "🐟"}
                    </span>
                    <span className={hasVoted ? "text-ocean-teal" : ""}>
                      {isThankYou
                        ? `Vinaka! (${count})`
                        : displayName}
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

          <p className="mt-6 text-xs text-text-secondary opacity-60">
            Anonymous voting — no account required. One vote per species per device.
          </p>
        </div>
      </div>
    </section>
  );
}
