---
name: order-window-logic
description: Flight-driven order window business rules. Use when building or modifying order lifecycle, window state transitions, closing time calculations, or any logic involving Fiji Airways timetable and order cutoffs.
allowed-tools: Read, Grep, Glob
---

# Order Window Logic

## Core concept
Orders are governed by Fiji Airways flight windows, not a traditional always-open cart.
The platform calculates order closing times by working backwards from flight departure.

## Flight schedule (Fiji Airways, current)
- Days: Monday, Wednesday, Saturday
- Labasa → Nadi: departs ~8:45am FJT
- Nadi → Canberra: departs ~9:00am FJT (connects same day or next)
- FJT = AEST - 2 hours

## Timeline working backwards
1. Fishermen catch: dawn to 2pm day before flight
2. Cousin inspects + packs: 2pm–5pm
3. Fish at Labasa airport: 5:30pm (cargo cutoff)
4. Orders must close: ~48 hours before cargo cutoff

## Order window states (state machine)
```
UPCOMING → OPEN → CLOSING_SOON → CLOSED → PACKING → SHIPPED → IN_TRANSIT → DELIVERED
```

- UPCOMING: window visible but not yet accepting orders
- OPEN: customers can browse + add to cart + checkout
- CLOSING_SOON: 6 hours before close, show warning banner
- CLOSED: no new orders, cousin receives order summary via WhatsApp/Telegram
- PACKING: cousin confirms availability, adjusts quantities if needed
- SHIPPED: fish on plane, customers notified with ETA
- IN_TRANSIT: picked up at Canberra airport, in freezer truck to Wagga
- DELIVERED: customer receives fish, feedback prompt triggered

## Gotchas
- Time zones matter: FJT vs AEST vs AEDT. Always store in UTC, display in user's zone.
- Flight cancellations: need a manual override to push window state back or cancel
- Cousin confirmation: PACKING state requires explicit confirmation before SHIPPED
- Partial availability: if cousin can only fill 70% of orders, admin must contact affected customers
- Never auto-transition to SHIPPED without cousin confirmation
