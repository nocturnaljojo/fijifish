import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase clients for FijiFish.
 *
 * Two clients:
 *   - Browser / client components: createBrowserSupabaseClient() — uses the
 *     public anon key. Honours Row Level Security. Safe in the browser.
 *   - Server components / route handlers / server actions:
 *     createServerSupabaseClient() — uses the service role key, which BYPASSES
 *     all RLS. NEVER call this from a client component. NEVER expose the
 *     service role key to the browser.
 *
 * Phase 0 note: RLS policies are not yet in place (schema created without
 * policies). Once Clerk roles are wired up the server client will only be
 * used for trusted admin / webhook paths; day-to-day reads/writes will go
 * through the browser client under RLS.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill them in.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export function createServerSupabaseClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "createServerSupabaseClient() must only be called on the server. " +
        "It uses the service role key which bypasses RLS.",
    );
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Service role key is server-only — never expose to the browser.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
