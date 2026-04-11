"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/windows", label: "Flight Windows", icon: "✈️" },
  { href: "/admin/pricing", label: "Fish & Pricing", icon: "🐟" },
  { href: "/admin/photos", label: "Catch Photos", icon: "📷" },
  { href: "/admin/stories", label: "Impact Stories", icon: "🌿" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/broadcasts", label: "Broadcasts", icon: "📣" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
] as const;

function NavLink({
  href,
  label,
  icon,
  exact,
  onClick,
}: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-ocean-teal/10 text-ocean-teal border border-ocean-teal/20"
          : "text-text-secondary hover:text-text-primary hover:bg-white/5"
      }`}
    >
      <span className="text-base w-5 shrink-0 text-center" aria-hidden="true">{icon}</span>
      {label}
    </Link>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-secondary">
        <span className="font-mono text-sm font-bold text-ocean-teal tracking-widest uppercase">
          Admin
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
          aria-label="Toggle navigation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            {mobileOpen ? (
              <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            ) : (
              <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border-default bg-bg-secondary px-3 py-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-bg-secondary border-r border-border-default min-h-screen">
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-border-default">
          <Link href="/" className="flex flex-col gap-0.5 group">
            <span className="font-mono text-xs text-text-secondary group-hover:text-ocean-teal transition-colors tracking-widest uppercase">
              FijiFish
            </span>
            <span className="font-bold text-text-primary text-base leading-none">
              Admin Panel
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border-default">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-text-secondary hover:text-ocean-teal transition-colors font-mono"
          >
            <span aria-hidden="true">←</span>
            Back to site
          </Link>
        </div>
      </aside>
    </>
  );
}
