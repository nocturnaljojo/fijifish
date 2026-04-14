import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BILLING_CONFIG } from "@/lib/config";

export const metadata = { title: "Billing — FijiFish" };

export default async function DashboardBillingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard/billing");

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;

  // Build the Stripe Customer Portal URL with prefilled email for convenience.
  // The base URL is configured in Stripe Dashboard → Settings → Billing → Customer portal.
  const portalUrl =
    BILLING_CONFIG.stripePortalUrl && email
      ? `${BILLING_CONFIG.stripePortalUrl}?prefilled_email=${encodeURIComponent(email)}`
      : BILLING_CONFIG.stripePortalUrl ?? null;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-10">
      <div className="mb-6">
        <p className="text-[10px] font-mono text-ocean-teal uppercase tracking-widest mb-1">
          Dashboard
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Billing</h1>
      </div>

      {/* ── Stripe portal card ───────────────────────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5" aria-hidden="true">💳</span>
            <div>
              <h2 className="text-sm font-semibold text-text-primary mb-1">
                Manage Billing
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                View payment history, download invoices, and update your payment
                method through the secure Stripe billing portal.
              </p>
            </div>
          </div>
        </div>

        <div
          className="px-5 pb-5 border-t pt-4"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          {portalUrl ? (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Open Billing Portal
              <span aria-hidden="true" className="text-xs">↗</span>
            </a>
          ) : (
            <div
              className="rounded-lg px-4 py-3 border"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-xs text-text-secondary">
                For billing enquiries, please contact us at{" "}
                <a
                  href="mailto:hello@vitifish.com.au"
                  className="text-ocean-teal hover:underline"
                >
                  hello@vitifish.com.au
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment info ──────────────────────────────────────────────────────── */}
      <div
        className="mt-4 rounded-xl border p-5 space-y-3"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <h3 className="text-xs font-mono text-text-secondary uppercase tracking-widest">
          Payment info
        </h3>
        <ul className="space-y-2 text-xs text-text-secondary leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-lagoon-green mt-0.5" aria-hidden="true">✓</span>
            All payments processed securely via Stripe (PCI DSS compliant).
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lagoon-green mt-0.5" aria-hidden="true">✓</span>
            Card details are never stored on FijiFish servers.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lagoon-green mt-0.5" aria-hidden="true">✓</span>
            Prices are in Australian Dollars (AUD). GST included where applicable.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-sunset-gold mt-0.5" aria-hidden="true">→</span>
            Refunds are processed within 5–10 business days to your original payment method.
          </li>
        </ul>
      </div>
    </div>
  );
}
