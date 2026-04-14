export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getVillageId } from "@/lib/roles";
import { createServerSupabaseClient } from "@/lib/supabase";
import PhotoUploadForm, { type SpeciesOption } from "@/components/supplier/PhotoUploadForm";

export const metadata = { title: "Catch Photos — Supplier Portal" };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending review", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved ✓", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
};

export default async function SupplierPhotosPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/supplier/photos");

  const villageId = await getVillageId();
  const supabase = createServerSupabaseClient();

  // Fetch active / upcoming window for the upload form
  const { data: windowRows } = await supabase
    .from("flight_windows")
    .select("id, flight_date, flight_number, status")
    .in("status", ["open", "closing_soon", "upcoming", "packing"])
    .order("flight_date", { ascending: true })
    .limit(1);

  const activeWindow = windowRows?.[0] ?? null;

  // Fetch available species for the upload form
  const { data: speciesRows } = await supabase
    .from("fish_species")
    .select("id, name_fijian, name_english")
    .eq("is_active", true)
    .order("name_english", { ascending: true });

  const species: SpeciesOption[] = ((speciesRows ?? []) as SpeciesOption[]);

  // Fetch previously uploaded photos for this village + window
  type PhotoRow = {
    id: string;
    image_url: string;
    estimated_weight_kg: number | null;
    note: string | null;
    status: string;
    created_at: string;
    fish_species: { name_fijian: string | null; name_english: string } | null;
  };

  let photos: PhotoRow[] = [];

  if (villageId && activeWindow) {
    const { data } = await supabase
      .from("catch_photos")
      .select(
        "id, image_url, estimated_weight_kg, note, status, created_at, fish_species:fish_species_id(name_fijian, name_english)",
      )
      .eq("village_id", villageId)
      .eq("flight_window_id", activeWindow.id)
      .order("created_at", { ascending: false });

    photos = (data ?? []) as unknown as PhotoRow[];
  }

  const flightLabel = activeWindow?.flight_date
    ? new Date(activeWindow.flight_date + "T00:00:00").toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="px-4 py-5 space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest mb-0.5">
          Supplier Portal
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Catch Photos</h1>
        {flightLabel && (
          <p className="text-sm text-gray-500 mt-0.5">Flight: {flightLabel}</p>
        )}
      </div>

      {/* No window warning */}
      {!activeWindow && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <p className="text-sm font-semibold text-amber-700">No active flight window</p>
          <p className="text-xs text-amber-600 mt-1">
            Photos can only be uploaded during an active flight window.
          </p>
        </div>
      )}

      {/* No village warning */}
      {!villageId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <p className="text-sm font-semibold text-amber-700">Village not assigned</p>
          <p className="text-xs text-amber-600 mt-1">
            Contact admin to assign a village to your account.
          </p>
        </div>
      )}

      {/* Upload form */}
      {activeWindow && villageId && species.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Upload New Photo</h2>
          <PhotoUploadForm
            species={species}
            flightWindowId={activeWindow.id}
          />
        </div>
      )}

      {/* Previously uploaded photos */}
      {photos.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">
            Uploaded this window
          </h2>
          <div className="space-y-3">
            {photos.map((photo) => {
              const badge = STATUS_BADGE[photo.status] ?? STATUS_BADGE.pending;
              const speciesName =
                photo.fish_species?.name_fijian ??
                photo.fish_species?.name_english ??
                "Unknown";
              const uploadedAt = new Date(photo.created_at).toLocaleDateString(
                "en-AU",
                { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
              );

              return (
                <div
                  key={photo.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden flex gap-3 p-3"
                >
                  {/* Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.image_url}
                    alt={`${speciesName} catch photo`}
                    className="w-20 h-20 rounded-lg object-cover shrink-0 bg-gray-100"
                    loading="lazy"
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{speciesName}</p>
                      {photo.estimated_weight_kg && (
                        <p className="text-xs text-gray-500">
                          ~{photo.estimated_weight_kg}kg estimated
                        </p>
                      )}
                      {photo.note && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{photo.note}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-gray-400">{uploadedAt}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state — window exists but no photos yet */}
      {activeWindow && villageId && photos.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
          No photos uploaded for this window yet.
        </p>
      )}
    </div>
  );
}
