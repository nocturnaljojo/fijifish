"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";

interface Species {
  fish_species_id: string;
  name_fijian: string | null;
  name_english: string;
}

interface LeaderboardEntry {
  postcode: string;
  suburb: string;
  state: string;
  unique_voters: number;
}

interface DeliveryDemandPollProps {
  species: Species[];
}

function deriveState(postcode: string): string {
  const pc = parseInt(postcode, 10);
  if (isNaN(pc)) return "";
  if ((pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920)) return "ACT";
  if (pc >= 2000 && pc <= 2999) return "NSW";
  if (pc >= 3000 && pc <= 3999) return "VIC";
  if (pc >= 4000 && pc <= 4999) return "QLD";
  if (pc >= 5000 && pc <= 5999) return "SA";
  if (pc >= 6000 && pc <= 6999) return "WA";
  if (pc >= 7000 && pc <= 7999) return "TAS";
  if (pc >= 800 && pc <= 999) return "NT";
  return "";
}

type FormState = "idle" | "submitting" | "success" | "error";

export default function DeliveryDemandPoll({ species }: DeliveryDemandPollProps) {
  const { user, isLoaded } = useUser();
  const isSignedIn = isLoaded && !!user;

  const [postcode, setPostcode] = useState("");
  const [suburb, setSuburb] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("idle");
  const [submittedSuburb, setSubmittedSuburb] = useState("");
  const [areaCount, setAreaCount] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const derivedState = deriveState(postcode);
  const postcodeValid = /^\d{4}$/.test(postcode) && derivedState !== "";
  const suburbValid = suburb.trim().length >= 2;
  const canSubmit = postcodeValid && suburbValid && formState !== "submitting";

  useEffect(() => {
    fetch("/api/delivery-demand/vote")
      .then((r) => r.json())
      .then((d: { leaderboard?: LeaderboardEntry[] }) => {
        if (d.leaderboard) setLeaderboard(d.leaderboard);
      })
      .catch(() => {});
  }, []);

  const toggleSpecies = useCallback((id: string) => {
    setSelectedSpecies((prev) => (prev === id ? null : id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !isSignedIn) return;
    setFormState("submitting");

    try {
      const res = await fetch("/api/delivery-demand/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postcode: postcode.trim(),
          suburb: suburb.trim(),
          state: derivedState,
          fish_species_id: selectedSpecies ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        already_voted?: boolean;
        error?: string;
      };

      if (res.ok && (data.success || data.already_voted)) {
        setSubmittedSuburb(suburb.trim());
        // Refresh leaderboard
        const lb = await fetch("/api/delivery-demand/vote").then((r) => r.json()) as { leaderboard?: LeaderboardEntry[] };
        if (lb.leaderboard) {
          setLeaderboard(lb.leaderboard);
          const entry = lb.leaderboard.find((e) => e.postcode === postcode.trim());
          setAreaCount(entry ? entry.unique_voters : 1);
        }
        setFormState("success");
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  }, [canSubmit, isSignedIn, postcode, suburb, derivedState, selectedSpecies]);

  return (
    <section id="delivery-demand" className="px-4 py-12 sm:py-16 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-sunset-gold/20 bg-sunset-gold/5 text-sunset-gold text-xs font-mono tracking-wider uppercase">
              <span
                className="w-1.5 h-1.5 rounded-full bg-sunset-gold inline-block"
                aria-hidden="true"
              />
              Delivery Expansion
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
              Don&apos;t see your area? Tell us where you are
            </h2>
            <p className="text-text-secondary text-sm">
              We&apos;re expanding. The postcodes with the most demand get added first.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left — form */}
            <div>
              {!isLoaded ? (
                /* skeleton */
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-bg-tertiary animate-pulse" />
                  ))}
                </div>
              ) : !isSignedIn ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-bg-tertiary border border-border-default">
                  <div className="flex-1">
                    <p className="text-text-primary text-sm font-medium mb-0.5">
                      Sign in to register your area
                    </p>
                    <p className="text-text-secondary text-xs">
                      We&apos;ll notify you when delivery arrives near you.
                    </p>
                  </div>
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-sm min-h-[44px] hover:bg-[#29b6f6] transition-colors whitespace-nowrap shrink-0"
                  >
                    Sign in
                  </Link>
                </div>
              ) : formState === "success" ? (
                <div className="flex flex-col items-start gap-3 p-5 rounded-xl bg-lagoon-green/5 border border-lagoon-green/20">
                  <span className="text-3xl" aria-hidden="true">🙌</span>
                  <div>
                    <p className="text-text-primary font-semibold">
                      Thanks! We&apos;ve noted {submittedSuburb}.
                    </p>
                    <p className="text-text-secondary text-sm mt-1">
                      {areaCount && areaCount > 1
                        ? `${areaCount} people in your area want fresh fish too. We'll notify you when we expand there.`
                        : "You're the first from your area — spread the word!"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Postcode + suburb */}
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <label
                        htmlFor="dd-postcode"
                        className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1.5"
                      >
                        Postcode
                      </label>
                      <input
                        id="dd-postcode"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={postcode}
                        onChange={(e) =>
                          setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        placeholder="2650"
                        className="w-full px-3 py-3 rounded-lg bg-bg-tertiary border border-border-default text-text-primary font-mono text-sm placeholder:text-text-secondary/40 focus:outline-none focus:border-ocean-teal/50 min-h-[48px]"
                      />
                      {postcode.length === 4 && (
                        <p
                          className={`text-xs font-mono mt-1 ${
                            postcodeValid ? "text-lagoon-green" : "text-reef-coral"
                          }`}
                        >
                          {postcodeValid ? derivedState : "Invalid AU postcode"}
                        </p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <label
                        htmlFor="dd-suburb"
                        className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1.5"
                      >
                        Suburb
                      </label>
                      <input
                        id="dd-suburb"
                        type="text"
                        value={suburb}
                        onChange={(e) => setSuburb(e.target.value.slice(0, 100))}
                        placeholder="Wagga Wagga"
                        className="w-full px-3 py-3 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-sm placeholder:text-text-secondary/40 focus:outline-none focus:border-ocean-teal/50 min-h-[48px]"
                      />
                    </div>
                  </div>

                  {/* Optional species selection */}
                  {species.length > 0 && (
                    <div>
                      <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">
                        Which fish do you want? (optional)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {species.map((s) => {
                          const isSelected = selectedSpecies === s.fish_species_id;
                          const label =
                            s.name_fijian && s.name_fijian !== s.name_english
                              ? `${s.name_fijian} (${s.name_english})`
                              : s.name_english;
                          return (
                            <button
                              key={s.fish_species_id}
                              type="button"
                              onClick={() => toggleSpecies(s.fish_species_id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all min-h-[40px] select-none ${
                                isSelected
                                  ? "bg-sunset-gold/10 border-sunset-gold/40 text-sunset-gold"
                                  : "bg-bg-tertiary border-border-default text-text-secondary hover:border-sunset-gold/30 hover:text-text-primary"
                              }`}
                              aria-pressed={isSelected}
                            >
                              <span aria-hidden="true">{isSelected ? "⭐" : "🐟"}</span>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {formState === "error" && (
                    <p className="text-reef-coral text-sm">
                      Something went wrong. Please try again.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full py-3 px-4 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-sm min-h-[48px] hover:bg-[#29b6f6] active:bg-[#0288d1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {formState === "submitting"
                      ? "Registering…"
                      : "Register My Area"}
                  </button>
                </div>
              )}
            </div>

            {/* Right — leaderboard */}
            <div>
              <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-4">
                Top areas requesting delivery
              </p>
              {leaderboard.length === 0 ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-10 rounded-lg bg-bg-tertiary animate-pulse"
                    />
                  ))}
                  <p className="text-text-secondary text-xs italic pt-1">
                    No votes yet — be the first from your area!
                  </p>
                </div>
              ) : (
                <ol className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <li
                      key={`${entry.postcode}-${i}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary border border-border-default"
                    >
                      <span
                        className={`font-mono text-sm font-bold w-5 text-center ${
                          i === 0
                            ? "text-sunset-gold"
                            : i === 1
                            ? "text-text-secondary"
                            : "text-text-secondary opacity-60"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-text-primary text-sm font-medium">
                          {entry.suburb}
                        </span>
                        <span className="text-text-secondary text-xs font-mono ml-2">
                          {entry.postcode} {entry.state}
                        </span>
                      </div>
                      <span className="font-mono text-sm text-ocean-teal font-semibold whitespace-nowrap">
                        {entry.unique_voters}{" "}
                        <span className="text-text-secondary font-normal text-xs">
                          {entry.unique_voters === 1 ? "person" : "people"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
