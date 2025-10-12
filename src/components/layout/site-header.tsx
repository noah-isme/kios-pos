"use client";

import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/cashier", label: "Kasir" },
  { href: "/management/products", label: "Produk" },
  { href: "/reports/daily", label: "Laporan" },
];

export function SiteHeader({ className }: { className?: string }) {
  const { data: session } = useSession();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold">
            Kios POS
          </Link>
          <nav className="hidden gap-1 md:flex">
            {navItems.map((item) => (
              <Button key={item.href} variant="ghost" asChild>
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {session?.user?.name && (
            <span className="hidden text-sm text-muted-foreground md:inline">
              {session.user.name}
            </span>
          )}
          <Button variant="outline" size="icon" className="md:hidden" aria-label="Menu">
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="gap-2"
            onClick={() => {
              // Navigate to the logout page which submits the POST to signout
              window.location.href = '/auth/logout';
            }}
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </div>
    </header>
  );
}
