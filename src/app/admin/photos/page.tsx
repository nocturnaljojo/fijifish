import { createServerSupabaseClient } from "@/lib/supabase";
import PhotoQueue from "./PhotoQueue";

async function getPendingPhotos() {
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
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function PhotosPage() {
  const photos = await getPendingPhotos();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Catch Photo Approval</h1>
        <p className="text-text-secondary text-sm mt-1">
          Review and approve supplier photos. Approved photos become buyer-facing and set the species default image.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border"
            style={{
              background: photos.length > 0 ? "rgba(255,171,64,0.08)" : "rgba(30,42,58,0.5)",
              borderColor: photos.length > 0 ? "rgba(255,171,64,0.3)" : "rgba(30,42,58,0.8)",
              color: photos.length > 0 ? "#ffab40" : "#90a4ae",
            }}
          >
            {photos.length} pending
          </span>
        </div>
      </div>

      <PhotoQueue photos={photos as unknown as Parameters<typeof PhotoQueue>[0]["photos"]} />
    </div>
  );
}
