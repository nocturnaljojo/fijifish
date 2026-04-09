---
name: clerk-auth
description: Clerk authentication and role management. Use when building any auth flow, protected route, role check, or Clerk-Supabase sync. NEVER use Supabase Auth.
allowed-tools: Read, Write, Grep, Glob, Bash
---

# Clerk Auth — FijiFish

## CRITICAL RULES
1. NEVER use Supabase Auth. No supabase.auth.signUp/signIn. ALL auth is Clerk.
2. NEVER hardcode roles in frontend. Always check user.publicMetadata.role from Clerk.
3. NEVER trust client-side role checks alone. Verify server-side in API routes + middleware.
4. Supplier accounts MUST include village_id in metadata to filter portal to their village.

## Roles in Clerk publicMetadata:
- buyer: { role: "buyer" }
- supplier: { role: "supplier", village_id: "galoa-bua" }
- driver: { role: "driver" }
- admin: { role: "admin" }

## Middleware (src/middleware.ts):
- / , /fish, /villages, /about → public
- /order, /account → authenticated (Stripe checkout only if AU)
- /supplier/* → supplier + admin only
- /driver/* → driver + admin only
- /admin/* → admin only

## Clerk → Supabase sync:
- Webhook on user.created → insert users table with clerk_id, role, village_id
- Webhook on user.updated → update matching row
- Verify webhook signature with svix. NEVER skip verification.

## Purchase restriction:
- Stripe checkout only renders if user country_code === "AU"
- Non-AU users: view catalogue, see prices, but no checkout button
- Show "Available in Australia only" with WhatsApp link

## Gotchas:
- Clerk free tier: 10,000 MAU. Sufficient for Phase 1-2.
- Phone OTP works for Fiji +679 numbers. Enable in Clerk Dashboard.
- Custom fields (nationality, zone) collected post-signup, saved to Supabase customers table.
- Theme Clerk components dark using @clerk/themes to match WorldView aesthetic.
