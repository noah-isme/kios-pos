"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <aside className="sticky top-16 col-span-2 hidden h-[calc(100vh-4rem)] overflow-auto border-r border-border bg-white p-4 lg:block">
      <nav className="space-y-2">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            isActive("/dashboard")
              ? "bg-primary text-primary-foreground"
              : "hover:bg-off-white"
          }`}
        >
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              isActive("/dashboard")
                ? "bg-primary-foreground text-primary"
                : "bg-off-white text-primary"
            }`}
          >
            <Home className="h-4 w-4" />
          </span>
          <span>Dashboard</span>
        </Link>
      </nav>
    </aside>
  );
}
