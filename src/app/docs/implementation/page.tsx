import { Metadata } from "next";

import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MotionList, { MotionItem } from "@/components/ui/motion-list";

export const metadata: Metadata = {
  title: "Panduan Implementasi POS",
};

const sections: Array<{ title: string; items: string[] }> = [
  {
    title: "1. Persiapan Awal",
    items: [
      "Tetapkan tujuan utama POS: percepat transaksi, kontrol stok, laporan valid.",
      "Definisikan alur kasir: scan barcode → diskon → retur.",
      "Buat struktur role: Owner, Admin, Kasir.",
      "Daftarkan outlet/cabang & gudang.",
    ],
  },
  {
    title: "2. Perangkat Lunak",
    items: [
      "Implementasi modul kasir via Next.js + tRPC (scan, diskon, refund).",
      "Manajemen produk & kategori melalui Prisma + Supabase.",
      "Kelola stok (tambah, transfer, opname) per outlet.",
      "Mock metode pembayaran tunai, kartu, QRIS/e-wallet sebelum integrasi gateway.",
      "Terapkan hak akses sesuai role via NextAuth & Supabase.",
      "Bangun halaman laporan penjualan harian dari Prisma query.",
    ],
  },
  {
    title: "3. Data & Konfigurasi",
    items: [
      "Import data produk awal (nama, barcode, harga, stok) ke Supabase.",
      "Atur kategori produk & supplier.",
      "Konfigurasi harga jual, diskon, promo, dan pajak jika perlu.",
      "Siapkan template struk PDF sederhana via pdf-lib.",
    ],
  },
  {
    title: "4. Uji Coba & Pelatihan",
    items: [
      "Simulasikan transaksi normal (scan → bayar → cetak PDF).",
      "Uji retur/refund dengan approval supervisor.",
      "Uji pembayaran tunai dan non-tunai dummy.",
      "Latih kasir & supervisor menggunakan UI web.",
    ],
  },
  {
    title: "5. Go-Live",
    items: [
      "Tentukan tanggal go-live, siapkan support team.",
      "Backup stok & transaksi lama (export CSV Supabase).",
      "Pindah transaksi ke POS baru di Vercel.",
      "Monitor bug/error minggu pertama dan validasi laporan kas harian.",
    ],
  },
  {
    title: "6. Pemeliharaan & Evaluasi",
    items: [
      "Aktifkan backup otomatis Supabase dan patch keamanan rutin.",
      "Lakukan stock opname berkala.",
      "Evaluasi laporan penjualan untuk strategi bisnis.",
      "Siapkan roadmap integrasi akuntansi, e-commerce, loyalty.",
    ],
  },
];

export default function ImplementationGuidePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Panduan Implementasi POS</h1>
        <p className="text-muted-foreground">
          Checklist langkah demi langkah untuk memastikan POS berjalan stabil dari setup hingga evaluasi.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Detail Persiapan Awal</CardTitle>
          <CardDescription>
            Pastikan fondasi operasional lengkap sebelum konfigurasi teknis dengan mengikuti panduan rinci berikut.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Dokumentasikan sasaran bisnis, alur kasir, role karyawan, dan daftar outlet secara eksplisit. Gunakan template
            persiapan di dokumentasi untuk mencatat keputusan bersama pemangku kepentingan.
          </p>
          <p>
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/docs/persiapan-awal">
              Buka panduan Persiapan Awal terperinci
            </Link>{" "}
            untuk menyalin checklist, form tanggung jawab role, serta contoh seed data Prisma.
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <MotionList as="ul" className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <MotionItem as="li" key={item} className="list-item">
                    {item}
                  </MotionItem>
                ))}
              </MotionList>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
