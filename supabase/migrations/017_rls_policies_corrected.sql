-- FijiFish — Migration 017
-- RLS policies corrected — supersedes migration 015 which failed to apply.
--
-- Root cause of 015 failure: referenced `suppliers` and `drivers` tables that do not
-- exist in the live schema. The entire begin/commit transaction rolled back, leaving
-- zero tables with RLS enabled (impact_stories kept its pre-existing RLS from 004).
--
-- Changes from 015:
--   - Removed `alter table suppliers / drivers enable row level security`
--   - Removed all policy blocks for the `suppliers` and `drivers` tables
--   - Replaced all `from suppliers s inner join users u` subqueries with
--     direct users table check: `users.role = 'supplier'`
--   - Replaced all `from drivers d inner join users u` subqueries with
--     direct users table check: `users.role = 'driver'`
--   - catch_photos: supplier_id comparison uses users.id directly
--   - delivery_runs/stops/proofs: driver_id comparison uses users.id directly
--   - catch_batches: `using (is_approved = true)` → `using (true)` because
--     `is_approved` column does not exist in live schema; re-enable when
--     photo-approval workflow is built and column is added
--   - village_media: `is_approved` column DOES exist — policy unchanged
--   - Helper functions re-created (rolled back with 015)
--
-- MANUAL APPLY: Paste into Supabase Dashboard → SQL Editor → Run
-- Do NOT edit migration 015 — this file supersedes it.
-- After apply, run /db-check — all 25 tables must show RLS enabled.
--
-- ============================================================
-- IMPORTANT: Clerk JWT → Supabase bridge must be configured for
-- user-specific policies to enforce. Verified live (Session V, 2026-04-16):
--   - Clerk JWT template "supabase" configured with HS256 signing
--   - Claims include: sub={{user.id}}, metadata={{user.public_metadata}}
--   - requesting_user_clerk_id() reads auth.jwt()->>'sub' (Clerk user_xxx ID)
--   - requesting_user_role() reads auth.jwt()->'metadata'->>'role'
-- Until a Clerk JWT is passed to the Supabase client, requesting_user_clerk_id()
-- and requesting_user_role() return NULL → policies that depend on them deny access.
-- Public/anon policies (fish, windows, etc.) are unaffected.
-- ============================================================

begin;

-- ============================================================
-- Helper functions
-- Re-creating here because migration 015 rolled back before these
-- could commit. create or replace is idempotent — safe to re-run.
-- ============================================================

create or replace function public.requesting_user_clerk_id()
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select auth.jwt() ->> 'sub';
$$;

create or replace function public.requesting_user_role()
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select auth.jwt() -> 'metadata' ->> 'role';
$$;

grant execute on function public.requesting_user_clerk_id() to authenticated, anon;
grant execute on function public.requesting_user_role() to authenticated, anon;

-- ============================================================
-- Enable RLS on all 24 tables
-- impact_stories is excluded — already has RLS from migration 004.
-- ============================================================

alter table users                  enable row level security;
alter table villages               enable row level security;
alter table fish_species           enable row level security;
alter table seasons                enable row level security;
alter table delivery_zones         enable row level security;
alter table flight_windows         enable row level security;
alter table customers              enable row level security;
alter table inventory_availability enable row level security;
alter table delivery_runs          enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table catch_photos           enable row level security;
alter table shipment_updates       enable row level security;
alter table delivery_stops         enable row level security;
alter table delivery_proofs        enable row level security;
alter table driver_gps_logs        enable row level security;
alter table broadcasts             enable row level security;
alter table broadcast_recipients   enable row level security;
alter table fish_interest_votes    enable row level security;
alter table customer_feedback      enable row level security;
alter table delivery_demand_votes  enable row level security;
alter table catch_batches          enable row level security;
alter table village_media          enable row level security;
alter table notification_log       enable row level security;

-- ============================================================
-- USERS
-- ============================================================

-- Each authenticated user can read their own row.
create policy "users_select_own"
  on users for select
  to authenticated
  using (clerk_id = requesting_user_clerk_id());

-- Admin can read all users.
create policy "admin_select_all_users"
  on users for select
  to authenticated
  using (requesting_user_role() = 'admin');

