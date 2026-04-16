---
name: order-window-logic
description: Flight-driven order window business rules. Use when building or modifying order lifecycle, window state transitions, closing time calculations, or any logic involving Fiji Airways timetable and order cutoffs.
allowed-tools: Read, Grep, Glob
---

# Order Window Logic

## Core concept
Orders are governed by Fiji Airways flight windows, not a traditional always-open cart.
The platform calculates order closing times by working backwards from flight departure.

## Flight schedule (current cadence)
- **Frequency:** Weekly — one flight per week, every Thursday
- **Route:** Labasa → Nadi (cargo transfer) → Sydney (Fiji Airways)
- **Sydney → Riverina:** Freezer truck delivery, same day or next day
- **FJT = UTC+12 | AEST = UTC+10 | FJT is 2 hours ahead of AEST**

## Order window cadence (weekly)
| Day | Event |
|-----|-------|
| Friday 8:00am AEST | Order window opens (7 days before Thursday flight) |
| Tuesday 5:00pm AEST | Order window closes — cousins receive summary |
| Wednesday | Cousin packs orders (PACKING state) |
| Thursday | Fish flown out (SHIPPED → IN_TRANSIT) |
| Thursday/Friday | Delivered to Riverina buyers |

**UTC equivalents (AEST = UTC+10):**
- Friday 8:00 AEST = Thursday 22:00 UTC
- Tuesday 17:00 AEST = Tuesday 07:00 UTC

## Timeline working backwards from Thursday flight
1. Fishermen catch: dawn to 2pm Wednesday
2. Cousin inspects + packs: 2pm–5pm Wednesday
3. Fish at Labasa airport: 5:30pm Wednesday (cargo cutoff)
4. Orders close: Tuesday 5pm AEST (~43h before cargo cutoff)
5. Orders open: Friday 8am AEST (6 days before flight)

## Order window states (state machine)
```
UPCOMING → OPEN → CLOSING_SOON → CLOSED → PACKING → SHIPPED → IN_TRANSIT → LANDED → CUSTOMS → DELIVERING → DELIVERED
                                                                                                            ↓
                                                                                                        CANCELLED (any admin state)
```

- **UPCOMING:** window visible but not yet accepting orders (before Friday 8am)
- **OPEN:** customers can browse + add to cart + checkout
- **CLOSING_SOON:** 6 hours before close (≤ Tuesday 11am AEST), show urgency banner
- **CLOSED:** no new orders; cousin receives order summary via WhatsApp/Telegram
- **PACKING:** cousin confirms availability, adjusts quantities if needed
- **SHIPPED:** fish on plane, customers notified with ETA
- **IN_TRANSIT:** picked up at Sydney airport, in freezer truck to Riverina
- **LANDED:** flight touched down
- **CUSTOMS:** BICON biosecurity inspection
- **DELIVERING:** out for delivery today
- **DELIVERED:** customer receives fish; feedback prompt triggered
- **CANCELLED:** admin manually cancelled window

## Fresh window concept
`isFreshWindow` = window status is `open` AND `order_open_at` was less than 24 hours ago.

Mutually exclusive with `closing_soon` — a window cannot be both fresh and closing.

Used to show a "new order window just opened" banner variant so customers understand they're
ordering for THIS week's Thursday delivery, not the previous shipment that already left.

## Shipment date labels
Derived from `flight_date` in the shoppable window — NEVER hardcoded:
- `shipmentDateLabel`: long form — "Thursday 24 April" (used in cart, checkout, order success)
- `shipmentDateShort`: short form — "Thu 24 Apr" (used in fish card CTAs)

Both are `null` when no shoppable window exists.

## Gotchas
- Time zones matter: FJT vs AEST vs AEDT. Always store in UTC, display in user's zone.
  - AEST (UTC+10) applies May–October; AEDT (UTC+11) applies November–April
  - DST ends first Sunday in April; begins first Sunday in October
- Flight cancellations: need a manual override to push window state back or cancel
- Cousin confirmation: PACKING state requires explicit confirmation before SHIPPED
- Partial availability: if cousin can only fill 70% of orders, admin must contact affected customers
- Never auto-transition to SHIPPED without cousin confirmation
- isFreshWindow and isClosingSoon are mutually exclusive by design
