"use client";

import React from 'react';
import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { MotionButton as Button } from "@/components/ui/button";
import MotionList, { MotionItem } from "@/components/ui/motion-list";
import { cn } from "@/lib/utils";
import { useActiveOutlet } from "@/hooks/use-active-outlet";

const navItems = [
  { href: "/cashier", label: "Kasir" },
  { href: "/management/products", label: "Produk" },
  { href: "/reports/daily", label: "Laporan" },
];

export function SiteHeader({ className }: { className?: string }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { activeOutlet } = useActiveOutlet();
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

  React.useEffect(() => {
    router.prefetch("/cashier");
    router.prefetch("/management/products");
    router.prefetch("/reports/daily");
    router.prefetch("/demo/cashier");
  }, [router]);

  const isAuthenticated = status === "authenticated";
  const initials = React.useMemo(() => {
    const name = session?.user?.name;
    if (name) {
      const letters = name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join("");
      if (letters) {
        return letters.slice(0, 2);
      }
    }
    const email = session?.user?.email;
    if (email && email.length > 0) {
      return email[0]?.toUpperCase() ?? "KP";
    }
    return "KP";
  }, [session?.user?.name, session?.user?.email]);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 border-b border-border bg-white/95 backdrop-blur", className)}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold">
            Kios POS
          </Link>
          {isAuthenticated ? (
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
          ) : null}
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end text-xs text-muted-foreground sm:flex">
              <span className="text-sm font-medium text-foreground">
                {session?.user?.name ?? session?.user?.email ?? "Kasir"}
              </span>
              <span>{activeOutlet?.name ?? "Outlet belum dipilih"}</span>
            </div>
            <div className="hidden flex-col text-right text-xs text-muted-foreground md:flex">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Jam kasir
              </span>
              <span className="text-sm text-foreground">
                {mounted ? time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--"}
              </span>
            </div>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-foreground sm:flex">
              {initials}
            </div>
            <Button
              variant="pill"
              size="sm"
              onClick={() => {
                void signOut({ callbackUrl: "/auth/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
              asChild
            >
              <Link href="/demo/cashier">Coba Demo</Link>
            </Button>
            <Button
              variant="pill"
              size="sm"
              onClick={() => router.push("/auth/login")}
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
