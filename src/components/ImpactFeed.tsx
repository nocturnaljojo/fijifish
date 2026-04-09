import { createServerSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

type StoryRow = {
  id: string;
  title: string;
  body: string;
  photo_url: string | null;
  published_at: string | null;
  villages: { name: string } | null;
};

async function getImpactStories(): Promise<StoryRow[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("impact_stories")
      .select("id, title, body, photo_url, published_at, villages(name)")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(3);

    if (error || !data) return [];
    return data as StoryRow[];
  } catch {
    return [];
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });
}

export default async function ImpactFeed() {
  const stories = await getImpactStories();

  if (stories.length === 0) return null;

  return (
    <section id="impact" className="px-4 py-12 sm:py-16 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1.5">
              Your Order Makes an Impact
            </h2>
            <p className="text-text-secondary text-sm sm:text-base">
              A share of every sale goes directly back to the fishing community.
            </p>
          </div>
          <Link
            href="/impact"
            className="text-ocean-teal text-sm font-medium hover:underline underline-offset-2 whitespace-nowrap self-start sm:self-auto"
          >
            See all stories →
          </Link>
        </div>

        {/* Stories */}
        <div className="space-y-6">
          {stories.map((story) => (
            <article
              key={story.id}
              className="flex flex-col sm:flex-row gap-5 sm:gap-8 bg-bg-secondary border border-border-default rounded-2xl overflow-hidden"
            >
              {/* Photo — left on desktop, top on mobile */}
              <div className="sm:w-56 sm:shrink-0 aspect-video sm:aspect-auto bg-bg-tertiary flex items-center justify-center relative overflow-hidden">
                {story.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={story.photo_url}
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div
                      className="absolute inset-0"
                      aria-hidden="true"
                      style={{
                        background:
                          "radial-gradient(ellipse at 40% 40%, rgba(79,195,247,0.06) 0%, transparent 60%)",
                      }}
                    />
                    <span className="text-4xl opacity-20" aria-hidden="true">
                      🌊
                    </span>
                  </>
                )}
              </div>

              {/* Text */}
              <div className="flex flex-col justify-center p-5 sm:pl-0 sm:py-6 sm:pr-6 gap-2">
                <div className="flex items-center gap-3">
                  {story.villages?.name && (
                    <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                      {story.villages.name}
                    </span>
                  )}
                  {story.published_at && (
                    <span className="text-xs font-mono text-ocean-teal">
                      {formatDate(story.published_at)}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-text-primary leading-snug">
                  {story.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
                  {story.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
