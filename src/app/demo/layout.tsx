import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kios POS · Demo Publik",
  description: "Demo read-only untuk modul kasir, produk, dan laporan.",
};

const demoNav = [
  { href: "/demo/cashier", label: "Kasir" },
  { href: "/demo/products", label: "Produk" },
  { href: "/demo/reports", label: "Laporan" },
];

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Kios POS · Demo
          </Link>
          <nav className="flex gap-1 text-sm">
            {demoNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/auth/login"
            className="rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
          >
            Masuk untuk Operasional
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <div className="rounded-xl border border-dashed border-purple-200 bg-white/70 p-4 text-sm text-purple-700">
          Mode demo bersifat read-only. Data berasal dari mock untuk menunjukkan alur utama.
        </div>
        {children}
      </main>
    </div>
  );
}
