-- FijiFish — Initial schema (v3 spec §11)
-- Phase 0. Creates all 21 tables with FK relationships and indexes.
-- RLS policies intentionally NOT added yet — will be layered on once
-- Clerk roles + Supabase sync are wired up.
--
-- Conventions:
--   * snake_case plural table names
--   * UUID PKs with gen_random_uuid() default
--   * money as integer cents (price_aud_cents, price_fjd_cents)
--   * weights as DECIMAL(10,2) kg
--   * lat/lng as DECIMAL(10,7)
--   * timestamps TIMESTAMPTZ, default now()
--   * status columns use TEXT + CHECK constraints

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 1. users  (synced from Clerk — clerk_id is the join key)
-- ============================================================
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  clerk_id        text unique not null,
  role            text not null check (role in ('buyer','supplier','driver','admin')),
  full_name       text,
  email           text,
  phone           text,
  country_code    text,   -- 'AU', 'FJ', 'NZ', ...
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists users_clerk_id_idx on users(clerk_id);
create index if not exists users_role_idx on users(role);

-- ============================================================
-- 2. villages  (supply nodes — Galoa is the launch village)
-- ============================================================
create table if not exists villages (
  id                uuid primary key default gen_random_uuid(),
  name              text unique not null,
  province          text,
  island            text,
  description       text,
  impact_summary    text,
  hero_image_url    text,
  gallery_urls      jsonb default '[]'::jsonb,
  location_lat      decimal(10, 7),
  location_lng      decimal(10, 7),
  contact_name      text,
  contact_phone     text,
  is_active         boolean not null default false,
  onboarded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists villages_is_active_idx on villages(is_active);

-- ============================================================
-- 3. fish_species
-- ============================================================
create table if not exists fish_species (
  id                   uuid primary key default gen_random_uuid(),
  name_fijian          text,
  name_english         text unique not null,
  name_scientific      text,
  description          text,
  cooking_suggestions  text,
  default_image_url    text,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now()
);

-- ============================================================
-- 4. delivery_zones
-- ============================================================
create table if not exists delivery_zones (
  id                       uuid primary key default gen_random_uuid(),
  name                     text unique not null,           -- 'Wagga Wagga', 'Griffith'
  state                    text not null,                  -- 'NSW', 'ACT'
  delivery_fee_aud_cents   integer not null default 0,
  min_order_aud_cents      integer not null default 0,
  zone_lat                 decimal(10, 7),
  zone_lng                 decimal(10, 7),
  is_active                boolean not null default true,
  created_at               timestamptz not null default now()
);

-- ============================================================
-- 5. flight_windows  (time window + flight details)
-- ============================================================
create table if not exists flight_windows (
  id                      uuid primary key default gen_random_uuid(),
  flight_date             date not null,
  flight_number           text,
  labasa_departure_time   timestamptz,
  nadi_departure_time     timestamptz,
  canberra_arrival_time   timestamptz,
  order_open_at           timestamptz not null,
  order_close_at          timestamptz not null,
  status                  text not null default 'upcoming'
                          check (status in (
                            'upcoming','open','closing_soon','closed',
                            'packing','shipped','in_transit','landed',
                            'customs','delivering','delivered','cancelled'
                          )),
  status_updated_at       timestamptz not null default now(),
  notes                   text,
  created_at              timestamptz not null default now()
);

create index if not exists flight_windows_status_idx on flight_windows(status);
create index if not exists flight_windows_flight_date_idx on flight_windows(flight_date);

-- ============================================================
-- 6. customers  (buyer profile data, one-to-one with users)
-- ============================================================
create table if not exists customers (
  id                                uuid primary key default gen_random_uuid(),
  user_id                           uuid not null references users(id) on delete cascade,
  nationality                       text,
  delivery_address                  text,
  delivery_address_lat              decimal(10, 7),
  delivery_address_lng              decimal(10, 7),
  delivery_zone_id                  uuid references delivery_zones(id),
  preferred_notification_channel    text check (preferred_notification_channel in ('sms','whatsapp','email')),
  referral_source                   text,
  broadcast_opt_in                  boolean not null default true,
  broadcast_opt_out                 boolean not null default false,
  state                             text,   -- 'NSW','ACT','VIC','QLD' — derived from delivery zone
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  unique (user_id)
);

create index if not exists customers_user_id_idx on customers(user_id);
create index if not exists customers_delivery_zone_id_idx on customers(delivery_zone_id);
create index if not exists customers_state_idx on customers(state);

-- ============================================================
-- 7. suppliers  (village operator — one supplier per village user)
-- ============================================================
create table if not exists suppliers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  village_id  uuid not null references villages(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id)
);

create index if not exists suppliers_village_id_idx on suppliers(village_id);

-- ============================================================
-- 8. drivers
-- ============================================================
create table if not exists drivers (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id) on delete cascade,
  vehicle_description  text,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  unique (user_id)
);

