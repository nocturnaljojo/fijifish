"use client";

import { useState } from "react";

/**
 * NotifyMeForm — shown on the homepage when no flight window is scheduled.
 * Captures email (required) + phone (optional) and submits to /api/feedback
 * as a general interest record so admin knows who to contact when a window opens.
 */
export default function NotifyMeForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback_type: "general",
          message: `window_notify_request — email: ${email.trim()}${phone.trim() ? `, phone: ${phone.trim()}` : ""}`,
        }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="border border-ocean-teal/20 rounded-2xl bg-ocean-teal/5 p-6 sm:p-8 max-w-md mx-auto">
      {status === "done" ? (
        <div className="text-center py-4">
          <span className="text-3xl block mb-3" aria-hidden="true">✓</span>
          <p className="text-ocean-teal font-semibold text-base mb-1">You&apos;re on the list!</p>
          <p className="text-text-secondary text-sm">
            We&apos;ll notify you when the next order window opens.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <h3 className="text-text-primary font-bold text-base mb-1">
              Get notified when we open again
            </h3>
            <p className="text-text-secondary text-sm">
              Leave your details and we&apos;ll text you the moment the next catch window opens.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-bg-secondary border border-border-default text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-ocean-teal/60 transition-colors"
            />
            <input
              type="tel"
              placeholder="Phone (optional) — for SMS"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-bg-secondary border border-border-default text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-ocean-teal/60 transition-colors"
            />
            <button
              type="submit"
              disabled={status === "submitting" || !email.trim()}
              className="w-full py-3 px-4 rounded-lg font-semibold text-sm min-h-[48px] bg-ocean-teal text-bg-primary hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? "Saving…" : "Notify Me When It Opens"}
            </button>
            {status === "error" && (
              <p className="text-reef-coral text-xs text-center">
                Something went wrong — please try again.
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
