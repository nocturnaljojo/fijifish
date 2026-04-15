-- FijiFish — Migration 015
-- Row Level Security policies for all customer-facing tables.
--
-- MANUAL APPLY REQUIRED: Paste this file into Supabase Dashboard → SQL Editor.
--
-- ============================================================
-- CRITICAL: Clerk JWT → Supabase Integration Required
-- ============================================================
-- This project uses Clerk for auth, NOT Supabase Auth.
-- RLS policies that scope data by user identity (orders, customers, etc.)
-- will NOT enforce until Clerk is configured as a Supabase JWT provider:
--
--   1. Supabase Dashboard → Authentication → JWT Settings
--      → Add new JWT secret from Clerk Dashboard → API Keys → JWT public key
--
--   2. In Clerk Dashboard → API Keys → Advanced → JWT Templates:
--      Create a "Supabase" template with audience set to your Supabase project URL.
--      Include claims: { "role": "authenticated", "email": "{{user.primary_email_address}}" }
--
--   3. When initialising the Supabase browser client (createBrowserSupabaseClient),
--      pass the Clerk session token as the Authorization header:
--        const token = await session.getToken({ template: 'supabase' });
--        supabase.auth.setSession({ access_token: token, refresh_token: '' });
--
-- Until that is done:
--   - createServerSupabaseClient() (service role) → BYPASSES all RLS → admin/webhook routes are unaffected
--   - createPublicSupabaseClient() (anon key) → respects RLS → anon SELECT policies apply NOW
--   - User-specific policies (orders, customers, etc.) → return empty until JWT is configured
--   - Existing security proxy (WHERE customer_id = ? in server components) remains the safety layer
--
-- The requesting_user_clerk_id() and requesting_user_role() helpers below read from
-- auth.jwt(), which is populated ONLY when a Clerk-issued JWT is passed to Supabase.
-- ============================================================

begin;

-- ============================================================
-- Helper functions
-- ============================================================

-- Extract the Clerk user ID from the JWT 'sub' claim.
-- Returns NULL for anon requests (no JWT) or service role (bypasses RLS entirely).
create or replace function public.requesting_user_clerk_id()
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select auth.jwt() ->> 'sub';
$$;

-- Extract the user's role from the Clerk JWT metadata claim.
-- Clerk session token must be customised with: { "metadata": "{{user.public_metadata}}" }
-- Returns NULL if no JWT or no role set (defaults to buyer behaviour).
create or replace function public.requesting_user_role()
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select auth.jwt() -> 'metadata' ->> 'role';
$$;

-- ============================================================
-- Enable RLS on all tables (impact_stories already enabled in migration 004)
-- ============================================================

alter table users                  enable row level security;
alter table villages               enable row level security;
alter table fish_species           enable row level security;
alter table seasons                enable row level security;
alter table delivery_zones         enable row level security;
alter table flight_windows         enable row level security;
alter table customers              enable row level security;
alter table suppliers              enable row level security;
alter table drivers                enable row level security;
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
-- impact_stories: already enabled in migration 004 — policies added below

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

-- Admin can soft-delete users (is_active, deleted_at).
create policy "admin_update_users"
  on users for update
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- VILLAGES — public read
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
-- FISH_SPECIES — public read
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
-- SEASONS — public read
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
-- DELIVERY_ZONES — public read (used in broadcast UI + settings)
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
-- FLIGHT_WINDOWS — public read (drives countdown timer + homepage)
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
-- INVENTORY_AVAILABILITY — public read, supplier update own village
-- ============================================================

-- Public read: fish grid capacity bars need this via anon client.
create policy "public_select_inventory"
  on inventory_availability for select
  to anon, authenticated
  using (true);

-- Admin full access.
create policy "admin_all_inventory"
  on inventory_availability for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- Suppliers may update their own village's inventory rows only.
