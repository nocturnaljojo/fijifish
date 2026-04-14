"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const SUPPLIER_STATUSES = [
  { value: "caught", label: "Fish Caught 🎣", hint: "Fish fresh from the reef" },
  { value: "processing", label: "Processing 🔪", hint: "Gutting and cleaning" },
  { value: "packed", label: "Packed in Cooler 📦", hint: "Packed on ice, ready to ship" },
  { value: "at_airport", label: "At Airport 🏢", hint: "Dropped off at Labasa airport" },
] as const;

export default function SupplierTrackingForm({
  flightWindowId,
  villageId,
}: {
  flightWindowId: string;
  villageId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setPhotoPreview(null); return; }
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    fd.set("flight_window_id", flightWindowId);
    fd.set("village_id", villageId);

    const res = await fetch("/api/tracking", { method: "POST", body: fd });
    const json = await res.json() as { error?: string };

    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Failed to post update"); return; }

    setSuccess(true);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    formRef.current?.reset();
    router.refresh();

    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4"
    >
      <h2 className="text-base font-bold text-gray-900">Post a Status Update</h2>

      {/* Status */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage *</span>
        <div className="grid grid-cols-1 gap-2">
          {SUPPLIER_STATUSES.map((s) => (
            <label key={s.value} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="status"
                value={s.value}
                required
                className="mt-1 accent-cyan-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-400">{s.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Note */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Note (optional)</span>
        <input
          type="text"
          name="note"
          placeholder="e.g. 120kg Walu loaded, ice packed"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </label>

      {/* Photo */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Photo (encouraged 📷)
        </span>
        <input
          ref={fileRef}
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 cursor-pointer"
        />
        {photoPreview && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
              src={photoPreview}
              alt="Preview"
              className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
            />
            <button
              type="button"
              onClick={() => { setPhotoPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 font-medium">Update posted ✓</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm hover:bg-cyan-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Posting..." : "Post Update"}
      </button>
    </form>
  );
}
