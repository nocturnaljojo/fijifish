---
name: fiji-compliance
description: BICON import permits, export health certificates, cold chain requirements, and food safety compliance. Use when building compliance-related features, documentation pages, or admin checklists.
allowed-tools: Read
disable-model-invocation: true
---

# Fiji Fish Import Compliance

## Australian side (your responsibilities)
- BICON import permit (bicon.agriculture.gov.au) — apply once, covers all species on permit
- Customs clearance at Canberra airport on arrival
- Food safety inspection (random, ~$200-300 when triggered)
- Temperature check on arrival (must be 0-4°C)
- ABN registered, GST if revenue > $75k/year
- Food Business Registration with local council
- Records kept for 3 years minimum

## Fiji side (cousin's responsibilities)
- Fishing licence (local authority, annual)
- Export Health Certificate from Fiji Ministry of Fisheries (per shipment)
- Phytosanitary/Health Certificate (per shipment)
- Fish packed in foam cooler with food-grade gel ice packs
- Quality inspection before packing (gills red, flesh firm, no discolouration)
- Photos of packed fish + EHC sent to you before shipping

## What causes rejection at Australian customs
- No Export Health Certificate
- Temperature above 10°C at arrival
- Fish visibly spoiled
- Species not on BICON permit
- Missing documentation

## App implications
- Admin panel should have a compliance checklist per shipment
- Order summary sent to cousin must include: species list, quantities, EHC reminder
- Status tracking should not auto-advance past SHIPPED without documentation uploaded
- Privacy policy must cover customer data handling (Australian Privacy Act)

## Contacts
- BICON: 1300 200 140
- Fiji Ministry of Fisheries: +679 330 1455
- Fiji Airways Labasa Cargo: +679 672 0411
