import { auth } from "@clerk/nextjs/server";
import { createUserSupabaseClient } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client authenticated with the current Clerk session JWT.
 * RLS policies apply — the logged-in user can only read/write their own data.
 *
 * Uses the "supabase" Clerk JWT template — create in Clerk Dashboard → JWT Templates.
 * Template should include:
 *   { "role": "authenticated", "sub": "{{user.id}}", "metadata": {{user.public_metadata}} }
 *
 * IMPORTANT: Call AFTER confirming userId is non-null (i.e. user is signed in).
 * If the JWT template is not configured, getToken() returns null and this function throws.
 *
 * Use in server components and server actions for buyer / supplier / driver pages.
 * Do NOT use for admin pages or webhooks — those use createServerSupabaseClient() (service role).
 * Do NOT use for the homepage fish grid — that uses createPublicSupabaseClient() (anon, no JWT).
 */
export async function getSupabaseUser(): Promise<SupabaseClient> {
  const { getToken } = await auth();

  // "supabase" is the Clerk JWT template name.
  // Create it in Clerk Dashboard → JWT Templates before deploying to production.
  const token = await getToken({ template: "supabase" });

  if (!token) {
    throw new Error(
      "Clerk JWT token unavailable. " +
        "Create a 'supabase' JWT template in Clerk Dashboard → JWT Templates, " +
        "then add Clerk as an OIDC provider in Supabase Dashboard → Authentication → Third-party Auth.",
    );
  }

  return createUserSupabaseClient(token);
}
