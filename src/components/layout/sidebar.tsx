"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export default function Sidebar() {
  // Sidebar now links to the central Dashboard page. All primary menus
  // (Kasir, Produk, Laporan, etc.) are moved to /dashboard.
  return (
    <aside className="sticky top-16 col-span-2 hidden h-[calc(100vh-4rem)] overflow-auto border-r border-border bg-white p-4 md:block">
      <nav className="space-y-2">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-off-white">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-off-white text-primary">
            <Home className="h-4 w-4" />
          </span>
          <span>Dashboard</span>
        </Link>
      </nav>
    </aside>
  );
}