-- Admin can update users (soft-delete, is_active, role changes).
create policy "admin_update_users"
  on users for update
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- VILLAGES — public read; admin write
-- ============================================================

create policy "public_select_villages"
  on villages for select
  to anon, authenticated
  using (true);

create policy "admin_insert_villages"
  on villages for insert
  to authenticated
  with check (requesting_user_role() = 'admin');

create policy "admin_update_villages"
  on villages for update
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- FISH_SPECIES — public read; admin write
-- ============================================================

create policy "public_select_fish_species"
  on fish_species for select
  to anon, authenticated
  using (true);

create policy "admin_insert_fish_species"
  on fish_species for insert
  to authenticated
  with check (requesting_user_role() = 'admin');

create policy "admin_update_fish_species"
  on fish_species for update
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

create policy "admin_delete_fish_species"
  on fish_species for delete
  to authenticated
  using (requesting_user_role() = 'admin');

-- ============================================================
-- SEASONS — public read; admin all
-- ============================================================

create policy "public_select_seasons"
  on seasons for select
  to anon, authenticated
  using (true);

create policy "admin_all_seasons"
  on seasons for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- DELIVERY_ZONES — public read; admin all
-- ============================================================

create policy "public_select_delivery_zones"
  on delivery_zones for select
  to anon, authenticated
  using (true);

create policy "admin_all_delivery_zones"
  on delivery_zones for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- FLIGHT_WINDOWS — public read; admin write
-- Drives countdown timer and homepage — must remain readable by anon.
-- ============================================================

create policy "public_select_flight_windows"
  on flight_windows for select
  to anon, authenticated
  using (true);

create policy "admin_insert_flight_windows"
  on flight_windows for insert
  to authenticated
  with check (requesting_user_role() = 'admin');

create policy "admin_update_flight_windows"
  on flight_windows for update
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- INVENTORY_AVAILABILITY — public read; supplier + admin write
-- Public read required: fish grid capacity bars use anon client.
-- Village scoping for suppliers is enforced at the API layer
-- (no suppliers table in live schema for DB-level village FK).
-- ============================================================

create policy "public_select_inventory"
  on inventory_availability for select
  to anon, authenticated
  using (true);

create policy "admin_all_inventory"
  on inventory_availability for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

create policy "supplier_update_inventory"
  on inventory_availability for update
  to authenticated
  using  (requesting_user_role() in ('supplier', 'admin'))
  with check (requesting_user_role() in ('supplier', 'admin'));

-- ============================================================
-- CUSTOMERS — own row only; admin all
-- Insertion is via Clerk webhook (service role → bypasses RLS).
-- ============================================================

create policy "customers_select_own"
  on customers for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or user_id = (select id from users where clerk_id = requesting_user_clerk_id())
  );

create policy "customers_update_own"
  on customers for update
  to authenticated
  using (
    user_id = (select id from users where clerk_id = requesting_user_clerk_id())
  )
  with check (
    user_id = (select id from users where clerk_id = requesting_user_clerk_id())
  );

create policy "admin_all_customers"
  on customers for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- ORDERS — buyer reads own; admin all; driver updates status
-- Insertion is via checkout API (service role → bypasses RLS).
-- ============================================================

create policy "orders_select"
  on orders for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or customer_id in (
      select c.id
      from customers c
      inner join users u on c.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
    )
  );

create policy "admin_update_orders"
  on orders for update
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- Drivers can update order status (out_for_delivery, delivered).
create policy "driver_update_order_status"
  on orders for update
  to authenticated
  using (requesting_user_role() in ('driver', 'admin'))
  with check (requesting_user_role() in ('driver', 'admin'));

-- ============================================================
-- ORDER_ITEMS — buyer reads own (via order); admin all
-- ============================================================

create policy "order_items_select"
  on order_items for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or order_id in (
      select o.id
      from orders o
      inner join customers c on o.customer_id = c.id
      inner join users u on c.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
    )
  );

create policy "admin_all_order_items"
  on order_items for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- SHIPMENT_UPDATES — authenticated read; supplier + admin insert/manage
-- Suppliers post updates for their own village; village scoping
-- is enforced at API layer (no suppliers table in live schema).
-- ============================================================

