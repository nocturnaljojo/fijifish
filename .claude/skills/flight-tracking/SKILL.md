---
name: flight-tracking
description: FlightRadar24 embed for shipment tracking. Use when building tracking page flight display.
allowed-tools: Read, Write, Grep
---

# Flight Tracking

## Phase 1: FlightRadar24 embed (free, no API key)

Embed URL: https://www.flightradar24.com/simple_index.php?flight={flight_number}

Admin enters flight number per window (e.g. FJ391). Tracking page shows iframe
when status = "on_plane". Before departure: show countdown. After landing: show checkmark.

## CRITICAL RULES
1. NEVER assume same flight number every day. Admin enters per window.
2. NEVER auto-update shipment status from flight data Phase 1. Manual status is source of truth.
3. Always show fallback link (iframe may be blocked by ad blockers).
4. Fiji Airways domestic (Labasa→Nadi) may not show on FR24 — only international leg tracked.

## Phase 2: FlightAware API (~USD $50/month) for automated departed/landed triggers.
