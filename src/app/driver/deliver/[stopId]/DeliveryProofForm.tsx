"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface StopData {
  id: string;
  order_id: string;
  sequence_number: number;
  address: string | null;
  status: string;
  is_communal: boolean;
  notes: string | null;
  orders: {
    id: string;
    delivery_address: string | null;
    delivery_notes: string | null;
    total_aud_cents: number;
    order_items: {
      quantity_kg: number;
      fish_species: { name_english: string } | null;
    }[];
  } | null;
  customers: {
    users: { full_name: string | null; phone: string | null } | null;
  } | null;
}

const MAX_DIM = 1200;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, MAX_DIM / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compression failed"));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

export default function DeliveryProofForm({ stop }: { stop: StopData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<Blob | null>(null);
  const [receivedByName, setReceivedByName] = useState("");
  const [isProxy, setIsProxy] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "capturing" | "captured" | "denied">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const order = stop.orders;
  const customer = stop.customers?.users;
  const address = stop.address ?? order?.delivery_address ?? "";

  const captureGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      return;
    }
    setGpsStatus("capturing");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("captured");
      },
      () => setGpsStatus("denied"),
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, []);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      setPreview(previewUrl);
      setPhotoFile(compressed);
      // Auto-capture GPS when photo is taken
      if (gpsStatus === "idle") captureGps();
    } catch {
      setSubmitError("Failed to process photo. Please try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photoFile) { setSubmitError("Photo is required"); return; }
    if (!receivedByName.trim()) { setSubmitError("Name is required"); return; }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("photo", photoFile, "proof.jpg");
      formData.append("stop_id", stop.id);
      formData.append("order_id", stop.order_id);
      formData.append("received_by_name", receivedByName.trim());
      formData.append("is_proxy_delivery", String(isProxy));
      if (gps) {
        formData.append("gps_lat", String(gps.lat));
        formData.append("gps_lng", String(gps.lng));
      }

      const proofRes = await fetch("/api/driver/proof", { method: "POST", body: formData });
      const proofJson = await proofRes.json() as { ok?: boolean; error?: string };
      if (!proofRes.ok) throw new Error(proofJson.error ?? "Proof upload failed");

      // Mark stop as delivered
      const patchRes = await fetch("/api/driver", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_delivered", stop_id: stop.id }),
      });
      const patchJson = await patchRes.json() as { ok?: boolean; error?: string };
      if (!patchRes.ok) throw new Error(patchJson.error ?? "Failed to mark delivered");

      router.push("/driver");
      router.refresh();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
      {/* Customer + address */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col gap-2">
        <p className="font-semibold text-text-primary">{customer?.full_name ?? "Customer"}</p>
        {customer?.phone && (
          <a href={`tel:${customer.phone}`} className="text-sm text-ocean-teal">{customer.phone}</a>
        )}
        {address && (
          <p className="text-sm text-text-secondary">{address}</p>
        )}
        {order?.delivery_notes && (
          <p className="text-xs text-sunset-gold bg-sunset-gold/8 border border-sunset-gold/20 rounded-lg px-3 py-2 mt-1">
            {order.delivery_notes}
          </p>
        )}
        {order?.order_items && order.order_items.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {order.order_items.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-text-secondary font-mono"
              >
                {item.quantity_kg}kg {item.fish_species?.name_english ?? "fish"}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Photo capture */}
      <div>
        <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2">
          Proof Photo *
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void handlePhoto(e)}
          className="sr-only"
        />
        {preview ? (
          <div className="relative rounded-xl overflow-hidden border border-white/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Delivery proof" className="w-full max-h-72 object-cover" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-bg-primary/80 border border-white/20 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Retake
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[160px] rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:border-ocean-teal/40 transition-colors"
          >
            <span className="text-4xl" aria-hidden="true">📷</span>
            <span className="text-sm text-text-secondary">Tap to take photo</span>
            <span className="text-xs text-text-secondary/50">Rear camera · JPEG compressed</span>
          </button>
        )}
      </div>

      {/* GPS */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-1">GPS Location</p>
          {gpsStatus === "idle" && (
            <button type="button" onClick={captureGps} className="text-sm text-ocean-teal">
              Capture location
            </button>
          )}
          {gpsStatus === "capturing" && (
            <p className="text-sm text-text-secondary/50">Getting location…</p>
          )}
          {gpsStatus === "captured" && gps && (
            <p className="text-sm text-lagoon-green font-mono">
              {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </p>
          )}
          {gpsStatus === "denied" && (
            <p className="text-sm text-text-secondary/50">Location unavailable (will proceed without)</p>
          )}
        </div>
      </div>

      {/* Received by */}
      <div>
        <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2">
          Received by (name) *
        </label>
        <input
          type="text"
          value={receivedByName}
          onChange={(e) => setReceivedByName(e.target.value)}
          placeholder="Full name of person who received delivery"
          className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/15 text-text-primary text-sm focus:outline-none focus:border-ocean-teal/60 transition-colors min-h-[48px]"
          autoComplete="name"
        />
      </div>

      {/* Proxy delivery */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isProxy}
          onChange={(e) => setIsProxy(e.target.checked)}
          className="w-5 h-5 rounded accent-ocean-teal"
        />
        <div>
          <span className="text-sm text-text-primary">Left with neighbour / proxy</span>
          <p className="text-xs text-text-secondary/60 mt-0.5">Requires admin review</p>
        </div>
      </label>

      {submitError && (
        <p className="text-sm text-reef-coral font-mono">{submitError}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !photoFile}
        className="w-full min-h-[56px] rounded-xl bg-lagoon-green text-bg-primary text-base font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {submitting ? "Submitting…" : "Confirm Delivery"}
      </button>

      <button
        type="button"
        onClick={() => router.back()}
        className="w-full min-h-[48px] rounded-xl border border-white/15 text-text-secondary text-sm hover:text-text-primary transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}
