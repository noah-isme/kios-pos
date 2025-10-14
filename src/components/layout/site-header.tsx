"use client";

import React from 'react';
import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { useSession } from "next-auth/react";

import { MotionButton as Button } from "@/components/ui/button";
import MotionList, { MotionItem } from "@/components/ui/motion-list";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/cashier", label: "Kasir" },
  { href: "/management/products", label: "Produk" },
  { href: "/reports/daily", label: "Laporan" },
];

export function SiteHeader({ className }: { className?: string }) {
  const { data: session } = useSession();
  const [time, setTime] = React.useState(() => new Date());
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    // mark client-mounted so we don't render time on the server and cause
    // a mismatch between server and client HTML during hydration
    setMounted(true);
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 border-b border-border bg-white/95 backdrop-blur", className)}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold">
            Kios POS
          </Link>
          <nav className="hidden gap-1 md:flex">
            <MotionList as="div" className="flex gap-1">
              {navItems.map((item) => (
                <MotionItem key={item.href} as="div" className="inline-block">
                  <Button variant="ghost" asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                </MotionItem>
              ))}
            </MotionList>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden flex-col text-right text-xs text-muted-foreground sm:flex">
            <span className="text-sm text-foreground">{session?.user?.name ?? 'Kasir'}</span>
            <span>{mounted ? time.toLocaleTimeString() : "--:--:--"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="pill" size="sm" onClick={() => (window.location.href = '/auth/logout')}>
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
