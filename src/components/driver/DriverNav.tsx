"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, Package, Clock } from "lucide-react";

const TABS = [
  { href: "/driver", label: "Today's Run", icon: Truck, exact: true },
  { href: "/driver/deliver", label: "Deliveries", icon: Package, exact: false },
  { href: "/driver/history", label: "History", icon: Clock, exact: false },
];

export default function DriverNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary border-t border-white/10 pb-safe">
      <div className="flex">
        {TABS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 transition-colors ${
                isActive
                  ? "text-ocean-teal"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-mono tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
