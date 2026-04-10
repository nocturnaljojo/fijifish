-- FijiFish — Supabase Storage bucket setup
-- Creates 4 buckets with appropriate access policies.

-- catch-photos: supplier uploads, admin approves, buyers see after approval
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catch-photos',
  'catch-photos',
  true,
  1048576, -- 1MB max (client-side compression enforced)
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- delivery-proofs: driver uploads, private, admin reads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-proofs',
  'delivery-proofs',
  false,
  5242880, -- 5MB max
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- village-media: supplier uploads village development photos/videos, admin approves, public read
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'village-media',
  'village-media',
  true,
  52428800, -- 50MB max (videos)
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- qr-labels: generated QR code images, public read, admin insert only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr-labels',
  'qr-labels',
  true,
  524288, -- 512KB max
  ARRAY['image/png','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;
