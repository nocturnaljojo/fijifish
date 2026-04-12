-- Migration 009: increment_reserved_kg RPC
--
-- Atomically increments reserved_kg on inventory_availability.
-- Returns 1 if the update succeeded, 0 if there was insufficient stock.
--
-- Called from /api/checkout after order creation to reserve cargo space.
-- Uses a conditional UPDATE so two concurrent checkouts cannot both succeed
-- when only one slot remains (race-condition safe).
--
-- available_kg is a GENERATED column (total_capacity_kg - reserved_kg),
-- so updating reserved_kg automatically recalculates it.

create or replace function increment_reserved_kg(inv_id uuid, delta numeric)
returns integer
language sql
security definer
as $$
  with updated as (
    update inventory_availability
    set
      reserved_kg = reserved_kg + delta,
      updated_at  = now()
    where id = inv_id
      and (total_capacity_kg - reserved_kg) >= delta
    returning id
  )
  select count(*)::integer from updated;
$$;

-- Returns 1 = success, 0 = insufficient stock (sold out between check and reserve).
-- The function uses security definer so it runs with owner privileges,
-- bypassing RLS for this specific atomic operation.
-- Only call this from trusted server-side code (API routes with requireAuth).
