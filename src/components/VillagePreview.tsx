interface VillageData {
  name: string;
  province: string;
  island: string;
  description: string | null;
  impact_summary: string | null;
}

const FALLBACK: VillageData = {
  name: "Galoa",
  province: "Bua",
  island: "Vanua Levu",
  description:
    "A small fishing village on the eastern coast of Vanua Levu, Bua Province. The fishermen of Galoa have worked these reefs for generations, using traditional methods passed down through families. Every catch that reaches your table was pulled from the reef by hand.",
  impact_summary:
    "Revenue from FijiFish has helped fund a new ice machine for longer-lasting catches, school supplies for village children, and boat engine repairs to keep the fleet running.",
};

export default function VillagePreview({
  village,
}: {
  village: VillageData | null;
}) {
  const v = village ?? FALLBACK;

  return (
    <section id="village" className="px-4 py-16 sm:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            Our Fishing Communities
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-sm sm:text-base">
            Your order directly supports a fishing family in rural Fiji.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Photo placeholder */}
            <div className="relative bg-bg-tertiary aspect-video md:aspect-auto md:min-h-[320px] flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0"
                aria-hidden="true"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 50%, rgba(102,187,106,0.08) 0%, transparent 65%), " +
                    "radial-gradient(ellipse at 80% 20%, rgba(79,195,247,0.05) 0%, transparent 55%)",
                }}
              />
              <div
                className="absolute inset-0 opacity-[0.03]"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(79,195,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,1) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
              <div className="relative flex flex-col items-center gap-3 text-center p-8">
                <span className="text-6xl" aria-hidden="true">
                  🇫🇯
                </span>
                <span className="text-xs font-mono text-text-secondary opacity-50 tracking-widest uppercase">
                  Village photos coming soon
                </span>
              </div>
            </div>

            {/* Village info */}
            <div className="p-6 sm:p-8 flex flex-col gap-4">
              <div>
                <h3 className="text-2xl font-bold text-text-primary">
                  {v.name} Village
                </h3>
                <p className="text-text-secondary text-sm font-mono mt-1">
                  {v.province}, {v.island} · Fiji
                </p>
              </div>

              {v.description && (
                <p className="text-text-secondary text-sm leading-relaxed">
                  {v.description}
                </p>
              )}

              {v.impact_summary && (
                <div className="p-4 rounded-xl bg-lagoon-green/5 border border-lagoon-green/20">
                  <p className="text-xs font-mono text-lagoon-green uppercase tracking-wider mb-2">
                    Community Impact
                  </p>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {v.impact_summary}
                  </p>
                </div>
              )}

              <div className="mt-auto pt-2">
                <a
                  href="/villages/galoa"
                  className="inline-flex items-center gap-1.5 text-ocean-teal text-sm font-medium hover:text-[#29b6f6] transition-colors"
                >
                  Learn more about Galoa
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
