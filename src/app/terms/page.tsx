import Link from "next/link";

export const metadata = {
  title: "Terms of Service — FijiFish",
  description: "Terms and conditions for ordering from FijiFish Pacific Seafood.",
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="mt-2 text-sm font-mono text-text-secondary">
            Last updated: April 2026
          </p>
        </div>

        <div className="space-y-10 text-text-secondary leading-relaxed">
          {/* Agreement */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">Agreement</h2>
            <p>
              By placing an order through FijiFish Pacific Seafood (&ldquo;FijiFish&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo;), you agree to these Terms of Service. If you do not agree, please do not
              place an order. These terms are governed by the laws of New South Wales, Australia.
            </p>
          </section>

          {/* Pre-orders and flight windows */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Orders Are Pre-Orders Against Flight Windows
            </h2>
            <p className="mb-3">
              All orders placed on FijiFish are <strong className="text-text-primary">pre-orders</strong>{" "}
              against a specific Fiji Airways cargo flight window. This means:
            </p>
            <ul className="space-y-2 list-none">
              {[
                "Your fish is caught and packed after your order is confirmed — it is not held in storage.",
                "Each flight window has a fixed cargo capacity. Orders are fulfilled on a first-come, first-served basis up to that capacity.",
                "If the cargo capacity for a window is exhausted before your order completes payment, your order will not be processed and no charge will be made.",
                "You will receive an email confirmation once your order is successfully reserved against the flight window.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full bg-ocean-teal shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Delivery */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Delivery Timeframe
            </h2>
            <p className="mb-3">
              Delivery timeframes are <strong className="text-text-primary">estimated</strong> based on
              the scheduled flight date and standard ground transport to the Riverina NSW delivery
              zones. FijiFish is not liable for delays caused by:
            </p>
            <ul className="space-y-2 list-none">
              {[
                "Fiji Airways flight delays, cancellations, or schedule changes",
                "Australian Border Force biosecurity inspection delays",
                "Weather or road conditions affecting ground delivery",
                "Inaccurate or incomplete delivery address provided by the customer",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full bg-sunset-gold shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              If a significant delay occurs, we will notify you by email and SMS with updated
              delivery estimates as soon as the information is available.
            </p>
          </section>

          {/* Freshness guarantee + refunds */}
          <section className="border border-lagoon-green/20 bg-lagoon-green/5 rounded-xl p-5">
            <h2 className="text-base font-bold text-lagoon-green mb-3">
              Freshness Guarantee &amp; Refund Policy
            </h2>
            <p className="mb-3">
              We stand behind the quality of every order. You are entitled to a{" "}
              <strong className="text-text-primary">full refund</strong> if:
            </p>
            <ul className="space-y-2 list-none">
              {[
                "Your fish arrives at a temperature above 4°C (indicating cold chain failure).",
                "The product is visibly damaged, spoiled, or not as described.",
                "Your order is not delivered within 48 hours of the scheduled delivery date without prior notification from FijiFish.",
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
            <p className="mt-3">
              To claim a refund, email{" "}
              <a
                href="mailto:support@fijifish.com.au"
                className="text-ocean-teal hover:underline font-mono"
              >
                support@fijifish.com.au
              </a>{" "}
              within 24 hours of delivery with a photo of the product and, where possible, a
              temperature reading. Refunds are processed to the original payment method within
              3–5 business days.
            </p>
          </section>

          {/* Australian Consumer Law */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Australian Consumer Law
            </h2>
            <p>
              Our goods come with guarantees that cannot be excluded under the Australian
              Consumer Law. You are entitled to a replacement or refund for a major failure and
              compensation for any other reasonably foreseeable loss or damage. You are also
              entitled to have the goods repaired or replaced if the goods fail to be of
              acceptable quality and the failure does not amount to a major failure.
            </p>
          </section>

          {/* Delivery zones */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Delivery Zones
            </h2>
            <p>
              FijiFish currently delivers to selected postcodes in the Riverina and surrounding
              regions of NSW. Delivery is included in the product price — there are no hidden
              freight charges. Delivery availability is confirmed at checkout. If your address is
              outside a current delivery zone, your order will not be accepted.
            </p>
          </section>

          {/* Notifications + Spam Act */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Notifications &amp; Communications
            </h2>
            <p className="mb-3">
              By placing an order, you consent to receiving transactional communications
              (order confirmation, tracking updates, delivery notification) via email and SMS.
            </p>
            <p className="mb-3">
              Promotional communications (new flight windows, new species, special offers) are
              sent only with your explicit consent and in compliance with the{" "}
              <strong className="text-text-primary">Spam Act 2003 (Cth)</strong>. Every
              promotional message includes a clear, functional opt-out mechanism. We will process
              opt-out requests within 5 business days.
            </p>
            <p>
              We do not send unsolicited commercial electronic messages. To opt out of
              promotional communications at any time, click Unsubscribe in any promotional email
              or reply STOP to any promotional SMS.
            </p>
          </section>

          {/* Limitation of liability */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Limitation of Liability
            </h2>
            <p>
              To the extent permitted by law, FijiFish&apos;s total liability for any claim
              arising from an order is limited to the amount paid for that order. We are not
              liable for indirect, consequential, or special damages, except where required by
              the Australian Consumer Law.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. The current version will always be
              published at this URL. Continued use of the service after an update constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-3">Contact</h2>
            <p>
              For questions about these Terms, contact us at:{" "}
              <a
                href="mailto:support@fijifish.com.au"
                className="text-ocean-teal hover:underline font-mono"
              >
                support@fijifish.com.au
              </a>
            </p>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-border-default flex flex-wrap gap-6 text-sm text-text-secondary">
          <Link href="/" className="hover:text-ocean-teal transition-colors">
            Home
          </Link>
          <Link href="/privacy" className="hover:text-ocean-teal transition-colors">
            Privacy Policy
          </Link>
          <Link href="/supply-chain" className="hover:text-ocean-teal transition-colors">
            How It Works
          </Link>
        </div>
      </div>
    </main>
  );
}
