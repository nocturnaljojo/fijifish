-- Migration 011: add delivery_address and delivery_notes to orders
--
-- The /api/checkout route inserts delivery_address and delivery_notes into
-- orders, but migration 001 did not include these columns. Supabase silently
-- ignores unknown columns on insert, so delivery info was being lost on every
-- order. This migration adds the missing columns.

alter table orders
  add column if not exists delivery_address text,
  add column if not exists delivery_notes   text;