-- Scoped: admin + supplier + driver see all; buyers see only updates for
-- flight windows they have an order on. Defense in depth — shipment_updates
-- reveals operational patterns; no PII but not fully public.
create policy "authenticated_select_shipment_updates"
  on shipment_updates for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or requesting_user_role() in ('supplier', 'driver')
    or flight_window_id in (
      select o.flight_window_id from orders o
      inner join customers c on o.customer_id = c.id
      inner join users u on c.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
    )
  );

create policy "supplier_insert_shipment_updates"
  on shipment_updates for insert
  to authenticated
  with check (requesting_user_role() in ('supplier', 'admin'));

create policy "admin_all_shipment_updates"
  on shipment_updates for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- CATCH_PHOTOS — supplier reads/inserts own; admin all
-- catch_photos.supplier_id is uuid referencing users.id
-- (no suppliers table in live schema — direct users.id comparison).
-- ============================================================

create policy "catch_photos_select"
  on catch_photos for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or supplier_id = (
      select id from users
      where clerk_id = requesting_user_clerk_id()
    )
  );

create policy "supplier_insert_catch_photos"
  on catch_photos for insert
  to authenticated
  with check (requesting_user_role() in ('supplier', 'admin'));

create policy "admin_update_catch_photos"
  on catch_photos for update
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- DELIVERY_RUNS — driver reads/updates own runs; admin all
-- delivery_runs.driver_id is uuid referencing users.id
-- (no drivers table in live schema — direct users.id comparison).
-- ============================================================

create policy "delivery_runs_select"
  on delivery_runs for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or driver_id = (
      select id from users
      where clerk_id = requesting_user_clerk_id()
    )
  );

create policy "driver_update_own_runs"
  on delivery_runs for update
  to authenticated
  using (
    requesting_user_role() in ('driver', 'admin')
    and (
      requesting_user_role() = 'admin'
      or driver_id = (
        select id from users
        where clerk_id = requesting_user_clerk_id()
      )
    )
  )
  with check (requesting_user_role() in ('driver', 'admin'));

create policy "admin_all_delivery_runs"
  on delivery_runs for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- DELIVERY_STOPS — driver reads own run's stops; buyer reads own; admin all
-- ============================================================

create policy "delivery_stops_select"
  on delivery_stops for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    -- Drivers see stops for their own runs
    or delivery_run_id in (
      select id from delivery_runs
      where driver_id = (
        select id from users
        where clerk_id = requesting_user_clerk_id()
      )
    )
    -- Buyers see their own order's stop (for delivery tracking)
    or customer_id in (
      select c.id from customers c
      inner join users u on c.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
    )
  );

create policy "driver_update_stops"
  on delivery_stops for update
  to authenticated
  using (requesting_user_role() in ('driver', 'admin'))
  with check (requesting_user_role() in ('driver', 'admin'));

create policy "admin_all_delivery_stops"
  on delivery_stops for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- DELIVERY_PROOFS — driver inserts/reads own; admin all
-- Chain: delivery_proofs → delivery_stops → delivery_runs → users
-- (no drivers table in live schema).
-- ============================================================

create policy "delivery_proofs_select"
  on delivery_proofs for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or delivery_stop_id in (
      select ds.id
      from delivery_stops ds
      inner join delivery_runs dr on ds.delivery_run_id = dr.id
      where dr.driver_id = (
        select id from users
        where clerk_id = requesting_user_clerk_id()
      )
    )
  );

create policy "driver_insert_proofs"
  on delivery_proofs for insert
  to authenticated
  with check (requesting_user_role() in ('driver', 'admin'));

create policy "admin_all_delivery_proofs"
  on delivery_proofs for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- DRIVER_GPS_LOGS — driver inserts own; admin reads all
-- ============================================================

create policy "driver_insert_gps_logs"
  on driver_gps_logs for insert
  to authenticated
  with check (requesting_user_role() in ('driver', 'admin'));

create policy "admin_select_gps_logs"
  on driver_gps_logs for select
  to authenticated
  using (requesting_user_role() = 'admin');

-- ============================================================
-- BROADCASTS + BROADCAST_RECIPIENTS — admin only
-- ============================================================

