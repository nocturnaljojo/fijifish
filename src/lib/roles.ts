import { auth } from "@clerk/nextjs/server";

export type UserRole = "buyer" | "supplier" | "driver" | "admin";

/**
 * Read the role from Clerk session claims (server-side only).
 * Requires the session token to include: { "metadata": "{{user.public_metadata}}" }
 * Set in Clerk Dashboard → Sessions → Customize session token.
 *
 * Defaults to "buyer" if no role is set (public users who signed up
 * without a role assigned by admin).
 */
export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  return (
    (sessionClaims?.metadata as { role?: UserRole } | undefined)?.role ??
    "buyer"
  );
}

/**
 * Returns the village_id from session claims (suppliers only).
 */
export async function getVillageId(): Promise<string | undefined> {
  const { sessionClaims } = await auth();
  return (sessionClaims?.metadata as { village_id?: string } | undefined)
    ?.village_id;
}

/**
 * Throws if the current user's role is not in the allowed list.
 * Use in API route handlers and server actions.
 */
export async function requireRole(allowed: UserRole[]): Promise<UserRole> {
  const role = await getUserRole();
  if (!allowed.includes(role)) {
    throw new Error(`Forbidden: requires one of [${allowed.join(", ")}]`);
  }
  return role;
}

export const isAdmin = async () => (await getUserRole()) === "admin";
export const isSupplier = async () =>
  ["supplier", "admin"].includes(await getUserRole());
export const isDriver = async () =>
  ["driver", "admin"].includes(await getUserRole());
