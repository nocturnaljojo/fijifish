"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Clock, Truck } from "lucide-react";

const TABS = [
  { href: "/supplier", label: "Dashboard", icon: Home, exact: true },
  { href: "/supplier/photos", label: "Photos", icon: Camera, exact: false },
  { href: "/supplier/tracking", label: "Tracking", icon: Truck, exact: false },
  { href: "/supplier/history", label: "History", icon: Clock, exact: false },
];

export default function SupplierNav() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex safe-area-pb">
      {TABS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 min-h-[56px] transition-colors ${
              active ? "text-cyan-600" : "text-gray-400"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.75} aria-hidden="true" />
            <span className={`text-[10px] font-medium leading-none ${active ? "text-cyan-600" : "text-gray-400"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
