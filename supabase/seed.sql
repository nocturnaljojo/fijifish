-- FijiFish — Seed data
-- Idempotent: uses ON CONFLICT DO NOTHING on unique names.
-- Seeds:
--   * Galoa village (launch supplier)
--   * 8 fish species with placeholder season windows
--   * 5 delivery zones (Riverina NSW + Canberra ACT)
--
-- Seasons, coordinates, fees, and min orders are BEST-GUESS placeholders —
-- adjust in the admin panel once real data is confirmed with the village
-- and drivers.

begin;

-- ============================================================
-- Galoa village (Bua, Vanua Levu)
-- ============================================================
insert into villages (
  name, province, island, description, impact_summary,
  location_lat, location_lng, is_active, onboarded_at
) values (
  'Galoa',
  'Bua',
  'Vanua Levu',
  'Galoa is a small coastal fishing village on the Bua coast of Vanua Levu. Fishing has been the lifeblood of the community for generations, with families passing down line-fishing and spearfishing techniques across generations.',
  'FijiFish launch village. Impact stories will be added here as revenue milestones are reached.',
  -16.93,
  178.60,
  true,
  now()
)
on conflict (name) do nothing;

-- ============================================================
-- Fish species (8)
-- ============================================================
insert into fish_species (name_fijian, name_english, name_scientific, description, cooking_suggestions) values
  ('Walu',     'Spanish Mackerel',     'Scomberomorus commerson',  'Firm, meaty white flesh. A Fijian favourite and the signature species of Galoa catches.', 'Pan-sear, grill, or bake. Pairs well with citrus and coconut.'),
  ('Saqa',     'Trevally',             'Caranx spp.',              'Robust pelagic fish with rich flavour and firm texture.',                                 'Grill over charcoal, sashimi when very fresh, or slow-roast with herbs.'),
  ('Kawakawa', 'Mackerel Tuna',        'Euthynnus affinis',        'A smaller tuna with dark, flavourful flesh.',                                             'Best seared rare or eaten raw as sashimi. Ideal for poke bowls.'),
  ('Kacika',   'Snapper',              'Lutjanus spp.',            'Classic reef snapper with sweet, flaky white flesh.',                                    'Pan-fry whole, steam with ginger and spring onion, or bake in banana leaf.'),
  ('Kawago',   'Rainbow Runner',       'Elagatis bipinnulata',     'Sleek open-water fish with mild, slightly sweet flavour.',                               'Sashimi, ceviche, or grilled fillets with lime.'),
  ('Donu',     'Coral Trout',          'Plectropomus leopardus',   'Prized reef fish with delicate, white, slightly sweet flesh.',                           'Steam whole, pan-fry fillets, or poach gently.'),
  ('Sabutu',   'Mangrove Jack',        'Lutjanus argentimaculatus','Powerful reef predator with firm, sweet white flesh.',                                   'Grill, deep-fry whole, or curry.'),
  ('Urau',     'Lobster',              'Panulirus spp.',           'Warm-water spiny lobster. Closed season applies during spawning.',                        'Grill, poach in butter, or halve and bake with garlic.')
on conflict (name_english) do nothing;

-- ============================================================
-- Seasons (placeholder month windows — verify with village)
-- ============================================================
insert into seasons (fish_species_id, month_start, month_end, notes)
select id, 5, 10, 'Peak: dry season May–October' from fish_species where name_english = 'Spanish Mackerel'
  and not exists (select 1 from seasons where fish_species_id = fish_species.id);

insert into seasons (fish_species_id, month_start, month_end, notes)
select id, 1, 12, 'Year-round' from fish_species where name_english = 'Trevally'
  and not exists (select 1 from seasons where fish_species_id = fish_species.id);

insert into seasons (fish_species_id, month_start, month_end, notes)
select id, 1, 12, 'Year-round' from fish_species where name_english = 'Mackerel Tuna'
  and not exists (select 1 from seasons where fish_species_id = fish_species.id);

insert into seasons (fish_species_id, month_start, month_end, notes)
select id, 1, 12, 'Year-round' from fish_species where name_english = 'Snapper'
  and not exists (select 1 from seasons where fish_species_id = fish_species.id);

insert into seasons (fish_species_id, month_start, month_end, notes)
select id, 1, 12, 'Year-round' from fish_species where name_english = 'Rainbow Runner'
  and not exists (select 1 from seasons where fish_species_id = fish_species.id);

insert into seasons (fish_species_id, month_start, month_end, notes)
select id, 4, 11, 'Best during cooler months' from fish_species where name_english = 'Coral Trout'
  and not exists (select 1 from seasons where fish_species_id = fish_species.id);

insert into seasons (fish_species_id, month_start, month_end, notes)
select id, 1, 12, 'Year-round' from fish_species where name_english = 'Mangrove Jack'
  and not exists (select 1 from seasons where fish_species_id = fish_species.id);

insert into seasons (fish_species_id, month_start, month_end, notes)
select id, 2, 10, 'Closed season Nov–Jan (spawning)' from fish_species where name_english = 'Lobster'
  and not exists (select 1 from seasons where fish_species_id = fish_species.id);

-- ============================================================
-- Delivery zones (Riverina NSW + ACT)
-- Delivery fees and min orders are placeholders — adjust in admin panel.
-- ============================================================
insert into delivery_zones (name, state, delivery_fee_aud_cents, min_order_aud_cents, zone_lat, zone_lng, is_active) values
  ('Wagga Wagga', 'NSW', 2000, 10000, -35.1170, 147.3560, true),
  ('Griffith',    'NSW', 3000, 10000, -34.2880, 146.0520, true),
  ('Leeton',      'NSW', 2500, 10000, -34.5500, 146.4010, true),
  ('Narrandera',  'NSW', 2500, 10000, -34.7450, 146.5480, true),
  ('Canberra',    'ACT', 4000, 15000, -35.2820, 149.1290, true)
on conflict (name) do nothing;

commit;