-- ============================================================
-- 9. seasons  (month-range fishing seasons per species)
-- ============================================================
create table if not exists seasons (
  id                uuid primary key default gen_random_uuid(),
  fish_species_id   uuid not null references fish_species(id) on delete cascade,
  month_start       integer not null check (month_start between 1 and 12),
  month_end         integer not null check (month_end between 1 and 12),
  notes             text,
  created_at        timestamptz not null default now()
);

create index if not exists seasons_fish_species_id_idx on seasons(fish_species_id);

-- ============================================================
-- 10. inventory_availability  (capacity + price per species/window/village)
-- ============================================================
create table if not exists inventory_availability (
  id                       uuid primary key default gen_random_uuid(),
  fish_species_id          uuid not null references fish_species(id),
  flight_window_id         uuid not null references flight_windows(id) on delete cascade,
  village_id               uuid not null references villages(id),
  total_capacity_kg        decimal(10, 2) not null default 0,
  reserved_kg              decimal(10, 2) not null default 0,
  available_kg             decimal(10, 2) generated always as (total_capacity_kg - reserved_kg) stored,
  price_aud_cents          integer not null default 0,
  price_fjd_cents          integer not null default 0,
  confirmed_by_supplier    boolean not null default false,
  confirmed_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (fish_species_id, flight_window_id, village_id)
);

create index if not exists inventory_availability_window_idx on inventory_availability(flight_window_id);
create index if not exists inventory_availability_village_idx on inventory_availability(village_id);

