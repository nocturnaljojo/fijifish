import FeedbackForm from "./FeedbackForm";

const LINKS = [
  { label: "About", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-secondary mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="font-bold text-lg text-text-primary mb-2">
              🐟 FijiFish
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              Pacific Seafood — Wild-caught in Fiji, delivered to the Riverina.
            </p>
            <p className="text-text-secondary text-xs font-mono mt-3 opacity-60">
              ABN: [pending registration]
            </p>
          </div>

          {/* Supply chain */}
          <div>
            <h3 className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-4">
              Journey
            </h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p className="flex items-start gap-2.5">
                <span
                  className="mt-1 w-1.5 h-1.5 rounded-full bg-lagoon-green shrink-0"
                  aria-hidden="true"
                />
                Galoa Village, Bua, Vanua Levu, Fiji
              </p>
              <p className="flex items-start gap-2.5">
                <span
                  className="mt-1 w-1.5 h-1.5 rounded-full bg-ocean-teal shrink-0"
                  aria-hidden="true"
                />
                Fiji Airways FJ911 — Nadi → Sydney
              </p>
              <p className="flex items-start gap-2.5">
                <span
                  className="mt-1 w-1.5 h-1.5 rounded-full bg-sunset-gold shrink-0"
                  aria-hidden="true"
                />
                Riverina, NSW, Australia
              </p>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-4">
              Info
            </h3>
            <div className="space-y-2.5">
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-text-secondary hover:text-ocean-teal transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <FeedbackForm />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-secondary font-mono">
          <span>© 2026 FijiFish Pacific Seafood. All rights reserved.</span>
          <span className="opacity-40">Built with love for Galoa village 🇫🇯</span>
        </div>
      </div>
    </footer>
  );
}
