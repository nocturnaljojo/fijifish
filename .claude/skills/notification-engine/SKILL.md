---
name: notification-engine
description: SMS, WhatsApp, email notifications via Twilio + broadcast messaging. Use when building any notification or broadcast feature.
allowed-tools: Read, Write, Grep
---

# Notification Engine

## CRITICAL RULES
1. NEVER send without checking customer's preferred_notification_channel.
2. NEVER hardcode phone numbers or templates in components. Central sendNotification() function.
3. NEVER send bulk synchronously. Batch in groups of 50 with 1s delay.
4. NEVER send broadcast without "Reply STOP to unsubscribe" (Spam Act 2003).
5. NEVER send broadcast to opted-out customers (broadcast_opt_out=true).

## Event triggers (12):
window_open, order_confirmed, window_closing, window_closed, fish_caught, packed,
at_airport, on_plane, landed, customs_cleared, out_for_delivery, delivered

## Templates (short, warm, Pacific-friendly):
- fish_caught: "🎣 Your {species} was caught fresh today in {village}, Fiji! {photo_link}"
- on_plane: "🛫 Your fish is on flight {flight}! Track: {link}"
- delivered: "🎉 Delivered! Vinaka! Rate: {link}"

## Broadcast system (admin):
- Audience segments: all, by state, by zone, ordered_this_month, inactive_30d, never_ordered
- Channels: SMS / WhatsApp / Both
- Confirmation before send: "Send 84 messages? Cost: ~A$6.72"
- Rate limit: max 1 broadcast/day
- Log all broadcasts + per-recipient delivery status

## Spam Act 2003 compliance:
- Sender ID: "FijiFish"
- Opt-out: "Reply STOP to unsubscribe" on every broadcast
- Process STOP automatically → customer.broadcast_opt_out = true
- Consent at signup: checkbox "I'd like to receive updates"
- Retain consent records (timestamp)

## Costs: SMS ~A$0.06/msg, WhatsApp free under 1000/month.
