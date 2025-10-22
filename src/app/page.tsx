import {
  ArrowRight,
  BarChart3,
  Clock3,
  Layers,
  QrCode,
  ReceiptText,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

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

const ACCENT_CLASSES: Record<string, { icon: string; gradient: string }> = {
  amber: {
    icon: 'bg-accent-amber-100 text-accent-amber-700',
    gradient: 'from-accent-amber-50 via-accent-amber-100 to-accent-amber-200',
  },
  sky: {
    icon: 'bg-accent-sky-100 text-accent-sky-700',
    gradient: 'from-accent-sky-50 via-accent-sky-100 to-accent-sky-200',
  },
  emerald: {
    icon: 'bg-accent-emerald-100 text-accent-emerald-700',
    gradient: 'from-accent-emerald-50 via-accent-emerald-100 to-accent-emerald-200',
  },
};

const quickActions = [
  {
    title: "Buka Kasir",
    description: "Mulai transaksi, scan barcode, terapkan diskon, dan cetak struk PDF.",
    href: "/cashier",
    icon: <ReceiptText className="h-5 w-5" />,
    accent: 'amber',
  },
  {
    title: "Kelola Produk",
    description: "Tambah SKU, atur kategori, dan sinkronkan stok antar outlet.",
    href: "/management/products",
    icon: <Layers className="h-5 w-5" />,
    accent: 'sky',
  },
  {
    title: "Laporan Harian",
    description: "Pantau total penjualan, item terjual, dan saldo kas harian.",
    href: "/reports/daily",
    icon: <BarChart3 className="h-5 w-5" />,
    accent: 'emerald',
  },
];

const heroHighlights = [
  {
    title: "Kasir Realtime",
    description:
      "Monitor shift, penjualan, dan status pembayaran tanpa berpindah tab.",
  },
  {
    title: "Stok Sinkron",
    description: "Data produk dan stok antar outlet selalu mutakhir berkat Supabase.",
  },
  {
    title: "Laporan Siap Pakai",
    description: "PDF dan dashboard harian mendukung owner, admin, dan kasir.",
  },
];

const snapshotHighlights = [
  {
    title: "Shift & Kas",
    description:
      "Buka/tutup shift dengan pencatatan kas awal-akhir dan ringkasan selisih otomatis.",
    icon: Clock3,
  },
  {
    title: "Pembayaran QRIS",
    description: "Simulasi QRIS siap pakai sembari menunggu integrasi gateway resmi.",
    icon: QrCode,
  },
  {
    title: "Keamanan Data",
    description: "Role-based access, audit event penting, dan backup Supabase.",
    icon: ShieldCheck,
  },
  {
    title: "Analitik Harian",
    description: "Grafik penjualan, item terlaris, dan performa outlet setiap shift.",
    icon: BarChart3,
  },
];

export default function Home() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-8 md:p-10 lg:col-span-8">
          <div
            aria-hidden
            className="absolute -right-24 top-1/2 hidden h-64 w-64 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl lg:block"
          />
          <div className="relative z-10 flex flex-col gap-6">
            <Badge variant="secondary" className="w-fit uppercase tracking-wide">
              POS Retail Modern
            </Badge>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Sistem POS end-to-end untuk operasional toko yang gesit.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Ditenagai Next.js App Router, tRPC, Prisma, dan Supabase untuk memastikan alur kasir cepat, stok terkendali, dan laporan kas akurat setiap hari.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/cashier" className="gap-2">
                  Mulai Transaksi
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/demo/cashier">Coba Demo Tanpa Login</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/docs/implementation">Baca Panduan Implementasi</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/docs/persiapan-awal">Checklist Persiapan Awal</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {heroHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-primary/20 bg-white/80 p-4 text-sm shadow-sm backdrop-blur dark:bg-background/80"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {item.title}
                  </p>
                  <p className="mt-2 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Card className="h-full border border-border/70 shadow-sm lg:col-span-4">
          <CardHeader className="space-y-2">
            <CardTitle>Stack MVP</CardTitle>
            <CardDescription>Siap deploy di Vercel & Supabase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Frontend & API</p>
              <p>Next.js App Router · TypeScript · tRPC · TanStack Query · Tailwind · shadcn/ui</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Database & Auth</p>
              <p>Supabase Postgres · Prisma ORM · NextAuth (Email magic link, Google)</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Utilities</p>
              <p>PDF struk via pdf-lib · Role Owner/Admin/Kasir · Deploy ke Vercel</p>
            </div>
            <div className="grid gap-2 pt-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/docs/implementation">Panduan Implementasi</Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/docs/persiapan-awal">Checklist Persiapan Awal</Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/demo/cashier">Demo Kasir Tanpa Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Aksi Cepat</h2>
            <p className="text-sm text-muted-foreground">Langsung menuju modul inti sesuai kebutuhan operasional.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Lihat Dashboard</Link>
          </Button>
        </div>
        <MotionList
          variants={containerCards}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {quickActions.map((action) => {
            const accent = ACCENT_CLASSES[action.accent];
            return (
              <MotionItem key={action.title} variants={cardVariant} className="h-full">
                <Card className="relative h-full overflow-hidden border border-border/70 bg-card">
                  <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${accent.gradient}`} />
                  <CardContent className="relative flex h-full flex-col justify-between gap-6 p-6">
                    <div className="flex items-start gap-3">
                      <span className={`rounded-full p-2 ${accent.icon}`}>
                        {action.icon}
                      </span>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-foreground">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                    <Button variant="ghost" className="w-fit px-0 text-primary" asChild>
                      <Link href={action.href} className="inline-flex items-center gap-2">
                        Buka Modul
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </MotionItem>
            );
          })}
        </MotionList>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="h-full lg:col-span-4">
          <CardHeader>
            <CardTitle>Menu Cepat</CardTitle>
            <CardDescription>Akses modul favorit tanpa meninggalkan dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-between gap-6">
            <div className="grid gap-3 min-[420px]:grid-cols-2">
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/cashier">Kasir</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/management/products">Produk</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/reports/daily">Laporan Harian</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Gunakan tombol-tombol di atas untuk lompat cepat ke modul yang paling sering dipakai tim operasional.
            </p>
          </CardContent>
        </Card>
        <Card className="h-full lg:col-span-8">
          <CardHeader>
            <CardTitle>Snapshot Operasional</CardTitle>
            <CardDescription>Satu pandangan ringkas untuk status kasir, stok, dan laporan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {snapshotHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4"
                  >
                    <span className="rounded-full bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Roadmap Implementasi</CardTitle>
            <CardDescription>Checklist persiapan go-live: master data, konfigurasi outlet, dan pelatihan.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm leading-6 text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">1. Persiapan Data</span> — import SKU awal,
                kategori, harga jual, dan stok awal melalui Supabase.
              </li>
              <li>
                <span className="font-semibold text-foreground">2. Konfigurasi Role</span> — tetapkan Owner, Admin,
                dan Kasir dengan NextAuth & Supabase.
              </li>
              <li>
                <span className="font-semibold text-foreground">3. Uji Kasir</span> — simulasi scan barcode → diskon → pembayaran → cetak PDF.
              </li>
              <li>
                <span className="font-semibold text-foreground">4. Go-Live</span> — deploy ke Vercel, monitor bug, dan validasi laporan kas harian.
              </li>
            </ol>
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Integrasi Mendatang</CardTitle>
            <CardDescription>Rencana upgrade setelah MVP stabil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {["Integrasi pembayaran QRIS & kartu melalui gateway resmi.", "Sinkronisasi akuntansi & e-commerce marketplace.", "Loyalty & membership untuk repeat customer."]
              .map((item) => (
                <p key={item} className="flex items-start gap-2">
                  <Settings2 className="mt-0.5 h-4 w-4 text-primary" />
                  {item}
                </p>
              ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
