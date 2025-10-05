"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const summaryQuery = api.sales.getDailySummary.useQuery({ date: selectedDate });
  const forecastQuery = api.sales.forecastNextDay.useQuery(
    { outletId: summaryQuery.data?.sales[0]?.outletId ?? "" },
    { enabled: Boolean(summaryQuery.data?.sales.length) },
  );

  const totals = useMemo(() => summaryQuery.data?.totals, [summaryQuery.data?.totals]);

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
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <Button onClick={() => summaryQuery.refetch()}>Refresh</Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Transaksi</CardTitle>
            <CardDescription>{format(new Date(selectedDate), "PPP", { locale: localeId })}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.isLoading ? "…" : summaryQuery.data?.sales.length ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Item</CardTitle>
            <CardDescription>Terjual sepanjang hari</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.isLoading ? "…" : totals?.totalItems ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Penjualan</CardTitle>
            <CardDescription>Setelah diskon</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.isLoading ? "…" : formatCurrency(totals?.totalNet ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kas Masuk</CardTitle>
            <CardDescription>Tunai & setoran kasir</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.isLoading ? "…" : formatCurrency(totals?.totalCash ?? 0)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi</CardTitle>
          <CardDescription>Daftar ringkas transaksi pada tanggal tersebut.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Struk</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryQuery.data?.sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.receiptNumber}</TableCell>
                  <TableCell>{format(new Date(sale.soldAt), "HH:mm")}</TableCell>
                  <TableCell>{sale.paymentMethods.join(", ")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(sale.totalNet)}</TableCell>
                </TableRow>
              ))}
              {summaryQuery.data?.sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Belum ada transaksi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
