import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";
import PhotoQueue from "./PhotoQueue";

type TabId = "pending" | "approved" | "rejected";

const TABS: { id: TabId; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

async function getPhotos(status: TabId) {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("catch_photos")
      .select(`
        id,
        image_url,
        estimated_weight_kg,
        note,
        status,
        created_at,
        fish_species ( name_fijian, name_english ),
        villages ( name ),
        flight_windows ( flight_date, flight_number )
      `)
      .eq("status", status)
      .order("created_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

async function getCounts(): Promise<Record<TabId, number>> {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("catch_photos")
      .select("status");

    const counts: Record<TabId, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const row of data ?? []) {
      if (row.status in counts) {
        counts[row.status as TabId]++;
      }
    }
    return counts;
  } catch {
    return { pending: 0, approved: 0, rejected: 0 };
  }
}

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: TabId = (["pending", "approved", "rejected"].includes(tab ?? "") ? tab as TabId : "pending");

  const [photos, counts] = await Promise.all([
    getPhotos(activeTab),
    getCounts(),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Catch Photos</h1>
        <p className="text-text-secondary text-sm mt-1">
          Review and approve supplier photos. Approved photos become buyer-facing.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {TABS.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <Link
              key={t.id}
              href={`/admin/photos?tab=${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? "border-ocean-teal text-ocean-teal"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.label}
              {counts[t.id] > 0 && (
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-ocean-teal/20 text-ocean-teal"
                      : "bg-white/10 text-text-secondary"
                  }`}
                >
                  {counts[t.id]}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <PhotoQueue
        photos={photos as unknown as Parameters<typeof PhotoQueue>[0]["photos"]}
        tab={activeTab}
      />
    </div>
  );
}
