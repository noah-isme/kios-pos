import Link from "next/link";
import { ArrowRight, BarChart3, Layers, ReceiptText, Settings2 } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { MotionButton as Button } from "@/components/ui/button";
import MotionList, { MotionItem } from "@/components/ui/motion-list";
import { cardVariant, containerCards } from "@/components/ui/motion-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ensureAuthenticatedOrRedirect } from "@/server/auth";
import { db } from "@/server/db";
import { getDailySalesSummary } from '@/server/api/server-helpers';
import DashboardWidgets from '@/components/dashboard/widgets';

const quickActions = [
  { title: "Kasir", description: "Buka kasir untuk transaksi", href: "/cashier", icon: <ReceiptText className="h-5 w-5" />, accent: 'amber' },
  { title: "Produk", description: "Kelola produk dan stok", href: "/management/products", icon: <Layers className="h-5 w-5" />, accent: 'sky' },
  { title: "Laporan", description: "Laporan harian & ringkasan", href: "/reports/daily", icon: <BarChart3 className="h-5 w-5" />, accent: 'emerald' },
  { title: "Pengaturan", description: "Konfigurasi toko dan pengguna", href: "/management/settings", icon: <Settings2 className="h-5 w-5" />, accent: 'slate' },
];

const ACCENT_CLASSES: Record<string, { icon: string; gradient: string }> = {
  amber: { icon: 'bg-accent-amber-100 text-accent-amber-700', gradient: 'from-accent-amber-50 via-accent-amber-100 to-accent-amber-200' },
  sky: { icon: 'bg-accent-sky-100 text-accent-sky-700', gradient: 'from-accent-sky-50 via-accent-sky-100 to-accent-sky-200' },
  emerald: { icon: 'bg-accent-emerald-100 text-accent-emerald-700', gradient: 'from-accent-emerald-50 via-accent-emerald-100 to-accent-emerald-200' },
  slate: { icon: 'bg-accent-slate-100 text-accent-slate-700', gradient: 'from-accent-slate-50 via-accent-slate-100 to-accent-slate-200' },
};

function SummaryCard({ title, value, icon }: { title: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5 w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2 bg-off-white text-primary">{icon}</div>
            <div>
              <CardTitle className="text-sm">{title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">{value}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

async function getTodaySalesCount() {
  const summary = await getDailySalesSummary();
  return summary.sales.length ?? 0;
}

export default async function DashboardPage() {
  const session = await ensureAuthenticatedOrRedirect();

  const userName = session?.user?.name ?? session?.user?.email ?? 'Pengguna';
  const todayCount = await getTodaySalesCount();
  const role = session?.user?.role ?? 'CASHIER';

  return (
    <div className="flex flex-col gap-8">
      <header className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Badge variant="secondary" className="w-fit uppercase tracking-wide">Dashboard</Badge>
        <h1 className="mt-3 text-2xl font-semibold">Selamat datang, {userName}</h1>
        <p className="text-muted-foreground">Pusat navigasi untuk semua menu utama aplikasi.</p>
        <div className="mt-4 flex gap-3">
          <Button asChild>
            <Link href="/cashier" className="gap-2">
              Mulai Transaksi
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section>
        <MotionList variants={containerCards} className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <MotionItem variants={cardVariant} className="flex justify-center px-2">
            <SummaryCard title="Penjualan Hari Ini" value={`${todayCount} transaksi`} icon={<ReceiptText className="h-5 w-5" />} />
          </MotionItem>
          {quickActions
            .filter((a) => {
              if ((a.href?.startsWith('/management') || a.href?.startsWith('/reports')) && !['ADMIN', 'OWNER'].includes(role)) return false;
              return true;
            })
            .map((a) => (
              <MotionItem key={a.href} variants={cardVariant} className="flex justify-center px-2">
                <Link href={a.href} className="w-full">
                  <Card className="p-4 sm:p-5 w-full hover:shadow-lg transition">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="rounded-md p-2 bg-off-white text-primary">{a.icon}</div>
                        <div>
                          <CardTitle>{a.title}</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">{a.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 flex justify-end">
                      <span className="inline-flex items-center gap-2 text-sm">Lihat <ArrowRight className="h-4 w-4" /></span>
                    </CardContent>
                  </Card>
                </Link>
              </MotionItem>
            ))}
        </MotionList>

        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardWidgets days={7} />
        </section>
      </section>
    </div>
  );
}

// (auth helper moved to server/auth.ensureAuthenticatedOrRedirect)
