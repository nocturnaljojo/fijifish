-- FijiFish — Village media table
-- Powers: catch photos on fish cards, village development photos/videos,
-- impact stories, and QR code catch pages.
-- All media goes through admin approval before showing to buyers.

BEGIN;

CREATE TABLE IF NOT EXISTS village_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id      UUID NOT NULL REFERENCES villages(id),
  uploaded_by     TEXT NOT NULL,  -- Clerk user ID
  media_type      TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  category        TEXT NOT NULL CHECK (category IN ('catch', 'development', 'community', 'fishing', 'impact', 'landscape')),
  title           TEXT,
  description     TEXT,
  storage_url     TEXT NOT NULL,
  thumbnail_url   TEXT,
  -- Catch-specific fields (populated when category = 'catch')
  catch_batch_id  UUID REFERENCES catch_batches(id),
  fish_species_id UUID REFERENCES fish_species(id),
  -- Approval workflow
  is_approved     BOOLEAN NOT NULL DEFAULT false,
  approved_by     TEXT,           -- Clerk user ID of approving admin
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_village_media_village    ON village_media(village_id);
CREATE INDEX IF NOT EXISTS idx_village_media_approved  ON village_media(is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_village_media_category  ON village_media(category);
CREATE INDEX IF NOT EXISTS idx_village_media_batch     ON village_media(catch_batch_id);
CREATE INDEX IF NOT EXISTS idx_village_media_species   ON village_media(fish_species_id);

COMMIT;
