import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — FijiFish",
  description: "How FijiFish collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-xs font-mono text-text-secondary hover:text-ocean-teal transition-colors uppercase tracking-widest"
          >
            ← Back to FijiFish
          </Link>
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold text-text-primary">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm font-mono text-text-secondary">
            Last updated: April 2026
          </p>
        </div>

        <div className="space-y-10 text-text-secondary leading-relaxed">
          {/* Overview */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">Overview</h2>
            <p>
              FijiFish Pacific Seafood (&ldquo;FijiFish&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is committed to protecting your
              personal information in accordance with the Australian Privacy Act 1988 and the
              Australian Privacy Principles (APPs). This policy explains what data we collect,
              why we collect it, how it is stored, and your rights in relation to it.
            </p>
          </section>

          {/* What we collect */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              What Information We Collect
            </h2>
            <ul className="space-y-2 list-none">
              {[
                { item: "Full name", why: "order fulfilment and delivery" },
                { item: "Email address", why: "order confirmation, order status updates, and account management" },
                { item: "Phone number", why: "delivery coordination and SMS order updates" },
                { item: "Delivery address (street, suburb, postcode, state)", why: "calculating delivery eligibility and dispatching your order" },
                { item: "Payment information", why: "securely processed by Stripe — FijiFish never stores card details" },
                { item: "IP address and browser metadata", why: "security, fraud prevention, and site analytics" },
              ].map(({ item, why }) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full bg-ocean-teal shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="text-text-primary font-medium">{item}</span>
                    {" — "}
                    {why}.
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Why we collect it */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Why We Collect Your Information
            </h2>
            <p className="mb-3">We use your personal information only for:</p>
            <ul className="space-y-2 list-none">
              {[
                "Processing and fulfilling your fish order",
                "Coordinating delivery to your nominated address",
                "Sending order confirmations, tracking updates, and delivery notifications",
                "Responding to your enquiries or support requests",
                "Complying with Australian Consumer Law and food safety regulations",
                "Sending promotional communications — only with your explicit consent and always with an opt-out mechanism (Spam Act 2003 compliant)",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full bg-lagoon-green shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* How stored */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              How Your Information Is Stored
            </h2>
            <p className="mb-3">
              Your data is stored on secure infrastructure operated by trusted third-party
              providers:
            </p>
            <ul className="space-y-2 list-none">
              {[
                {
                  provider: "Supabase",
                  detail:
                    "Your order details, delivery address, and account information are stored in a Supabase PostgreSQL database hosted in the ap-southeast-2 (Sydney, Australia) region. Data does not leave Australia.",
                },
                {
                  provider: "Clerk",
                  detail:
                    "Your email address, name, and authentication credentials are managed by Clerk (clerk.com), an identity platform compliant with SOC 2 Type II standards.",
                },
                {
                  provider: "Stripe",
                  detail:
                    "Payment card processing is handled entirely by Stripe (stripe.com), a PCI-DSS Level 1 certified payment provider. FijiFish never stores, transmits, or has access to your card details.",
                },
              ].map(({ provider, detail }) => (
                <li key={provider} className="flex gap-3">
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full bg-sunset-gold shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="text-text-primary font-medium">{provider}</span>
                    {" — "}
                    {detail}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* No selling */}
          <section className="border border-lagoon-green/20 bg-lagoon-green/5 rounded-xl p-5">
            <h2 className="text-base font-bold text-lagoon-green mb-2">
              We Do Not Sell Your Data
            </h2>
            <p>
              FijiFish does not sell, rent, trade, or share your personal information with any
              third party for marketing or commercial purposes. Your data is used only to deliver
              your order and operate this service.
            </p>
          </section>

          {/* Retention */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">Data Retention</h2>
            <p>
              We retain your order and account information for 7 years in accordance with
              Australian tax and record-keeping obligations. You may request deletion of your
              account at any time; order records required for legal compliance may be retained in
              an anonymised form.
            </p>
          </section>

          {/* Rights */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">Your Rights</h2>
            <p className="mb-3">
              Under the Australian Privacy Act, you have the right to:
            </p>
            <ul className="space-y-2 list-none">
              {[
                "Access the personal information we hold about you",
                "Request correction of inaccurate or outdated information",
                "Request deletion of your account and associated data",
                "Opt out of promotional communications at any time",
                "Lodge a complaint with the Office of the Australian Information Commissioner (OAIC) if you believe your privacy rights have been breached",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full bg-deep-purple shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">Contact Us</h2>
            <p>
              For any privacy enquiries, data access requests, or to exercise your rights, contact
              us at:{" "}
              <a
                href="mailto:privacy@fijifish.com.au"
                className="text-ocean-teal hover:underline font-mono"
              >
                privacy@fijifish.com.au
              </a>
            </p>
            <p className="mt-3">
              We will respond to all privacy requests within 30 days in accordance with the
              Australian Privacy Principles.
            </p>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-border-default flex flex-wrap gap-6 text-sm text-text-secondary">
          <Link href="/" className="hover:text-ocean-teal transition-colors">
            Home
          </Link>
          <Link href="/terms" className="hover:text-ocean-teal transition-colors">
            Terms of Service
          </Link>
          <Link href="/supply-chain" className="hover:text-ocean-teal transition-colors">
            How It Works
          </Link>
        </div>
      </div>
    </main>
  );
}
