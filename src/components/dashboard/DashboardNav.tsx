"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardNavProps {
  fullName: string | null;
  email: string | null;
}

const NAV_ITEMS = [
  { href: "/dashboard",         label: "My Orders",   icon: "📦", exact: true },
  { href: "/dashboard/account", label: "Account",     icon: "👤" },
  { href: "/dashboard/billing", label: "Billing",     icon: "💳" },
] as const;

function NavLink({
  href,
  label,
  icon,
  exact,
}: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-ocean-teal/10 text-ocean-teal border border-ocean-teal/20"
          : "text-text-secondary hover:text-text-primary hover:bg-white/5"
      }`}
    >
      <span className="text-base w-5 shrink-0 text-center" aria-hidden="true">
        {icon}
      </span>
      {label}
    </Link>
  );
}

// ── Mobile bottom tabs ────────────────────────────────────────────────────────

function MobileTab({
  href,
  label,
  icon,
  exact,
}: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 flex-1 py-2.5 text-[10px] font-mono transition-colors ${
        isActive ? "text-ocean-teal" : "text-text-secondary"
      }`}
    >
      <span className="text-xl leading-none" aria-hidden="true">
        {icon}
      </span>
      {label}
      {isActive && (
        <span className="w-1 h-1 rounded-full bg-ocean-teal" aria-hidden="true" />
      )}
    </Link>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DashboardNav({ fullName, email }: DashboardNavProps) {
  const initials = (fullName ?? email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-52 shrink-0 border-r min-h-screen"
        style={{ background: "rgba(13,21,32,0.95)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        {/* User avatar */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <span className="font-mono text-[10px] text-text-secondary group-hover:text-ocean-teal transition-colors tracking-widest uppercase">
              ← Back to shop
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-ocean-teal/15 border border-ocean-teal/25 flex items-center justify-center shrink-0">
              <span className="font-mono font-bold text-ocean-teal text-xs">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {fullName ?? "My Account"}
              </p>
              {email && (
                <p className="text-[10px] font-mono text-text-secondary truncate">{email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav
          className="flex-1 px-3 py-4 flex flex-col gap-1"
          aria-label="Dashboard navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </aside>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 flex border-t"
        style={{
          background: "rgba(10,15,26,0.97)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
        aria-label="Dashboard navigation"
      >
        {NAV_ITEMS.map((item) => (
          <MobileTab key={item.href} {...item} />
        ))}
      </nav>
    </>
  );
}