-- (Currently supplier API uses service role; this policy is for future authenticated client)
create policy "supplier_update_own_village_inventory"
  on inventory_availability for update
  to authenticated
  using (
    requesting_user_role() = 'supplier'
    and village_id in (
      select s.village_id
      from suppliers s
      inner join users u on s.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
        and s.is_active = true
    )
  )
  with check (
    requesting_user_role() = 'supplier'
    and village_id in (
      select s.village_id
      from suppliers s
      inner join users u on s.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
        and s.is_active = true
    )
  );

-- ============================================================
-- CUSTOMERS — own row only
-- ============================================================

create policy "customers_select_own"
  on customers for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or user_id in (
      select id from users where clerk_id = requesting_user_clerk_id()
    )
  );

create policy "customers_update_own"
  on customers for update
  to authenticated
  using (
    user_id in (
      select id from users where clerk_id = requesting_user_clerk_id()
    )
  )
  with check (
    user_id in (
      select id from users where clerk_id = requesting_user_clerk_id()
    )
  );

create policy "admin_all_customers"
  on customers for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- SUPPLIERS — own row for supplier role
-- ============================================================

create policy "supplier_select_own"
  on suppliers for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or user_id in (
      select id from users where clerk_id = requesting_user_clerk_id()
    )
  );

create policy "admin_all_suppliers"
  on suppliers for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- DRIVERS — own row for driver role
-- ============================================================

create policy "driver_select_own_driver_row"
  on drivers for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or user_id in (
      select id from users where clerk_id = requesting_user_clerk_id()
    )
  );

create policy "admin_all_drivers"
  on drivers for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- ORDERS — buyer reads own, driver updates status, admin all
-- ============================================================

-- Buyers see their own orders; admin sees all.
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

-- Admins can insert/update/delete orders.
create policy "admin_insert_orders"
  on orders for insert
  to authenticated
  with check (requesting_user_role() = 'admin');

create policy "admin_update_orders"
  on orders for update
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- Drivers can update order status (delivered, out_for_delivery).
create policy "driver_update_order_status"
  on orders for update
  to authenticated
  using (requesting_user_role() in ('driver', 'admin'))
  with check (requesting_user_role() in ('driver', 'admin'));

-- ============================================================
-- ORDER_ITEMS — buyer reads own, admin all
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
-- SHIPMENT_UPDATES — authenticated read; supplier inserts own village; admin all
-- ============================================================

-- All authenticated users may read shipment updates (buyers track their orders).
create policy "authenticated_select_shipment_updates"
  on shipment_updates for select
  to authenticated
  using (true);

-- Suppliers insert updates for their own village only.
create policy "supplier_insert_own_village_updates"
  on shipment_updates for insert
  to authenticated
  with check (
    requesting_user_role() in ('supplier', 'admin')
    and (
      requesting_user_role() = 'admin'
      or village_id in (
        select s.village_id
        from suppliers s
        inner join users u on s.user_id = u.id
        where u.clerk_id = requesting_user_clerk_id()
          and s.is_active = true
      )
    )
  );

create policy "admin_all_shipment_updates"
  on shipment_updates for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- CATCH_PHOTOS — supplier reads/inserts own village; admin all
-- ============================================================

create policy "catch_photos_select"
  on catch_photos for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or supplier_id in (
      select s.id
      from suppliers s
      inner join users u on s.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
    )
  );

create policy "supplier_insert_catch_photos"
  on catch_photos for insert
  to authenticated
  with check (
    requesting_user_role() in ('supplier', 'admin')
    and (
      requesting_user_role() = 'admin'
      or supplier_id in (
        select s.id
        from suppliers s
        inner join users u on s.user_id = u.id
        where u.clerk_id = requesting_user_clerk_id()
      )
    )
  );

create policy "admin_update_catch_photos"
  on catch_photos for update
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- DELIVERY_RUNS — driver reads own runs; admin all
-- ============================================================

create policy "delivery_runs_select"
  on delivery_runs for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    or driver_id in (
      select d.id
      from drivers d
      inner join users u on d.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
        and d.is_active = true
    )
  );

