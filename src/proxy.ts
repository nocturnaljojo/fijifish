import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Phase 0 proxy (formerly "middleware" — renamed in Next.js 16).
 * Basic auth only, no role checks yet.
 * Protected routes: /order, /account (and subpaths).
 * Everything else is public.
 *
 * Role-based protection (/supplier/*, /driver/*, /admin/*) will be added
 * when Clerk publicMetadata roles are wired up in a later step.
 */
const isProtectedRoute = createRouteMatcher(["/order(.*)", "/account(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes
    "/(api|trpc)(.*)",
  ],
};
