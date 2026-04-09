-- FijiFish — Survey, votes, and customer feedback (v3 spec extension)
-- Phase 1a. Fish interest voting + customer feedback.

begin;

-- ============================================================
-- 1. fish_interest_votes  (which fish do customers want most?)
-- ============================================================
create table if not exists fish_interest_votes (
  id                  uuid primary key default gen_random_uuid(),
  fish_species_id     uuid not null references fish_species(id) on delete cascade,
  voter_clerk_id      text,             -- null = anonymous browser vote
  voter_session_id    text,             -- anonymous session fingerprint from localStorage
  created_at          timestamptz not null default now(),
  -- one vote per logged-in user per species
  constraint unique_vote_clerk   unique (fish_species_id, voter_clerk_id),
  -- one vote per anonymous session per species
  constraint unique_vote_session unique (fish_species_id, voter_session_id)
);

create index if not exists idx_fish_interest_votes_species
  on fish_interest_votes(fish_species_id);

-- ============================================================
-- 2. fish_interest_summary  (aggregated vote counts, fast reads)
-- ============================================================
create or replace view fish_interest_summary as
select
  fs.id              as fish_species_id,
  fs.name_fijian,
  fs.name_english,
  count(fiv.id)      as vote_count
from fish_species fs
left join fish_interest_votes fiv on fiv.fish_species_id = fs.id
group by fs.id, fs.name_fijian, fs.name_english
order by vote_count desc;

-- ============================================================
-- 3. customer_feedback
-- ============================================================
create table if not exists customer_feedback (
  id                  uuid primary key default gen_random_uuid(),
  customer_clerk_id   text,             -- null = anonymous
  feedback_type       text not null check (feedback_type in (
                        'general', 'delivery', 'quality', 'pricing',
                        'species_request', 'website'
                      )),
  message             text not null,
  rating              integer check (rating between 1 and 5),
  is_read             boolean not null default false,
  admin_response      text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_customer_feedback_type
  on customer_feedback(feedback_type);

create index if not exists idx_customer_feedback_unread
  on customer_feedback(is_read) where is_read = false;

commit;
