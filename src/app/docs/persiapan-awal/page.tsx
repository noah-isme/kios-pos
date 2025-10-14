import { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MotionList, { MotionItem } from "@/components/ui/motion-list";

export const metadata: Metadata = {
  title: "Persiapan Awal POS",
  description:
    "Checklist detail untuk merumuskan tujuan, alur, role, dan outlet sebelum implementasi Kios POS dimulai.",
};

const goals = [
  {
    title: "Tujuan Bisnis",
    items: [
      "KPI utama: durasi transaksi rata-rata, akurasi stok, dan kerapian kas harian.",
      "Susun baseline metrik (mis. transaksi per kasir per jam, shrinkage stok) sebagai pembanding setelah go-live.",
      "Catat dependensi eksternal: sistem akuntansi, marketplace, atau ERP yang akan diintegrasikan kemudian.",
    ],
  },
  {
    title: "Alur Kasir",
    items: [
      "Definisikan sumber item (scan barcode, pencarian manual, atau katalog favorit).",
      "Mapping langkah diskon: diskon per item, diskon keseluruhan, dan approval supervisor bila melampaui batas.",
      "Tetapkan SOP retur/refund termasuk log persetujuan dan pengembalian stok.",
      "Identifikasi dokumen pendukung (nota retur, bukti pembayaran) yang harus diunggah atau dicetak.",
    ],
  },
  {
    title: "Role & Tanggung Jawab",
    items: [
      "Owner: akses penuh laporan, konfigurasi outlet, approval promo besar, audit kas.",
      "Admin: kelola master data produk, harga, stok, serta onboarding kasir.",
      "Kasir: transaksi penjualan, retur terbatas, dan penutupan kas harian.",
      "Dokumentasikan rotasi shift dan fallback jika role tertentu tidak tersedia di cabang.",
    ],
  },
  {
    title: "Outlet & Gudang",
    items: [
      "Daftar setiap outlet fisik beserta gudang pusat/buffer yang menyuplai stok.",
      "Tentukan kode outlet unik untuk konsistensi di Prisma (field `Outlet.code`).",
      "Mapping stok awal dan tanggung jawab opname per lokasi.",
      "Rencanakan jadwal sinkronisasi data jika ada sistem lama yang tetap berjalan paralel sementara.",
    ],
  },
];

export default function PersiapanAwalPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Persiapan Awal POS</h1>
        <p className="text-muted-foreground text-sm">
          Gunakan checklist berikut untuk mengumpulkan keputusan operasional sebelum menjalankan konfigurasi teknis Kios POS.
        </p>
      </header>
      <section className="grid gap-4">
        {goals.map((goal, i) => {
          const titleId = `goal-title-${i}`;
          const descrId = `goal-desc-${i}`;
          return (
            <Card key={goal.title} aria-labelledby={titleId} aria-describedby={descrId} className="card-focusable" tabIndex={0}>
              <CardHeader>
                <CardTitle id={titleId}>{goal.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p id={descrId} className="sr-only">
                  {`Rincian ${goal.title}: ${goal.items.slice(0, 3).join(', ')}.`}
                </p>
                <MotionList as="ul" className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {goal.items.map((item) => (
                    <MotionItem as="li" key={item} className="list-item">
                      {item}
                    </MotionItem>
                  ))}
                </MotionList>
              </CardContent>
            </Card>
          );
        })}
      </section>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Checklist Implementasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Simpan keputusan di spreadsheet atau tool dokumentasi bersama tim. Template seed Prisma dapat menggunakan model
              <code className="mx-1 rounded bg-muted px-1 py-0.5">Role</code>,
              <code className="mx-1 rounded bg-muted px-1 py-0.5">Outlet</code>, dan
              <code className="mx-1 rounded bg-muted px-1 py-0.5">Inventory</code> untuk preload data awal stok per lokasi,
              ditambah <code className="mx-1 rounded bg-muted px-1 py-0.5">StockMovement</code> jika ingin melacak riwayat awal.
            </p>
            <p>
              Setelah semua poin terisi, lanjutkan ke langkah konfigurasi perangkat lunak dan data pada halaman panduan
              implementasi utama.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