-- ============================================================
-- 11. delivery_runs  (a driver's route for one flight window)
-- ============================================================
create table if not exists delivery_runs (
  id                     uuid primary key default gen_random_uuid(),
  flight_window_id       uuid not null references flight_windows(id),
  driver_id              uuid not null references drivers(id),
  status                 text not null default 'planned'
                         check (status in ('planned','active','completed')),
  started_at             timestamptz,
  completed_at           timestamptz,
  total_distance_km      decimal(10, 2),
  total_duration_minutes integer,
  stop_count             integer,
  created_by             uuid references users(id),
  created_at             timestamptz not null default now()
);

create index if not exists delivery_runs_flight_window_idx on delivery_runs(flight_window_id);
create index if not exists delivery_runs_driver_idx on delivery_runs(driver_id);
create index if not exists delivery_runs_status_idx on delivery_runs(status);

-- ============================================================
-- 12. orders
-- ============================================================
create table if not exists orders (
  id                         uuid primary key default gen_random_uuid(),
  customer_id                uuid not null references customers(id),
  flight_window_id           uuid not null references flight_windows(id),
  delivery_zone_id           uuid references delivery_zones(id),
  delivery_run_id            uuid references delivery_runs(id),
  status                     text not null default 'pending'
                             check (status in (
                               'pending','confirmed','paid','cancelled',
                               'refunded','out_for_delivery','delivered'
                             )),
  total_aud_cents            integer not null default 0,
  delivery_fee_aud_cents     integer not null default 0,
  stripe_payment_intent_id   text,
  placed_at                  timestamptz not null default now(),
  delivered_at               timestamptz,
  rating                     integer check (rating between 1 and 5),
  feedback_text              text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index if not exists orders_customer_idx on orders(customer_id);
create index if not exists orders_flight_window_idx on orders(flight_window_id);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_delivery_run_idx on orders(delivery_run_id);

-- ============================================================
-- 13. order_items
-- ============================================================
create table if not exists order_items (
  id                         uuid primary key default gen_random_uuid(),
  order_id                   uuid not null references orders(id) on delete cascade,
  fish_species_id            uuid not null references fish_species(id),
  village_id                 uuid not null references villages(id),
  quantity_kg                decimal(10, 2) not null check (quantity_kg > 0),
  price_per_kg_aud_cents     integer not null,
  price_per_kg_fjd_cents     integer not null default 0,
  created_at                 timestamptz not null default now()
);

create index if not exists order_items_order_idx on order_items(order_id);
create index if not exists order_items_village_idx on order_items(village_id);

-- ============================================================
-- 14. catch_photos  (supplier uploads → admin approval → buyer notify)
-- ============================================================
create table if not exists catch_photos (
  id                   uuid primary key default gen_random_uuid(),
  supplier_id          uuid not null references suppliers(id),
  village_id           uuid not null references villages(id),
  fish_species_id      uuid not null references fish_species(id),
  flight_window_id     uuid references flight_windows(id),
  image_url            text not null,
  estimated_weight_kg  decimal(10, 2),
  note                 text,
  status               text not null default 'pending'
                       check (status in ('pending','approved','rejected')),
  approved_by          uuid references users(id),
  approved_at          timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists catch_photos_status_idx on catch_photos(status);
create index if not exists catch_photos_window_idx on catch_photos(flight_window_id);
create index if not exists catch_photos_village_idx on catch_photos(village_id);

-- ============================================================
-- 15. shipment_updates  (9-step tracking per village per window)
-- ============================================================
create table if not exists shipment_updates (
  id                         uuid primary key default gen_random_uuid(),
  flight_window_id           uuid not null references flight_windows(id) on delete cascade,
  village_id                 uuid not null references villages(id),
  status                     text not null check (status in (
                               'caught','processing','packed','at_airport',
                               'cargo_accepted','departed','in_flight','landed',
                               'customs_cleared','out_for_delivery','delivered'
                             )),
  updated_by                 uuid references users(id),
  photo_url                  text,
  note                       text,
  requires_admin_approval    boolean not null default false,
  admin_approved             boolean,
  admin_approved_by          uuid references users(id),
  admin_approved_at          timestamptz,
  created_at                 timestamptz not null default now()
);

create index if not exists shipment_updates_window_idx on shipment_updates(flight_window_id);
create index if not exists shipment_updates_village_idx on shipment_updates(village_id);

-- ============================================================
-- 16. delivery_stops  (ordered sequence of delivery locations)
-- ============================================================
create table if not exists delivery_stops (
  id                 uuid primary key default gen_random_uuid(),
  delivery_run_id    uuid not null references delivery_runs(id) on delete cascade,
  order_id           uuid not null references orders(id),
  customer_id        uuid not null references customers(id),
  sequence_number    integer not null,
  address            text,
  lat                decimal(10, 7),
  lng                decimal(10, 7),
  status             text not null default 'pending'
                     check (status in ('pending','arrived','delivered','skipped','escalated')),
  arrived_at         timestamptz,
  delivered_at       timestamptz,
  is_communal        boolean not null default false,
  communal_group_id  uuid,
  notes              text,
  created_at         timestamptz not null default now()
);

create index if not exists delivery_stops_run_idx on delivery_stops(delivery_run_id);
create index if not exists delivery_stops_order_idx on delivery_stops(order_id);
create index if not exists delivery_stops_run_sequence_idx on delivery_stops(delivery_run_id, sequence_number);

-- ============================================================
-- 17. delivery_proofs  (photo + GPS at each stop)
-- ============================================================
create table if not exists delivery_proofs (
  id                         uuid primary key default gen_random_uuid(),
  delivery_stop_id           uuid not null references delivery_stops(id) on delete cascade,
  order_id                   uuid not null references orders(id),
  photo_url                  text not null,
  gps_lat                    decimal(10, 7),
  gps_lng                    decimal(10, 7),
  captured_at                timestamptz not null default now(),
  received_by_name           text,
  is_proxy_delivery          boolean not null default false,
  admin_approval_required    boolean not null default false,
  admin_approved             boolean,
  admin_approved_by          uuid references users(id),
  admin_approved_at          timestamptz,
  admin_note                 text,
  created_at                 timestamptz not null default now()
);

create index if not exists delivery_proofs_stop_idx on delivery_proofs(delivery_stop_id);

-- ============================================================
-- 18. driver_gps_logs
-- ============================================================
create table if not exists driver_gps_logs (
  id                 uuid primary key default gen_random_uuid(),
  delivery_run_id    uuid not null references delivery_runs(id) on delete cascade,
  driver_id          uuid not null references drivers(id),
  lat                decimal(10, 7) not null,
  lng                decimal(10, 7) not null,
  captured_at        timestamptz not null default now()
);

create index if not exists driver_gps_logs_run_idx on driver_gps_logs(delivery_run_id);
create index if not exists driver_gps_logs_captured_at_idx on driver_gps_logs(captured_at);

-- ============================================================
-- 19. broadcasts  (admin → customer segment SMS/WhatsApp)
-- ============================================================
create table if not exists broadcasts (
  id                         uuid primary key default gen_random_uuid(),
  sent_by                    uuid references users(id),
  audience_filter            jsonb not null default '{}'::jsonb,
  channels                   text not null check (channels in ('sms','whatsapp','both')),
  message_text               text not null,
  recipient_count            integer not null default 0,
  estimated_cost_aud_cents   integer not null default 0,
  sent_at                    timestamptz,
  status                     text not null default 'draft'
                             check (status in ('draft','sending','sent','failed')),
  created_at                 timestamptz not null default now()
);

create index if not exists broadcasts_status_idx on broadcasts(status);

-- ============================================================
-- 20. broadcast_recipients  (per-customer delivery log for each broadcast)
-- ============================================================
create table if not exists broadcast_recipients (
  id                 uuid primary key default gen_random_uuid(),
  broadcast_id       uuid not null references broadcasts(id) on delete cascade,
  customer_id        uuid not null references customers(id),
  channel_used       text not null check (channel_used in ('sms','whatsapp')),
  delivery_status    text not null default 'queued'
                     check (delivery_status in ('queued','sent','delivered','failed','unsubscribed')),
  sent_at            timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists broadcast_recipients_broadcast_idx on broadcast_recipients(broadcast_id);
create index if not exists broadcast_recipients_customer_idx on broadcast_recipients(customer_id);

-- ============================================================
-- 21. notification_log  (per-event notification log for buyers)
-- ============================================================
create table if not exists notification_log (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references customers(id) on delete cascade,
  event              text not null,
  channel            text not null check (channel in ('sms','whatsapp','email')),
  message_text       text,
  delivery_status    text,
  sent_at            timestamptz not null default now()
);

create index if not exists notification_log_customer_idx on notification_log(customer_id);
create index if not exists notification_log_event_idx on notification_log(event);

commit;
