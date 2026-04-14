"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

export interface SpeciesOption {
  id: string;
  name_fijian: string | null;
  name_english: string;
}

interface Props {
  species: SpeciesOption[];
  flightWindowId: string;
}

/** Compress image to JPEG, max 1200px on longest side, ~0.82 quality. */
async function compressToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.onload = () => {
      const MAX = 1200;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round((h * MAX) / w); w = MAX; }
        else { w = Math.round((w * MAX) / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        0.82,
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function PhotoUploadForm({ species, flightWindowId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [speciesId, setSpeciesId] = useState(species[0]?.id ?? "");
  const [weightKg, setWeightKg] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccessMsg(null);
    try {
      const compressed = await compressToJpeg(file);
      setBlob(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch {
      setError("Could not process image — please try a different photo.");
    }
  }

  function clearPhoto() {
    setPreview(null);
    setBlob(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!blob) { setError("Please select a photo first."); return; }
    if (!speciesId) { setError("Please select a species."); return; }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const fd = new FormData();
      fd.append("file", blob, "catch.jpg");
      fd.append("fish_species_id", speciesId);
      fd.append("flight_window_id", flightWindowId);
      if (weightKg.trim()) fd.append("estimated_weight_kg", weightKg.trim());
      if (note.trim()) fd.append("note", note.trim());

      const res = await fetch("/api/supplier/photos", { method: "POST", body: fd });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      // Reset form
      clearPhoto();
      setWeightKg("");
      setNote("");
      setSuccessMsg("Photo uploaded — pending admin review.");
      router.refresh(); // re-run server component to show new photo in list
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Photo capture */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Photo *
        </p>
        <input
          ref={fileRef}
          id="photo-file"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Catch preview"
              className="w-full max-h-56 rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white text-sm flex items-center justify-center leading-none"
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        ) : (
          <label
            htmlFor="photo-file"
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl h-36 cursor-pointer active:bg-gray-50 transition-colors"
          >
            <Camera size={28} className="text-gray-300" aria-hidden="true" />
            <span className="text-sm text-gray-400 text-center px-4">
              Tap to take photo or choose from gallery
            </span>
            <span className="text-xs text-gray-300">Max 1MB after compression</span>
          </label>
        )}
      </div>

      {/* Species */}
      <div>
        <label htmlFor="species-select" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Species *
        </label>
        <select
          id="species-select"
          value={speciesId}
          onChange={(e) => setSpeciesId(e.target.value)}
          className="w-full h-12 px-3 border border-gray-200 rounded-xl text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name_fijian ?? s.name_english}
              {s.name_fijian && s.name_fijian !== s.name_english ? ` (${s.name_english})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Estimated weight */}
      <div>
        <label htmlFor="weight-input" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Estimated weight (kg)
        </label>
        <input
          id="weight-input"
          type="number"
          min="0"
          step="0.1"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          placeholder="e.g. 15.5"
          className="w-full h-12 px-3 border border-gray-200 rounded-xl text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Note */}
      <div>
        <label htmlFor="note-input" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Note{" "}
          <span className="font-normal normal-case text-gray-400">(optional)</span>
        </label>
        <textarea
          id="note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. Caught this morning near the reef — very fresh"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
        />
      </div>

      {/* Feedback */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm text-green-700 font-medium">✓ {successMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !blob}
        className="w-full h-14 rounded-xl bg-cyan-600 text-white font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {loading ? "Uploading…" : "Upload Photo"}
      </button>
    </form>
  );
}
