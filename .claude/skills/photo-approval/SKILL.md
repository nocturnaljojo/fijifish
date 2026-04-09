---
name: photo-approval
description: Catch photo and delivery proof workflows. Use when building photo upload, approval, or image display.
allowed-tools: Read, Write, Grep
---

# Photo System

## Two types:
1. Catch photos: supplier → admin approval → buyers see "Fish Caught" with real photo
2. Delivery proofs: driver → auto-saved → communal/proxy flagged for admin

## Storage: Supabase Storage
- Bucket catch-photos: {flight_window_id}/{species_id}/{timestamp}.jpg
- Bucket delivery-proofs: {delivery_run_id}/{stop_id}/{timestamp}.jpg

## CRITICAL RULES
1. NEVER store photos as base64 in database. Upload to Storage, store URL.
2. Compress to max 1MB client-side before upload (cousin on 3G).
3. NEVER show unapproved catch photos to buyers.
4. NEVER delete photos. Set status=rejected, keep file.
5. Delivery proof MANDATORY — driver cannot mark "delivered" without photo upload.

## Compression (client-side):
Use OffscreenCanvas: resize to max 1200px wide, JPEG quality 0.8.

## Catch approval flow:
Supplier uploads → catch_photos.status=pending → admin /admin/photos queue
→ admin approves → photo becomes buyer-facing → "Fish Caught" notification sent

## Keep EXIF on delivery proofs (contains GPS for verification).
