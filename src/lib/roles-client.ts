"use client";

import { useUser } from "@clerk/nextjs";
import type { UserRole } from "./roles";

/**
 * Client-side role hook — reads from Clerk publicMetadata.
 * Always pair with server-side role checks for protected actions.
 *
 * NOTE: publicMetadata is set by admin via Clerk Dashboard or webhook.
 * New sign-ups default to role="buyer" (metadata not set).
 */
export function useRole() {
  const { user, isLoaded } = useUser();

  const role: UserRole =
    ((user?.publicMetadata?.role as string | undefined) as UserRole) ?? "buyer";

  const villageId = user?.publicMetadata?.village_id as string | undefined;

  return {
    role,
    villageId,
    isLoaded,
    isAdmin: role === "admin",
    isSupplier: role === "supplier" || role === "admin",
    isDriver: role === "driver" || role === "admin",
    isBuyer: role === "buyer",
  };
}
