"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
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
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MotionTableBody, MotionTableRow } from "@/components/ui/motion-table";
import { api } from "@/trpc/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");

  const summaryQuery = api.sales.getDailySummary.useQuery({ date: selectedDate });
  const forecastQuery = api.sales.forecastNextDay.useQuery(
    { outletId: summaryQuery.data?.sales[0]?.outletId ?? "" },
    { enabled: Boolean(summaryQuery.data?.sales.length) },
  );

  const filteredSales = useMemo(() => {
    if (!summaryQuery.data?.sales) return [];
    if (!search) return summaryQuery.data.sales;
    return summaryQuery.data.sales.filter(sale =>
      sale.items.some(item => item.productName.toLowerCase().includes(search.toLowerCase()))
    );
  }, [summaryQuery.data?.sales, search]);

  const totals = useMemo(() => {
    const sales = filteredSales;
    return {
      totalSales: sales.length,
      totalItems: sales.reduce((sum, s) => sum + s.items.reduce((itemSum, i) => itemSum + i.quantity, 0), 0),
      totalRevenue: sales.reduce((sum, s) => sum + s.totalNet, 0),
    };
  }, [filteredSales]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Laporan Penjualan Harian</h1>
          <p className="text-muted-foreground">
            Rekap transaksi, total item, dan kas diterima untuk tanggal terpilih.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <Button onClick={() => summaryQuery.refetch()}>Refresh</Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-focusable">
          <CardHeader>
            <CardTitle>Total Transaksi</CardTitle>
            <CardDescription>{format(new Date(selectedDate), "PPP", { locale: localeId })}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.isLoading ? "…" : summaryQuery.data?.sales.length ?? 0}
          </CardContent>
        </Card>
        <Card className="card-focusable">
          <CardHeader>
            <CardTitle>Total Item</CardTitle>
            <CardDescription>Terjual sepanjang hari</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.isLoading ? "…" : totals?.totalItems ?? 0}
          </CardContent>
        </Card>
        <Card className="card-focusable">
          <CardHeader>
            <CardTitle>Total Penjualan</CardTitle>
            <CardDescription>Setelah diskon</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.isLoading ? "…" : formatCurrency(totals?.totalRevenue ?? 0)}
          </CardContent>
        </Card>
        <Card className="card-focusable">
          <CardHeader>
            <CardTitle>Kas Masuk</CardTitle>
            <CardDescription>Tunai & setoran kasir</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.isLoading ? "…" : formatCurrency(totals?.totalRevenue ?? 0)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi</CardTitle>
          <CardDescription>Daftar ringkas transaksi pada tanggal tersebut.</CardDescription>
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
                {filteredSales.map((sale) => (
                  <MotionTableRow key={sale.id} className="border-b">
                    <TableCell className="font-medium">{sale.receiptNumber}</TableCell>
                    <TableCell>{format(new Date(sale.soldAt), "HH:mm")}</TableCell>
                    <TableCell>{sale.paymentMethods.join(", ")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(sale.totalNet)}</TableCell>
                  </MotionTableRow>
                ))}
                {filteredSales.length === 0 && (
                  <MotionTableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <p>Belum ada transaksi untuk tanggal ini.</p>
                        <Button variant="outline" size="sm" onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}>
                          Reset ke hari ini
                        </Button>
                      </div>
                    </TableCell>
                  </MotionTableRow>
                )}
              </MotionTableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estimasi Float Besok</CardTitle>
          <CardDescription>Rata-rata penjualan 7 hari terakhir per outlet.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {forecastQuery.isLoading && <p>Menghitung ...</p>}
          {!forecastQuery.isLoading && (
            <p>
              Sarankan setoran kas awal sebesar <span className="font-semibold text-foreground">{formatCurrency(forecastQuery.data?.suggestedFloat ?? 0)}</span> untuk menjaga kelancaran transaksi.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
