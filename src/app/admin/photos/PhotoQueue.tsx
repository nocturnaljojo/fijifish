"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface CatchPhoto {
  id: string;
  image_url: string;
  estimated_weight_kg: number | null;
  note: string | null;
  status: string;
  created_at: string;
  fish_species: { name_fijian: string | null; name_english: string } | null;
  villages: { name: string } | null;
  flight_windows: { flight_date: string; flight_number: string | null } | null;
}

function PhotoCard({ photo }: { photo: CatchPhoto }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState(false);

  async function act(action: "approve" | "reject") {
    setLoading(action);
    await fetch("/api/admin/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: photo.id,
        action,
        update_species_image: action === "approve",
        fish_species_id: photo.fish_species ? undefined : undefined,
        image_url: photo.image_url,
      }),
    });
    setLoading(null);
    setDone(true);
    router.refresh();
  }

  if (done) return null;

  const speciesName = photo.fish_species?.name_fijian ?? photo.fish_species?.name_english ?? "Unknown";

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
      {/* Photo */}
      <div className="relative aspect-video bg-bg-tertiary">
        {photo.image_url ? (
          <Image
            src={photo.image_url}
            alt={`Catch photo of ${speciesName}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl opacity-20" aria-hidden="true">🐟</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <p className="font-bold text-text-primary">{speciesName}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {photo.villages?.name ?? "Unknown village"}
            {photo.estimated_weight_kg && ` · ${photo.estimated_weight_kg} kg`}
          </p>
          {photo.flight_windows && (
            <p className="text-xs text-text-secondary">
              Window: {photo.flight_windows.flight_date} {photo.flight_windows.flight_number ?? ""}
            </p>
          )}
          {photo.note && (
            <p className="text-xs text-text-secondary italic mt-1">&ldquo;{photo.note}&rdquo;</p>
          )}
        </div>
        <p className="text-[10px] font-mono text-text-secondary">
          {new Date(photo.created_at).toLocaleString("en-AU")}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => act("approve")}
            className="flex-1 py-2 rounded-lg bg-lagoon-green/10 border border-lagoon-green/30 text-lagoon-green text-xs font-bold hover:bg-lagoon-green/20 disabled:opacity-50 transition-colors"
          >
            {loading === "approve" ? "..." : "✓ Approve"}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => act("reject")}
            className="flex-1 py-2 rounded-lg bg-reef-coral/10 border border-reef-coral/30 text-reef-coral text-xs font-bold hover:bg-reef-coral/20 disabled:opacity-50 transition-colors"
          >
            {loading === "reject" ? "..." : "✕ Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PhotoQueue({ photos }: { photos: CatchPhoto[] }) {
  if (photos.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-white/20 rounded-xl">
        <span className="text-4xl block mb-3" aria-hidden="true">📷</span>
        <p className="text-text-secondary">No pending photos</p>
        <p className="text-text-secondary text-xs mt-1">When suppliers upload catch photos, they appear here for approval.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
}
