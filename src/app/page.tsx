import { ArrowRight, BarChart3, Layers, ReceiptText, Settings2 } from "lucide-react";
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

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-6 rounded-2xl border border-border bg-card p-8 shadow-sm lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Badge variant="secondary" className="w-fit uppercase tracking-wide">
            POS Retail Modern
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Sistem POS end-to-end untuk operasional toko yang gesit.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Ditenagai Next.js App Router, tRPC, Prisma, dan Supabase untuk memastikan
            alur kasir cepat, stok terkendali, dan laporan kas akurat setiap hari.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/cashier" className="gap-2">
                Mulai Transaksi
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs/implementation">Baca Panduan Implementasi</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/docs/persiapan-awal">Checklist Persiapan Awal</Link>
            </Button>
          </div>
        </div>
        <Card className="self-center bg-secondary/30">
          <CardHeader>
            <CardTitle>Stack MVP</CardTitle>
            <CardDescription>Siap deploy di Vercel & Supabase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">Frontend & API</p>
              <p className="text-muted-foreground">Next.js App Router · TypeScript · tRPC · TanStack Query · Tailwind · shadcn/ui</p>
            </div>
            <div>
              <p className="font-semibold">Database & Auth</p>
              <p className="text-muted-foreground">Supabase Postgres · Prisma ORM · NextAuth (Email magic link, Google)</p>
            </div>
            <div>
              <p className="font-semibold">Utilities</p>
              <p className="text-muted-foreground">PDF struk via pdf-lib · Role Owner/Admin/Kasir · Deploy ke Vercel</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Menu Cepat</CardTitle>
            <CardDescription>Semua menu utama sekarang tersedia di Dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/dashboard">Buka Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/cashier">Buka Kasir</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Roadmap Implementasi</CardTitle>
            <CardDescription>
              Checklist persiapan go-live: master data, konfigurasi outlet, dan pelatihan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm leading-6 text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">1. Persiapan Data</span> — import SKU awal,
                kategori, harga jual, dan stok awal melalui Supabase.
              </li>
              <li>
                <span className="font-semibold text-foreground">2. Konfigurasi Role</span> — tetapkan Owner, Admin,
                dan Kasir dengan NextAuth & Supabase.
              </li>
              <li>
                <span className="font-semibold text-foreground">3. Uji Kasir</span> — simulasi scan barcode → diskon
                → pembayaran → cetak PDF.
              </li>
              <li>
                <span className="font-semibold text-foreground">4. Go-Live</span> — deploy ke Vercel, monitor bug,
                dan validasi laporan kas harian.
              </li>
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Integrasi Mendatang</CardTitle>
            <CardDescription>Rencana upgrade setelah MVP stabil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <Settings2 className="mr-2 inline h-4 w-4 text-primary" /> Integrasi pembayaran QRIS & kartu
              melalui gateway resmi.
            </p>
            <p>
              <Settings2 className="mr-2 inline h-4 w-4 text-primary" /> Sinkronisasi akuntansi & e-commerce
              marketplace.
            </p>
            <p>
              <Settings2 className="mr-2 inline h-4 w-4 text-primary" /> Loyalty & membership untuk repeat
              customer.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
