"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const ALL_STATUSES = [
  { value: "caught", label: "Fish Caught" },
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed in Cooler" },
  { value: "at_airport", label: "At Airport" },
  { value: "cargo_accepted", label: "Cargo Accepted" },
  { value: "departed", label: "Flight Departed" },
  { value: "in_flight", label: "In Flight" },
  { value: "landed", label: "Landed" },
  { value: "customs_cleared", label: "Customs Cleared" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
] as const;

export type VillageOption = { id: string; name: string };

export default function TrackingForm({
  flightWindowId,
  villages,
}: {
  flightWindowId: string;
  villages: VillageOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("flight_window_id", flightWindowId);

    const res = await fetch("/api/tracking", { method: "POST", body: fd });
    const json = await res.json() as { error?: string };

    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Failed to post update"); return; }

    setOpen(false);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-ocean-teal/10 border border-ocean-teal/30 text-ocean-teal hover:bg-ocean-teal/20 transition-colors font-mono"
      >
        + Add Update
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/5 border border-white/15 rounded-xl p-4 flex flex-col gap-3 mt-2"
    >
      <p className="text-xs font-mono text-text-secondary uppercase tracking-wider">Post Shipment Update</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Village */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Village *</span>
          <select name="village_id" required className="admin-input text-xs py-1.5">
            {villages.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </label>

        {/* Status */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Status *</span>
          <select name="status" required className="admin-input text-xs py-1.5">
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Note */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Note</span>
        <input
          type="text"
          name="note"
          placeholder="Optional note..."
          className="admin-input text-xs py-1.5"
        />
      </label>

      {/* Photo */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Photo (optional)</span>
        <input
          ref={fileRef}
          type="file"
          name="photo"
          accept="image/*"
          onChange={handlePhotoChange}
          className="text-xs text-text-secondary file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-white/10 file:text-text-primary hover:file:bg-white/20 cursor-pointer"
        />
        {photoPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt="Preview"
            className="mt-1 w-24 h-24 object-cover rounded-lg border border-white/10"
          />
        )}
      </div>

      {error && <p className="text-xs text-reef-coral font-mono">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-ocean-teal text-bg-primary text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Posting..." : "Post Update"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setPhotoPreview(null); }}
          className="px-3 py-1.5 rounded-lg border border-white/20 text-text-secondary text-xs hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
