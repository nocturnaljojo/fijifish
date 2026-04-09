-- FijiFish — Impact stories
-- Phase 1a. Village impact stories shown on homepage and /impact page.

begin;

create table if not exists impact_stories (
  id           uuid primary key default gen_random_uuid(),
  village_id   uuid not null references villages(id) on delete cascade,
  title        text not null,
  body         text not null,
  photo_url    text,
  published_at timestamptz,
  is_published boolean not null default false,
  created_by   text,                        -- clerk user id of admin who created it
  created_at   timestamptz not null default now()
);

create index if not exists idx_impact_stories_village
  on impact_stories(village_id);

create index if not exists idx_impact_stories_published
  on impact_stories(is_published, published_at desc);

-- RLS
alter table impact_stories enable row level security;

-- Public can read published stories
create policy "impact_stories_public_read"
  on impact_stories
  for select
  using (is_published = true);

-- Seed: 3 published stories for Galoa village
-- We resolve village_id by name since we don't have a hardcoded UUID here.
do $$
declare
  v_village_id uuid;
begin
  select id into v_village_id from villages where name = 'Galoa' limit 1;

  if v_village_id is null then
    raise notice 'Galoa village not found — skipping impact story seed';
    return;
  end if;

  insert into impact_stories (village_id, title, body, published_at, is_published, created_by)
  values
    (
      v_village_id,
      'New Ice Machine Keeps Catch Fresher for Longer',
      'Revenue from FijiFish orders funded a commercial ice machine for Galoa Village. Before it arrived, fishermen had to sell or consume their catch within hours of landing it. Now fish can be kept for up to 48 hours at optimal temperature, dramatically reducing waste and giving the village more flexibility to batch orders. The machine was installed in June 2025 and has already paid for itself.',
      '2025-09-01 00:00:00+00',
      true,
      'system'
    ),
    (
      v_village_id,
      'School Supplies for 42 Children in Galoa',
      'A share of proceeds from the 2025 winter season funded a full set of school supplies — exercise books, pens, rulers, and backpacks — for every child in Galoa Village attending primary school. Parents reported this was the first time their children started the school year with new materials. The village council allocated funds in August after the season wrapped.',
      '2025-10-15 00:00:00+00',
      true,
      'system'
    ),
    (
      v_village_id,
      'Outboard Engine Repairs Mean More Fishing Days',
      'Two of the village''s three fishing boats were running on ageing 15hp outboard engines that broke down frequently. FijiFish revenue covered the overhaul of both engines and the purchase of a spare parts kit. The boats now spend less time in dry dock and the fleet can operate on more days per month, increasing sustainable yield and village income.',
      '2026-01-20 00:00:00+00',
      true,
      'system'
    );

  raise notice 'Seeded 3 impact stories for Galoa village (id: %)', v_village_id;
end;
$$;

commit;
