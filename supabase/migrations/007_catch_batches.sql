-- FijiFish — Catch batch traceability
-- Each catch batch gets a unique QR code linking to a public page.
-- Batch code format: {village_initial}{province_initial}F-{YYYYMMDD}-{NNN}
-- Example: GBF-20260414-001 (Galoa, Bua, Finfish, date, sequence)

BEGIN;

CREATE TABLE IF NOT EXISTS catch_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code        TEXT UNIQUE NOT NULL,
  fish_species_id   UUID REFERENCES fish_species(id),
  village_id        UUID REFERENCES villages(id),
  fisher_name       TEXT NOT NULL,
  catch_date        DATE NOT NULL,
  catch_method      TEXT,
  catch_location    TEXT,
  weight_kg         DECIMAL(10,2),
  photo_url         TEXT,
  video_url         TEXT,
  flight_window_id  UUID REFERENCES flight_windows(id),
  qr_code_url       TEXT,
  notes             TEXT,
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catch_batches_village   ON catch_batches(village_id);
CREATE INDEX IF NOT EXISTS idx_catch_batches_species   ON catch_batches(fish_species_id);
CREATE INDEX IF NOT EXISTS idx_catch_batches_date      ON catch_batches(catch_date DESC);
CREATE INDEX IF NOT EXISTS idx_catch_batches_code      ON catch_batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_catch_batches_flight    ON catch_batches(flight_window_id);

COMMIT;
