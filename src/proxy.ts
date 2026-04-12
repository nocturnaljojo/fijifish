import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Route protection matrix:
 * /admin/*     → admin only
 * /supplier/*  → supplier + admin
 * /driver/*    → driver + admin
 * /account, /track → any authenticated user
 * /order/success  → public (Stripe redirect target — must NOT be auth-gated)
 * /catch/*     → public (QR code traceability pages)
 * Everything else → public
 */

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isSupplierRoute = createRouteMatcher(["/supplier(.*)"]);
const isDriverRoute = createRouteMatcher(["/driver(.*)"]);
const isAuthRoute = createRouteMatcher(["/account(.*)", "/track(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims, userId } = await auth();

  const role =
    (sessionClaims?.metadata as { role?: string } | undefined)?.role ?? null;

  // Admin-only routes
  if (isAdminRoute(req)) {
    if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));
    if (role !== "admin")
      return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Supplier routes — supplier + admin
  if (isSupplierRoute(req)) {
    if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));
    if (role !== "supplier" && role !== "admin")
      return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Driver routes — driver + admin
  if (isDriverRoute(req)) {
    if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));
    if (role !== "driver" && role !== "admin")
      return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Buyer routes — any authenticated user
  if (isAuthRoute(req)) {
    if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes
    "/(api|trpc)(.*)",
  ],
};
