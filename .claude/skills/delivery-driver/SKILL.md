---
name: delivery-driver
description: Driver delivery portal — route optimisation, photo proof, communal delivery, distance tracking, admin escalation. Use when building any driver feature.
allowed-tools: Read, Write, Grep, Glob, Bash
---

# Delivery Driver System

## CRITICAL RULES
1. NEVER auto-mark delivered without photo. Photo proof mandatory.
2. NEVER skip communal detection. Same address (50m GPS radius) MUST be grouped.
3. NEVER expose other customers' data beyond delivery needs (name, address, phone, items).
4. GPS logging opt-in with clear "Location tracking active" indicator.

## Route optimisation: Nearest-Neighbour with Zone Grouping
1. Start: Canberra Airport (or driver GPS)
2. Group stops by delivery_zone
3. Order zones by highway: Canberra → Yass → Wagga → Junee → Griffith → Leeton
4. Within each zone: nearest-neighbour from previous stop
5. Use Mapbox Directions API for distance/time between stops

## Delivery checklist per stop:
1. Tap "Arrived" → logs GPS + timestamp
2. Hand over fish
3. Tap "Take Photo & Deliver" → camera → photo saved with GPS
4. If communal → show communal flow
5. Stop marked delivered → advance to next

## Communal delivery (2+ customers at same address):
- Detected at run creation: ST_Distance < 50m between stops
- Both stops get is_communal=true, same communal_group_id
- If Customer B present: normal delivery, no escalation
- If Customer B absent, left with Customer A: proxy delivery, admin escalation required
- delivery_proofs.is_proxy_delivery = true, admin_approval_required = true

## Distance tracking:
- GPS logged every 60 seconds during active run
- Total distance calculated from logs on completion (Haversine)
- Cache run data at start for offline use in rural dead zones
- Compress photos to 1MB client-side before upload
- Queue uploads when offline, sync when connected
