-- Migration 013: shipment-updates Storage bucket
-- Stores photos attached to shipment status updates (supplier catch photos, packing, airport, etc.)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shipment-updates',
  'shipment-updates',
  true,
  2097152, -- 2MB max
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;
