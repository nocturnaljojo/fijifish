import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase clients for FijiFish.
 *
 * THREE clients:
 *
 *   createPublicSupabaseClient()
 *     Uses the anon key. Respects RLS. Safe for public server-side reads
 *     (fish species, seasons, villages, impact stories). Use this in all
 *     server components that serve public pages.
 *
 *   createBrowserSupabaseClient()
 *     Same anon key, for client components. Respects RLS.
 *
 *   createServerSupabaseClient()
 *     Uses the service role key — BYPASSES RLS. Reserved exclusively for:
 *     - Webhook handlers (Clerk → Supabase sync)
 *     - Admin API routes that need to bypass RLS
 *     - Server actions that run privileged operations
 *     NEVER call from client components or public page routes.
 *
 * Why the split: SUPABASE_SERVICE_ROLE_KEY is not required on Vercel for
 * public pages. Using it unnecessarily causes silent failures if the env var
 * is not configured, making the fish grid appear empty.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Public reads — anon key, server-safe, respects RLS */
export function createPublicSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set these in Vercel → Settings → Environment Variables.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client components — anon key, browser-safe, respects RLS */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Admin/webhook only — service role key, BYPASSES RLS.
 * NEVER use for public page data fetching.
 */
export function createServerSupabaseClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "createServerSupabaseClient() must only be called on the server.",
    );
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Service role key must be set in Vercel → Settings → Environment Variables " +
        "(non-public, server-only). Only needed for admin/webhook routes.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
