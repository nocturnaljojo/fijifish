import { createServerSupabaseClient } from "@/lib/supabase";
import StoryManager from "./StoryManager";

async function getData() {
  try {
    const supabase = createServerSupabaseClient();
    const [storiesRes, villagesRes] = await Promise.all([
      supabase
        .from("impact_stories")
        .select("id, title, body, photo_url, is_published, published_at, created_at, village_id, villages(name)")
        .order("created_at", { ascending: false }),
      supabase.from("villages").select("id, name").eq("is_active", true),
    ]);
    return {
      stories: storiesRes.data ?? [],
      villages: villagesRes.data ?? [],
    };
  } catch {
    return { stories: [], villages: [] };
  }
}

export default async function StoriesPage() {
  const { stories, villages } = await getData();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Impact Stories</h1>
        <p className="text-text-secondary text-sm mt-1">
          Stories show buyers what their purchases fund. Published stories appear in the Impact Feed on the homepage.
        </p>
      </div>

      <StoryManager
        stories={stories as unknown as Parameters<typeof StoryManager>[0]["stories"]}
        villages={villages as unknown as Parameters<typeof StoryManager>[0]["villages"]}
      />
    </div>
  );
}
