-- Migration 016: Seed next 4 weekly Thursday flight windows
-- Generated: 2026-04-16
--
-- Cadence: weekly Thursday delivery
--   Order window opens: Friday 8:00am AEST (Thursday 22:00 UTC)
--   Order window closes: Tuesday 5:00pm AEST (Tuesday 07:00 UTC)
--   Flight departs: Thursday (Labasa → Nadi → Sydney, FJ911)
--
-- NOTE: These timestamps assume AEST (UTC+10), valid from April to October.
-- When AEDT (UTC+11) applies (Nov–Apr), subtract 1 extra hour from UTC values.
--
-- Window 1: Thursday 17 April 2026
--   opens  Fri 11 Apr 22:00 UTC  (Sat 12 Apr 8:00am AEST)
--   closes Tue 15 Apr 07:00 UTC  (Tue 15 Apr 5:00pm AEST)
--
-- Window 2: Thursday 24 April 2026
--   opens  Fri 18 Apr 22:00 UTC  (Sat 19 Apr 8:00am AEST) -- note: this is already in the past
--   Actually: opens Fri Apr 18 22:00 UTC
--   closes Tue 22 Apr 07:00 UTC
--
-- Window 3: Thursday 1 May 2026
--   opens  Fri 25 Apr 22:00 UTC
--   closes Tue 29 Apr 07:00 UTC
--
-- Window 4: Thursday 8 May 2026
--   opens  Fri 2 May 22:00 UTC
--   closes Tue 6 May 07:00 UTC

insert into flight_windows (
  flight_date,
  flight_number,
  order_open_at,
  order_close_at,
  status,
  notes
) values
  (
    '2026-04-17',
    'FJ911',
    '2026-04-10T22:00:00+00:00',
    '2026-04-15T07:00:00+00:00',
    'upcoming',
    'Weekly Thursday flight — Bua Province Walu'
  ),
  (
    '2026-04-24',
    'FJ911',
    '2026-04-17T22:00:00+00:00',
    '2026-04-22T07:00:00+00:00',
    'upcoming',
    'Weekly Thursday flight — Bua Province Walu'
  ),
  (
    '2026-05-01',
    'FJ911',
    '2026-04-24T22:00:00+00:00',
    '2026-04-29T07:00:00+00:00',
    'upcoming',
    'Weekly Thursday flight — Bua Province Walu'
  ),
  (
    '2026-05-08',
    'FJ911',
    '2026-05-01T22:00:00+00:00',
    '2026-05-06T07:00:00+00:00',
    'upcoming',
    'Weekly Thursday flight — Bua Province Walu'
  )
on conflict do nothing;
