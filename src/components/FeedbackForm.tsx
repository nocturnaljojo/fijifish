"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const FEEDBACK_TYPES = [
  { value: "general", label: "General" },
  { value: "delivery", label: "Delivery" },
  { value: "quality", label: "Fish Quality" },
  { value: "pricing", label: "Pricing" },
  { value: "species_request", label: "New Species Request" },
  { value: "website", label: "Website" },
] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number]["value"];

type FormState = "idle" | "submitting" | "success" | "error";

interface FeedbackFormProps {
  clerkId?: string;
}

export default function FeedbackForm({ clerkId }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [formState, setFormState] = useState<FormState>("idle");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const reset = useCallback(() => {
    setType("general");
    setMessage("");
    setRating(null);
    setHoverRating(null);
    setFormState("idle");
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setTimeout(reset, 300);
  }, [reset]);

  const handleSubmit = useCallback(async () => {
    if (message.trim().length < 3 || formState === "submitting") return;
    setFormState("submitting");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback_type: type,
          message: message.trim(),
          rating: rating ?? undefined,
          clerk_id: clerkId ?? undefined,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        setFormState("success");
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  }, [message, type, rating, clerkId, formState]);

  const displayRating = hoverRating ?? rating;

  return (
    <>
      {/* Trigger — renders wherever placed */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-text-secondary hover:text-ocean-teal transition-colors"
      >
        Give Feedback
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Panel — slides up on mobile */}
          <div
            ref={dialogRef}
            className="relative w-full sm:max-w-lg bg-bg-secondary border border-border-default rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="feedback-title"
                  className="text-lg font-bold text-text-primary"
                >
                  Share Your Feedback
                </h2>
                <p className="text-text-secondary text-sm mt-0.5">
                  We read every message. Vinaka!
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 text-text-secondary hover:text-text-primary transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-tertiary"
                aria-label="Close feedback form"
              >
                ✕
              </button>
            </div>

            {formState === "success" ? (
              <div className="py-8 text-center flex flex-col items-center gap-4">
                <span className="text-5xl" aria-hidden="true">🙏</span>
                <div>
                  <p className="text-text-primary font-semibold text-lg">
                    Thank you for your feedback.
                  </p>
                  <p className="text-text-secondary text-sm mt-1">
                    We read every message. Vinaka vakalevu!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-sm mt-2 min-h-[44px] hover:bg-[#29b6f6] transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Type selector */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="feedback-type"
                    className="text-xs font-mono text-text-secondary uppercase tracking-wider"
                  >
                    Category
                  </label>
                  <select
                    id="feedback-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as FeedbackType)}
                    className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-sm focus:outline-none focus:border-ocean-teal/50 min-h-[48px] appearance-none"
                  >
                    {FEEDBACK_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="feedback-message"
                    className="text-xs font-mono text-text-secondary uppercase tracking-wider"
                  >
                    Message
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    rows={4}
                    maxLength={2000}
                    className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-ocean-teal/50 resize-none"
                  />
                  <p className="text-xs text-text-secondary font-mono text-right opacity-50">
                    {message.length}/2000
                  </p>
                </div>

                {/* Star rating */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                    Overall rating (optional)
                  </span>
                  <div
                    className="flex gap-1"
                    role="radiogroup"
                    aria-label="Rating from 1 to 5 stars"
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setRating((prev) => (prev === star ? null : star))
                        }
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="text-2xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-transform active:scale-90"
                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        aria-pressed={rating === star}
                      >
                        <span
                          className={
                            displayRating !== null && star <= displayRating
                              ? "text-sunset-gold"
                              : "text-text-secondary opacity-30"
                          }
                        >
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {formState === "error" && (
                  <p className="text-reef-coral text-sm">
                    Something went wrong. Please try again.
                  </p>
                )}

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    message.trim().length < 3 || formState === "submitting"
                  }
                  className="w-full py-3 px-4 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-sm min-h-[48px] hover:bg-[#29b6f6] active:bg-[#0288d1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {formState === "submitting" ? "Sending…" : "Send Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
