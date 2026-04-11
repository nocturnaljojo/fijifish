"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Village { id: string; name: string; }

interface Story {
  id: string;
  title: string;
  body: string;
  photo_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  village_id: string;
  villages: { name: string } | null;
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateStoryForm({ villages }: { villages: Village[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        village_id: fd.get("village_id"),
        title: fd.get("title"),
        body: fd.get("body"),
        photo_url: fd.get("photo_url") || null,
        is_published: fd.get("is_published") === "on",
      }),
    });

    const json = await res.json() as { error?: string };
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 transition-opacity"
      >
        + New Story
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-4">
      <h3 className="font-bold text-text-primary">New Impact Story</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Title *</span>
          <input type="text" name="title" required className="admin-input" placeholder="e.g. New Ice Machine Keeps Catch Fresher" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Village *</span>
          <select name="village_id" required className="admin-input">
            {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Photo URL</span>
          <input type="url" name="photo_url" className="admin-input" placeholder="https://..." />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Body *</span>
          <textarea name="body" rows={5} required className="admin-input resize-none" placeholder="Tell the story of how revenue impacted the village..." />
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="is_published" className="w-4 h-4 rounded accent-ocean-teal" />
          <span className="text-sm text-text-secondary">Publish immediately</span>
        </label>
      </div>
      {error && <p className="text-sm text-reef-coral font-mono">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 disabled:opacity-50">
          {loading ? "Saving..." : "Create Story"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-white/20 text-text-secondary text-sm hover:text-text-primary">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Story card ────────────────────────────────────────────────────────────────

function StoryCard({ story }: { story: Story }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function togglePublish() {
    setLoading(true);
    await fetch("/api/admin/stories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: story.id, is_published: !story.is_published }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${story.is_published ? "bg-lagoon-green" : "bg-text-secondary"}`}
              aria-hidden="true"
            />
            <span className={`text-xs font-mono uppercase tracking-wider ${story.is_published ? "text-lagoon-green" : "text-text-secondary"}`}>
              {story.is_published ? "Published" : "Draft"}
            </span>
            {story.villages && (
              <span className="text-xs text-text-secondary">· {story.villages.name}</span>
            )}
          </div>
          <h3 className="font-bold text-text-primary leading-snug">{story.title}</h3>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={togglePublish}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors disabled:opacity-50 ${
            story.is_published
              ? "bg-white/5 border border-white/20 text-text-secondary hover:text-reef-coral hover:border-reef-coral/30"
              : "bg-lagoon-green/10 border border-lagoon-green/30 text-lagoon-green hover:bg-lagoon-green/20"
          }`}
        >
          {loading ? "..." : story.is_published ? "Unpublish" : "Publish"}
        </button>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">{story.body}</p>
      <p className="text-[10px] font-mono text-text-secondary">
        Created {new Date(story.created_at).toLocaleDateString("en-AU")}
        {story.published_at && ` · Published ${new Date(story.published_at).toLocaleDateString("en-AU")}`}
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StoryManager({ stories, villages }: { stories: Story[]; villages: Village[] }) {
  const published = stories.filter((s) => s.is_published);
  const drafts = stories.filter((s) => !s.is_published);

  return (
    <div className="flex flex-col gap-6">
      <CreateStoryForm villages={villages} />

      {published.length > 0 && (
        <section>
          <h2 className="text-xs font-mono text-lagoon-green uppercase tracking-widest mb-3">
            Published ({published.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {published.map((s) => <StoryCard key={s.id} story={s} />)}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section>
          <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-3">
            Drafts ({drafts.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {drafts.map((s) => <StoryCard key={s.id} story={s} />)}
          </div>
        </section>
      )}

      {stories.length === 0 && (
        <div className="py-16 text-center border border-dashed border-white/20 rounded-xl">
          <span className="text-4xl block mb-3" aria-hidden="true">🌿</span>
          <p className="text-text-secondary">No stories yet.</p>
          <p className="text-text-secondary text-xs mt-1">Create one above to share village impact with buyers.</p>
        </div>
      )}
    </div>
  );
}
