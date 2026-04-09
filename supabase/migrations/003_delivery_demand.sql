-- FijiFish — Delivery demand polling
-- Phase 1a. Captures where logged-in users want delivery.

begin;

create table if not exists delivery_demand_votes (
  id                uuid primary key default gen_random_uuid(),
  voter_clerk_id    text not null,
  postcode          text not null,
  suburb            text not null,
  state             text not null,
  fish_species_id   uuid references fish_species(id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint unique_demand_vote unique (voter_clerk_id, postcode, fish_species_id)
);

create or replace view delivery_demand_summary as
select
  postcode,
  suburb,
  state,
  count(distinct voter_clerk_id) as unique_voters,
  count(*)                       as total_votes
from delivery_demand_votes
group by postcode, suburb, state
order by unique_voters desc;

create index if not exists idx_delivery_demand_postcode
  on delivery_demand_votes(postcode);

create index if not exists idx_delivery_demand_state
  on delivery_demand_votes(state);

commit;