create policy "admin_all_broadcasts"
  on broadcasts for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

create policy "admin_all_broadcast_recipients"
  on broadcast_recipients for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- FISH_INTEREST_VOTES — anon insert + select (vote flow uses anon client)
-- IMPORTANT: /api/survey/vote uses createPublicSupabaseClient() (anon key).
-- Removing this anon INSERT policy will break vote submissions immediately.
-- ============================================================

create policy "anon_insert_fish_votes"
  on fish_interest_votes for insert
  to anon, authenticated
  with check (true);

create policy "anon_select_fish_votes"
  on fish_interest_votes for select
  to anon, authenticated
  using (true);

-- ============================================================
-- CUSTOMER_FEEDBACK — anon insert; owner reads own; admin all
-- IMPORTANT: /api/feedback uses createPublicSupabaseClient() (anon key).
-- ============================================================

create policy "anon_insert_feedback"
  on customer_feedback for insert
  to anon, authenticated
  with check (true);

create policy "authenticated_select_own_feedback"
  on customer_feedback for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or customer_clerk_id = requesting_user_clerk_id()
  );

-- ============================================================
-- DELIVERY_DEMAND_VOTES — anon insert; admin reads
-- IMPORTANT: /api/delivery-demand/vote uses createPublicSupabaseClient() (anon key).
-- ============================================================

create policy "anon_insert_demand_votes"
  on delivery_demand_votes for insert
  to anon, authenticated
  with check (true);

create policy "admin_select_demand_votes"
  on delivery_demand_votes for select
  to authenticated
  using (requesting_user_role() = 'admin');

-- ============================================================
-- CATCH_BATCHES — public read; supplier insert; admin all
-- NOTE: `is_approved` column does NOT exist in live schema.
-- Using `true` for public read until photo-approval workflow
-- is built and the column is added (future migration).
-- ============================================================

create policy "public_select_catch_batches"
  on catch_batches for select
  to anon, authenticated
  using (true);

create policy "admin_all_catch_batches"
  on catch_batches for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

create policy "supplier_insert_catch_batches"
  on catch_batches for insert
  to authenticated
  with check (requesting_user_role() in ('supplier', 'admin'));

-- ============================================================
-- VILLAGE_MEDIA — public read of approved media; supplier insert; admin all
-- NOTE: `is_approved` column EXISTS on village_media (verified in live schema).
-- ============================================================

create policy "public_select_approved_village_media"
  on village_media for select
  to anon, authenticated
  using (is_approved = true);

create policy "supplier_insert_village_media"
  on village_media for insert
  to authenticated
  with check (requesting_user_role() in ('supplier', 'admin'));

create policy "admin_all_village_media"
  on village_media for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- NOTIFICATION_LOG — own records; admin all
-- Ownership chain: notification_log.customer_id → customers.user_id → users.clerk_id
-- ============================================================

create policy "notification_log_select_own"
  on notification_log for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or customer_id in (
      select c.id from customers c
      inner join users u on c.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
    )
  );

create policy "admin_all_notification_log"
  on notification_log for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- IMPACT_STORIES — admin policy added
-- RLS already enabled + public read policy from migration 004.
-- This only adds the missing admin ALL policy.
-- ============================================================

create policy "admin_all_impact_stories"
  on impact_stories for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

commit;

-- ============================================================
-- Post-apply checklist (run after applying in SQL Editor)
-- ============================================================
-- 1. Run /db-check — checks 7 (rls-enabled) and 8 (rls-policies) must PASS.
-- 2. Verify homepage loads: anon SELECT on fish_species, flight_windows,
--    inventory_availability, villages must work via createPublicSupabaseClient().
-- 3. Verify /villages and /impact pages load (villages + impact_stories public read).
-- 4. Verify fish interest vote works: fish_interest_votes anon INSERT.
-- 5. Verify feedback form works: customer_feedback anon INSERT.
-- 6. Verify /api/delivery-demand/vote works: delivery_demand_votes anon INSERT.
-- 7. Admin routes: all use service role → bypass RLS → unaffected.
-- 8. Buyer order history (/dashboard): enforced ONLY when Clerk JWT is passed
--    to the Supabase client (getSupabaseUser() in page.tsx — already wired in Session U).
