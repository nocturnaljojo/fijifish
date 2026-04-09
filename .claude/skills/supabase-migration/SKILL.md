---
name: supabase-migration
description: Write and apply Supabase database migrations safely. Use when creating tables, altering schema, adding RLS policies, or seeding data.
allowed-tools: Read, Write, Bash
---

# Supabase Migration Skill

## Procedure
1. Read existing migrations in supabase/migrations/ to understand current schema
2. Create new migration file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
3. Write SQL with IF NOT EXISTS guards where appropriate
4. Always include RLS policies for customer-facing tables
5. Never delete or modify existing migration files — create new ones

## RLS rules for this project
- customers: users can only read/update their own row
- orders: users can only read their own orders, insert with their own customer_id
- order_items: same as orders (join through order_id → customer_id check)
- fish_species, seasons, flight_windows, delivery_zones: public read, admin write
- inventory_availability: public read, admin write

## Naming conventions
- Tables: snake_case, plural (fish_species, order_items)
- Columns: snake_case
- Foreign keys: referenced_table_id (e.g. fish_species_id, delivery_zone_id)
- Timestamps: created_at, updated_at (with default now())
- All monetary values: integer (AUD cents)

## Gotchas
- Always check if table exists before ALTER
- Supabase AU region — never change project region
- RLS must be enabled AND policies created — enabling without policies blocks all access
- Seed data goes in supabase/seed.sql, not in migrations
