-- Migration 010: add payment_failed order status + decrement_reserved_kg RPC
--
-- 1. Adds 'payment_failed' to the orders.status CHECK constraint.
--    Required so the Stripe webhook can mark failed-payment orders correctly,
--    distinct from admin-initiated 'cancelled' status.
--
-- 2. Creates decrement_reserved_kg(inv_id, delta) RPC.
--    Called from the Stripe webhook when payment fails or a refund is issued,
--    to release the cargo capacity reserved at checkout time.
--    Uses GREATEST(0, ...) to prevent reserved_kg going below zero.

begin;

-- ── 1. Extend orders.status CHECK constraint ─────────────────────────────────
-- PostgreSQL requires dropping and re-adding a CHECK constraint to modify it.
-- The auto-generated name for inline checks is {table}_{column}_check.

alter table orders drop constraint if exists orders_status_check;

alter table orders
  add constraint orders_status_check
  check (status in (
    'pending',
    'confirmed',
    'paid',
    'payment_failed',
    'cancelled',
    'refunded',
    'out_for_delivery',
    'delivered'
  ));

-- ── 2. decrement_reserved_kg RPC ─────────────────────────────────────────────
-- Atomically decrements reserved_kg on inventory_availability.
-- Uses GREATEST(0, ...) — reserved_kg can never go below zero.
-- Returns 1 if a row was updated, 0 if inv_id was not found.
--
-- Called from /api/webhooks/stripe when:
--   - payment_intent.payment_failed  → release reservation on payment failure
--   - charge.refunded                → release reservation on refund
--
-- Uses security definer to bypass RLS (webhook runs server-side under service role).

create or replace function decrement_reserved_kg(inv_id uuid, delta numeric)
returns integer
language sql
security definer
as $$
  with updated as (
    update inventory_availability
    set
      reserved_kg = greatest(0, reserved_kg - delta),
      updated_at  = now()
    where id = inv_id
    returning id
  )
  select count(*)::integer from updated;
$$;

-- Returns 1 = success (row updated), 0 = inv_id not found.
-- Reserved_kg floored at 0 — safe to call even if already 0.

commit;
