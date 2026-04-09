---
name: seasonal-filter
description: Seasonal fish availability logic. Use when building the homepage fish display, search filters, or any query that shows available fish.
allowed-tools: Read, Grep
---

# Seasonal Filter

## How it works
Fish are only shown to customers if they are currently in season.
Season is determined by month-range in the seasons table.

## Query pattern
```sql
SELECT fs.* FROM fish_species fs
JOIN seasons s ON s.fish_species_id = fs.id
WHERE fs.is_active = true
  AND (
    (s.month_start <= s.month_end AND EXTRACT(MONTH FROM NOW()) BETWEEN s.month_start AND s.month_end)
    OR
    (s.month_start > s.month_end AND (EXTRACT(MONTH FROM NOW()) >= s.month_start OR EXTRACT(MONTH FROM NOW()) <= s.month_end))
  )
```

The second condition handles wrap-around seasons (e.g. Nov-Feb where month_start=11, month_end=2).

## Display rules
- In-season fish: shown with photo, name, price, capacity bar, "Add to order" button
- Out-of-season fish: NOT shown at all (not greyed out — hidden entirely)
- If no fish in season: show message "No fish available this season. Check back soon."
- Admin can override: is_active flag on fish_species table

## Gotchas
- Month wrap-around (Nov-Feb) requires OR logic, not simple BETWEEN
- Some fish may have multiple season entries (e.g. two separate good periods in a year)
- Season is for display only — inventory_availability is the source of truth for actual ordering
- A fish can be in season but have zero capacity for the current flight window (show "Sold Out" not hidden)
