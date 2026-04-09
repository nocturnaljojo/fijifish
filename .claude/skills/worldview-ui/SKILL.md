---
name: worldview-ui
description: WorldView HUD design system. Use when building ANY UI component or page. Defines colours, typography, spacing, component patterns. NEVER use generic white dashboards.
allowed-tools: Read, Write, Grep
---

# WorldView HUD Design System

## CRITICAL RULES
1. NEVER white/light background for admin, driver, buyer, or tracking. Dark theme mandatory.
2. NEVER default Tailwind blue (#3b82f6). Use palette below.
3. NEVER Inter/Arial/Roboto. Use IBM Plex Mono for data, Plus Jakarta Sans for body.
4. Supplier portal is the ONE EXCEPTION — light theme for Fiji outdoor phone readability.

## Colours (CSS vars):
--bg-primary: #0a0f1a (deep navy)
--bg-secondary: #0d1520 (cards)
--bg-tertiary: #111a2e (elevated)
--ocean-teal: #4fc3f7 (primary accent, CTAs, links)
--reef-coral: #ff7043 (alerts, urgent)
--sunset-gold: #ffab40 (prices, highlights, important numbers)
--lagoon-green: #66bb6a (success, delivered)
--deep-purple: #ce93d8 (secondary info)
--text-primary: #e0e6ed
--text-secondary: #90a4ae
--border-default: #1e2a3a

## Typography:
- IBM Plex Mono: data, numbers, timestamps, countdown timers, capacity numbers
- Plus Jakarta Sans: body, headings, descriptions, buttons

## Key patterns:
- Map is ALWAYS the hero (50-70% viewport). Data overlays on map, not sidebar.
- Capacity bar: teal fill, amber <20%, red at sold out
- Countdown timer: monospace, subtle pulse in last 6 hours
- Cards: bg-secondary, border-default, no shadows (use border contrast on dark)
- Status badges: semi-transparent pill (bg-color/10 text-color border-color/20)
- Loading: skeleton screens with bg-tertiary animate-pulse, never spinners
- Mobile: bottom tab bar (4 tabs max), 44px min tap targets, 16px min body text

## Mapbox dark tiles: mapbox://styles/mapbox/dark-v11