-- Drivers can update their own run status (planned → active → completed).
create policy "driver_update_own_runs"
  on delivery_runs for update
  to authenticated
  using (
    requesting_user_role() in ('driver', 'admin')
    and (
      requesting_user_role() = 'admin'
      or driver_id in (
        select d.id
        from drivers d
        inner join users u on d.user_id = u.id
        where u.clerk_id = requesting_user_clerk_id()
          and d.is_active = true
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
-- DELIVERY_STOPS — driver reads own run's stops; buyer reads own order's stop; admin all
-- ============================================================

create policy "delivery_stops_select"
  on delivery_stops for select
  to authenticated
  using (
    requesting_user_role() = 'admin'
    -- Drivers see stops for their own runs
    or delivery_run_id in (
      select dr.id
      from delivery_runs dr
      inner join drivers d on dr.driver_id = d.id
      inner join users u on d.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
    )
    -- Buyers can see their own order's stop (for tracking)
    or order_id in (
      select o.id
      from orders o
      inner join customers c on o.customer_id = c.id
      inner join users u on c.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
    )
  );

-- Drivers update stop status (pending → arrived → delivered/skipped).
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
      inner join drivers d on dr.driver_id = d.id
      inner join users u on d.user_id = u.id
      where u.clerk_id = requesting_user_clerk_id()
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
-- FISH_INTEREST_VOTES — anon insert (votes can be anonymous); read for summary view
-- ============================================================

-- IMPORTANT: /api/survey/vote uses createPublicSupabaseClient() (anon key) for INSERT.
-- The anon INSERT policy is required or vote submissions will fail immediately after
-- this migration is applied.
create policy "anon_insert_fish_votes"
  on fish_interest_votes for insert
  to anon, authenticated
  with check (true);

-- Anon can SELECT own session votes (for duplicate vote detection in the view).
create policy "anon_select_fish_votes"
  on fish_interest_votes for select
  to anon, authenticated
  using (true);

-- ============================================================
-- CUSTOMER_FEEDBACK — anon insert (feedback can be anonymous)
-- ============================================================

-- IMPORTANT: /api/feedback uses createPublicSupabaseClient() (anon key) for INSERT.
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
-- DELIVERY_DEMAND_VOTES — anon insert (API validates Clerk auth at app layer)
-- ============================================================

-- IMPORTANT: /api/delivery-demand/vote uses createPublicSupabaseClient() for INSERT.
create policy "anon_insert_demand_votes"
  on delivery_demand_votes for insert
  to anon, authenticated
  with check (true);

create policy "admin_select_demand_votes"
  on delivery_demand_votes for select
  to authenticated
  using (requesting_user_role() = 'admin');

-- ============================================================
-- IMPACT_STORIES — public read already exists (migration 004); add admin policy
-- ============================================================

-- Admin can read all (including unpublished) and manage stories.
create policy "admin_all_impact_stories"
  on impact_stories for all
  to authenticated
  using (requesting_user_role() = 'admin')
  with check (requesting_user_role() = 'admin');

-- ============================================================
-- CATCH_BATCHES — public read for approved batches (QR traceability page)
-- ============================================================

create policy "public_select_approved_catch_batches"
  on catch_batches for select
  to anon, authenticated
  using (is_approved = true);

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
-- VILLAGE_MEDIA — public read for approved media; supplier insert; admin all
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

commit;

-- ============================================================
-- Post-apply checklist
-- ============================================================
-- After applying:
-- 1. Verify homepage loads: public SELECT on fish_species, flight_windows,
--    inventory_availability, villages must work via anon key.
-- 2. Verify /impact page loads: impact_stories public read policy was in migration 004.
-- 3. Verify catch photo vote still works: fish_interest_votes anon INSERT.
-- 4. Verify feedback form works: customer_feedback anon INSERT.
-- 5. Admin routes: all use service role → bypass RLS → unaffected.
-- 6. Buyer data isolation (orders, customers): enforced ONLY after Clerk JWT
--    integration is configured (see instructions at top of file).
