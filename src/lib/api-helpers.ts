/**
 * src/lib/api-helpers.ts
 * Reusable patterns for Next.js API route handlers.
 * Every API route MUST use withErrorHandling — no bare try/catch in routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// ── Response helpers ──────────────────────────────────────────────────────────

export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function successResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// ── Auth error ────────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

type UserRole = "buyer" | "supplier" | "driver" | "admin";

export async function requireAuth(): Promise<{ userId: string; role: UserRole }> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new AuthError("Not authenticated", 401);
  const role =
    ((sessionClaims?.metadata as { role?: string })?.role as UserRole) ??
    "buyer";
  return { userId, role };
}

export async function requireAdmin(): Promise<{ userId: string; role: UserRole }> {
  const { userId, role } = await requireAuth();
  if (role !== "admin") throw new AuthError("Forbidden", 403);
  return { userId, role };
}

export async function requireSupplierOrAdmin(): Promise<{ userId: string; role: UserRole }> {
  const { userId, role } = await requireAuth();
  if (role !== "supplier" && role !== "admin") {
    throw new AuthError("Forbidden", 403);
  }
  return { userId, role };
}

// ── withErrorHandling wrapper ─────────────────────────────────────────────────

type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

/**
 * Wraps an API route handler with standard error handling.
 * Catches AuthError (returns 401/403) and all other errors (returns 500).
 *
 * Usage:
 * ```ts
 * export const POST = withErrorHandling(async (req) => {
 *   const { userId } = await requireAuth();
 *   // ...
 *   return successResponse({ ok: true });
 * });
 * ```
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof AuthError) {
        return errorResponse(error.message, error.status);
      }
      console.error("API error:", error);
      return errorResponse("Internal server error", 500);
    }
  };
}
