"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useMemo, useState } from "react";
import type { PaymentMethod } from "@prisma/client";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

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
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [selectedWeeklyOutlet, setSelectedWeeklyOutlet] = useState<string>("all");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | "ALL">("ALL");

  const summaryQuery = api.sales.getDailySummary.useQuery({ date: selectedDate });
  const forecastQuery = api.sales.forecastNextDay.useQuery(
    { outletId: summaryQuery.data?.sales[0]?.outletId ?? "" },
    { enabled: Boolean(summaryQuery.data?.sales.length) },
  );
  const outletsQuery = api.outlets.list.useQuery();
  const weeklyTrendQuery = api.sales.getWeeklyTrend.useQuery(
    {
      outletId: selectedWeeklyOutlet === "all" ? undefined : selectedWeeklyOutlet,
      paymentMethod: selectedMethod === "ALL" ? undefined : selectedMethod,
    },
    { enabled: activeTab === "weekly" },
  );

  const filteredSales = useMemo(() => {
    if (!summaryQuery.data?.sales) return [];
    if (!search) return summaryQuery.data.sales;
    return summaryQuery.data.sales.filter(sale =>
      sale.items.some(item => item.productName.toLowerCase().includes(search.toLowerCase()))
    );
  }, [summaryQuery.data?.sales, search]);

  const weeklyChartData = useMemo(() => {
    if (!weeklyTrendQuery.data?.series) return [];
    return weeklyTrendQuery.data.series.map((point) => ({
      date: format(new Date(point.date), "dd MMM"),
      omzet: point.totalNet,
      transaksi: point.transactionCount,
    }));
  }, [weeklyTrendQuery.data?.series]);

  const weeklySummary = weeklyTrendQuery.data?.summary;
  const weeklyInsight = useMemo(() => {
    if (!weeklySummary) {
      return "Belum ada data tren minggu ini.";
    }

    const change = Number(weeklySummary.changePercent.toFixed(1));
    if (Number.isNaN(change)) {
      return "Belum ada data tren minggu ini.";
    }

    if (change === 0) {
      return "Penjualan stabil dibandingkan minggu lalu.";
    }

    return change > 0
      ? `Penjualan naik ${change}% dibandingkan minggu lalu.`
      : `Penjualan turun ${Math.abs(change)}% dibandingkan minggu lalu.`;
  }, [weeklySummary]);

  const totals = useMemo(() => {
    const sales = filteredSales;
    return {
      totalSales: sales.length,
      totalItems: sales.reduce((sum, s) => sum + s.items.reduce((itemSum, i) => itemSum + i.quantity, 0), 0),
      totalRevenue: sales.reduce((sum, s) => sum + s.totalNet, 0),
    };
  }, [filteredSales]);

  const outlets = outletsQuery.data ?? [];
  const paymentMethodOptions: Array<PaymentMethod | "ALL"> = [
    "ALL",
    "CASH",
    "CARD",
    "QRIS",
    "EWALLET",
  ];
  const isWeeklyLoading = weeklyTrendQuery.isLoading;
  const isWeeklyRefreshing = weeklyTrendQuery.isFetching;
  const weeklyHasData = (weeklyTrendQuery.data?.series.length ?? 0) > 0;
  const weeklyChange = weeklySummary?.changePercent ?? 0;
  const weeklyNetDifference =
    (weeklySummary?.currentTotalNet ?? 0) - (weeklySummary?.previousTotalNet ?? 0);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Laporan Penjualan</h1>
        <p className="text-muted-foreground">
          Analisis performa kasir harian dan tren mingguan lintas outlet.
        </p>
      </header>

      <nav className="flex space-x-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("daily")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === "daily"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ringkasan Harian
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === "weekly"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Tren Mingguan
        </button>
      </nav>

      {activeTab === "daily" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
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
          </div>

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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
                            >
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
                  Sarankan setoran kas awal sebesar {" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(forecastQuery.data?.suggestedFloat ?? 0)}
                  </span>{" "}
                  untuk menjaga kelancaran transaksi.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "weekly" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-3">
              <div className="grid gap-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="weekly-outlet-filter"
                >
                  Outlet
                </label>
                <select
                  id="weekly-outlet-filter"
                  value={selectedWeeklyOutlet}
                  onChange={(event) => setSelectedWeeklyOutlet(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">Semua outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="weekly-method-filter"
                >
                  Metode Pembayaran
                </label>
                <select
                  id="weekly-method-filter"
                  value={selectedMethod}
                  onChange={(event) =>
                    setSelectedMethod(event.target.value as PaymentMethod | "ALL")
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paymentMethodOptions.map((method) => (
                    <option key={method} value={method}>
                      {method === "ALL" ? "Semua metode" : method}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="weekly-refresh">
                  &nbsp;
                </label>
                <Button
                  id="weekly-refresh"
                  variant="outline"
                  onClick={() => weeklyTrendQuery.refetch()}
                  disabled={isWeeklyRefreshing}
                >
                  {isWeeklyRefreshing ? "Memperbarui..." : "Refresh"}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Menampilkan 7 hari terakhir sampai {format(new Date(), "PPP", { locale: localeId })}
            </div>
          </div>

          {weeklyTrendQuery.error && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Gagal memuat tren mingguan: {weeklyTrendQuery.error.message}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="card-focusable">
              <CardHeader>
                <CardTitle>Omzet 7 Hari Terakhir</CardTitle>
                <CardDescription>Akumulasi transaksi sesuai filter.</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {isWeeklyLoading ? "…" : formatCurrency(weeklySummary?.currentTotalNet ?? 0)}
                {!isWeeklyLoading && weeklySummary && (
                  <p className="mt-2 text-xs font-normal text-muted-foreground">
                    Minggu lalu: {formatCurrency(weeklySummary.previousTotalNet)}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="card-focusable">
              <CardHeader>
                <CardTitle>Total Transaksi</CardTitle>
                <CardDescription>Jumlah struk selama periode.</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {isWeeklyLoading ? "…" : weeklySummary?.currentTransactionCount ?? 0}
                {!isWeeklyLoading && weeklySummary && (
                  <p className="mt-2 text-xs font-normal text-muted-foreground">
                    Minggu lalu: {weeklySummary.previousTransactionCount}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="card-focusable">
              <CardHeader>
                <CardTitle>Selisih Omzet</CardTitle>
                <CardDescription>Perbandingan dengan minggu lalu.</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {isWeeklyLoading
                  ? "…"
                  : formatCurrency(weeklyNetDifference)}
                {!isWeeklyLoading && (
                  <p
                    className={`mt-2 text-xs font-medium ${
                      weeklyNetDifference > 0
                        ? "text-emerald-600"
                        : weeklyNetDifference < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {weeklyNetDifference > 0
                      ? "Lebih tinggi dari minggu lalu"
                      : weeklyNetDifference < 0
                        ? "Lebih rendah dari minggu lalu"
                        : "Setara dengan minggu lalu"}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="card-focusable">
              <CardHeader>
                <CardTitle>Perubahan Persentase</CardTitle>
                <CardDescription>Tren omzet dibanding periode sebelumnya.</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {isWeeklyLoading
                  ? "…"
                  : `${weeklyChange > 0 ? "+" : ""}${weeklyChange.toFixed(1)}%`}
                {!isWeeklyLoading && (
                  <p className="mt-2 text-xs font-normal text-muted-foreground">
                    {weeklyInsight}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tren Penjualan 7 Hari</CardTitle>
              <CardDescription>
                Grafik kombinasi omzet dan jumlah transaksi harian.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[360px]">
              {isWeeklyLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Memuat data tren...
                </div>
              ) : weeklyHasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyChartData} margin={{ top: 16, right: 24, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      className="text-xs"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      className="text-xs"
                    />
                    <Tooltip
                      formatter={(value: number, name) =>
                        name === "Omzet"
                          ? [formatCurrency(value), "Omzet"]
                          : [value, "Transaksi"]
                      }
                      labelFormatter={(label) => label}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar yAxisId="left" dataKey="omzet" name="Omzet" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="transaksi"
                      name="Transaksi"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Belum ada data untuk periode ini.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Insight Mingguan</CardTitle>
              <CardDescription>Pertimbangan cepat untuk tim operasional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {isWeeklyLoading && <p>Menganalisis performa...</p>}
              {!isWeeklyLoading && weeklyHasData && (
                <>
                  <p className="text-base font-medium text-foreground">{weeklyInsight}</p>
                  <p>
                    Total omzet minggu ini {formatCurrency(weeklySummary?.currentTotalNet ?? 0)} dengan {weeklySummary?.currentTransactionCount ?? 0}
                    {" "}
                    transaksi. Selisih bersih terhadap minggu lalu adalah {formatCurrency(weeklyNetDifference)}.
                  </p>
                </>
              )}
              {!isWeeklyLoading && !weeklyHasData && (
                <p>Belum ada transaksi pada rentang 7 hari terakhir sesuai filter yang dipilih.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
