"use client";

import { useMemo, useState } from "react";

import { MotionButton as Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MotionTableBody, MotionTableRow } from "@/components/ui/motion-table";

const demoSales = [
  {
    id: "s-1",
    receipt: "POS-20240101-001",
    soldAt: "2024-01-01T08:12:00+07:00",
    method: "Tunai",
    total: 245000,
  },
  {
    id: "s-2",
    receipt: "POS-20240101-002",
    soldAt: "2024-01-01T09:05:00+07:00",
    method: "QRIS",
    total: 182000,
  },
  {
    id: "s-3",
    receipt: "POS-20240101-003",
    soldAt: "2024-01-01T10:44:00+07:00",
    method: "Tunai",
    total: 360000,
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function DemoReportsPage() {
  const [selectedDate, setSelectedDate] = useState("2024-01-01");

  const stats = useMemo(() => {
    const totalTransactions = demoSales.length;
    const totalItems = 96;
    const totalSales = demoSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCash = demoSales
      .filter((sale) => sale.method === "Tunai")
      .reduce((sum, sale) => sum + sale.total, 0);
    return {
      totalTransactions,
      totalItems,
      totalSales,
      totalCash,
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Demo Read-only
        </p>
        <h1 className="text-3xl font-semibold text-foreground">Laporan Harian</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pilih tanggal dan lihat ringkasan performa outlet. Data simulasi menunjukkan struktur laporan sebenarnya.
        </p>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <Button variant="outline">Refresh</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Forecast float & export PDF tersedia pada versi penuh.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-focusable">
          <CardHeader>
            <CardTitle>Total Transaksi</CardTitle>
            <CardDescription>{selectedDate}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stats.totalTransactions}
          </CardContent>
        </Card>
        <Card className="card-focusable">
          <CardHeader>
            <CardTitle>Total Item</CardTitle>
            <CardDescription>Terjual sepanjang hari</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stats.totalItems}
          </CardContent>
        </Card>
        <Card className="card-focusable">
          <CardHeader>
            <CardTitle>Total Penjualan</CardTitle>
            <CardDescription>Setelah diskon</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(stats.totalSales)}
          </CardContent>
        </Card>
        <Card className="card-focusable">
          <CardHeader>
            <CardTitle>Kas Masuk</CardTitle>
            <CardDescription>Tunai & setoran</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(stats.totalCash)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi</CardTitle>
          <CardDescription>Sample data untuk menunjukkan struktur tabel.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table className="[&_tbody]:block [&_tbody]:max-h-[320px] [&_tbody]:overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background">
              <TableHeader>
                <TableRow>
                  <TableHead>Struk</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <MotionTableBody>
                {demoSales.map((sale) => (
                  <MotionTableRow key={sale.id} className="border-b">
                    <TableCell className="font-medium">{sale.receipt}</TableCell>
                    <TableCell>
                      {new Date(sale.soldAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{sale.method}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sale.total)}
                    </TableCell>
                  </MotionTableRow>
                ))}
              </MotionTableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forecast Float Kasir</CardTitle>
          <CardDescription>Contoh insight prediksi berdasarkan rolling 7 hari.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Setorkan minimal{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(Math.round(stats.totalSales * 0.4))}
          </span>{" "}
          sebelum toko buka esok hari untuk menjaga ketersediaan kas kecil.
        </CardContent>
      </Card>
    </div>
  );
}

