"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useRole } from "@/lib/roles-client";
import { useCart } from "@/lib/cart";

function CartButton() {
  const { itemCount, openCart } = useCart();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const count = mounted ? itemCount() : 0;

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
      aria-label={`Cart${count > 0 ? ` (${count} item${count !== 1 ? "s" : ""})` : ""}`}
    >
      <ShoppingBag size={18} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-ocean-teal text-bg-primary text-[9px] font-bold font-mono flex items-center justify-center leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

export default function Navbar() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { isAdmin, isSupplier, isLoaded: roleLoaded } = useRole();
  const isLoaded = authLoaded && roleLoaded;

  return (
    <nav className="w-full bg-bg-primary border-b border-white/5 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-end h-10">
        {/* Cart always visible */}
        <CartButton />

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
                  avatarBox: "w-7 h-7 ring-1 ring-white/10 hover:ring-ocean-teal/50 transition-all",
                  userButtonPopoverCard: "bg-[#0d1520] border border-white/10 shadow-2xl",
                  userButtonPopoverActionButton: "text-[#e0e6ed] hover:bg-white/5",
                  userButtonPopoverActionButtonText: "text-[#e0e6ed]",
                  userButtonPopoverActionButtonIcon: "text-[#90a4ae]",
                  userButtonPopoverFooter: "hidden",
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
