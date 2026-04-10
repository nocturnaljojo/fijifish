"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useRole } from "@/lib/roles-client";

export default function Navbar() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { isAdmin, isSupplier, isLoaded: roleLoaded } = useRole();
  const isLoaded = authLoaded && roleLoaded;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] pointer-events-none">
      {/* Sits above the sticky DeliveryBanner (z-50).
          pointer-events-none on the full bar so it doesn't block clicks,
          pointer-events-auto only on the user button area. */}
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-end h-12 pointer-events-auto">
        {!isLoaded ? null : !isSignedIn ? (
          /* Signed out — show sign-in / sign-up links */
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-ocean-teal text-bg-primary hover:opacity-90 transition-opacity"
            >
              Sign up
            </Link>
          </div>
        ) : (
          /* Signed in — portal links + UserButton */
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-[10px] font-mono uppercase tracking-wider text-sunset-gold hover:text-[#ffd54f] transition-colors px-2 py-1 rounded border border-sunset-gold/20 hover:border-sunset-gold/40"
              >
                Admin
              </Link>
            )}
            {isSupplier && !isAdmin && (
              <Link
                href="/supplier"
                className="text-[10px] font-mono uppercase tracking-wider text-lagoon-green hover:text-[#a5d6a7] transition-colors px-2 py-1 rounded border border-lagoon-green/20 hover:border-lagoon-green/40"
              >
                Supplier Portal
              </Link>
            )}

            <UserButton
              appearance={{
                elements: {
                  avatarBox:
                    "w-8 h-8 ring-1 ring-white/10 hover:ring-ocean-teal/50 transition-all",
                },
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="My Account"
                  labelIcon={<span>👤</span>}
                  href="/account"
                />
                <UserButton.Link
                  label="Order History"
                  labelIcon={<span>📦</span>}
                  href="/account/orders"
                />
                {isAdmin && (
                  <UserButton.Link
                    label="Admin Panel"
                    labelIcon={<span>⚙️</span>}
                    href="/admin"
                  />
                )}
                {isSupplier && (
                  <UserButton.Link
                    label="Supplier Portal"
                    labelIcon={<span>🐟</span>}
                    href="/supplier"
                  />
                )}
                <UserButton.Action label="manageAccount" />
              </UserButton.MenuItems>
            </UserButton>
          </div>
        )}
      </div>
    </nav>
  );
}
