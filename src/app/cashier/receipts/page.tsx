"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useActiveOutlet } from "@/hooks/use-active-outlet";
import { Badge } from "@/components/ui/badge";
import { MotionButton as Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MotionTableBody, MotionTableRow } from "@/components/ui/motion-table";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function ReceiptHistoryPage() {
  const { activeOutlet, activeOutletId, setActiveOutlet, outlets } = useActiveOutlet();
  const [voidReason, setVoidReason] = useState("");
  const [selectedSale, setSelectedSale] = useState<{
    id: string;
    receiptNumber: string;
  } | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const receiptsQuery = api.sales.getReceiptsByOutlet.useQuery(
    { outletId: activeOutletId ?? "" },
    { enabled: Boolean(activeOutletId) },
  );
  const printReceipt = api.sales.printReceipt.useMutation();
  const voidSale = api.sales.voidSale.useMutation();

  const isLoading = receiptsQuery.isLoading || receiptsQuery.isFetching;
  const receipts = useMemo(() => receiptsQuery.data ?? [], [receiptsQuery.data]);

  useEffect(() => {
    if (!receiptUrl) return;
    return () => {
      URL.revokeObjectURL(receiptUrl);
    };
  }, [receiptUrl]);

  const handleReprint = async (saleId: string, receiptNumber: string) => {
    try {
      const receipt = await printReceipt.mutateAsync({ saleId, paperSize: "58MM" });
      const bytes = Uint8Array.from(atob(receipt.base64), (char) => char.charCodeAt(0));
      const file = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(file);
      setReceiptUrl(url);
      window.open(url, "_blank", "noopener");
      toast.success(`Struk ${receiptNumber} siap dicetak ulang.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mencetak ulang struk.";
      toast.error(message);
    }
  };

  const handleVoid = (saleId: string, receiptNumber: string) => {
    setSelectedSale({ id: saleId, receiptNumber });
    setVoidReason("");
  };

  const confirmVoid = async () => {
    if (!selectedSale) return;
    const reason = voidReason.trim();

    if (reason.length < 3) {
      toast.error("Alasan pembatalan minimal 3 karakter.");
      return;
    }

    try {
      await voidSale.mutateAsync({ saleId: selectedSale.id, reason });
      toast.success(`Struk ${selectedSale.receiptNumber} dibatalkan.`);
      setSelectedSale(null);
      setVoidReason("");
      await receiptsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membatalkan transaksi.";
      toast.error(message);
    }
  };

  const resetVoidDialog = () => {
    setSelectedSale(null);
    setVoidReason("");
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Riwayat Struk</p>
            <h1 className="text-3xl font-semibold text-foreground">{activeOutlet?.name ?? "Outlet belum dipilih"}</h1>
            <p className="text-muted-foreground">
              Lihat 10 transaksi terakhir, cetak ulang struk 58mm, dan batalkan transaksi yang bermasalah.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/cashier">Kembali ke Kasir</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => receiptsQuery.refetch()}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filter Outlet</CardTitle>
          <CardDescription>Pilih outlet untuk melihat transaksi terkait.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label htmlFor="outlet" className="text-sm text-muted-foreground">
            Outlet Aktif
          </Label>
          <select
            id="outlet"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={activeOutletId ?? ""}
            onChange={(event) => setActiveOutlet(event.target.value)}
          >
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>10 Transaksi Terakhir</CardTitle>
          <CardDescription>Gunakan aksi di kolom terakhir untuk mencetak ulang atau melakukan void.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table className="[&_tbody]:block [&_tbody]:max-h-[460px] [&_tbody]:overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Nomor Struk</TableHead>
                  <TableHead className="w-40">Waktu</TableHead>
                  <TableHead className="w-40">Kasir</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-40">Metode</TableHead>
                  <TableHead className="w-32 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <MotionTableBody>
                {isLoading ? (
                  <MotionTableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat riwayat transaksi…
                      </div>
                    </TableCell>
                  </MotionTableRow>
                ) : receipts.length === 0 ? (
                  <MotionTableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Belum ada transaksi untuk outlet ini.
                    </TableCell>
                  </MotionTableRow>
                ) : (
                  receipts.map((sale) => {
                    const isCompleted = sale.status === "COMPLETED";
                    return (
                      <MotionTableRow key={sale.id} className="border-b">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex flex-col gap-1">
                            <span>{sale.receiptNumber}</span>
                            {sale.status !== "COMPLETED" ? (
                              <Badge variant="outline" className="w-fit text-xs uppercase">
                                {sale.status === "VOIDED"
                                  ? "Void"
                                  : sale.status === "REFUNDED"
                                    ? "Refund"
                                    : sale.status}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(sale.soldAt).toLocaleString("id-ID")}</TableCell>
                        <TableCell>{sale.cashierName ?? "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.totalNet)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {sale.paymentMethods.map((method) => (
                              <Badge key={`${sale.id}-${method}`} variant="secondary" className="text-xs">
                                {method}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => void handleReprint(sale.id, sale.receiptNumber)}
                              disabled={printReceipt.isPending}
                            >
                              {printReceipt.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Cetak Ulang
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVoid(sale.id, sale.receiptNumber)}
                              disabled={!isCompleted || voidSale.isPending}
                            >
                              Void
                            </Button>
                          </div>
                        </TableCell>
                      </MotionTableRow>
                    );
                  })
                )}
              </MotionTableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedSale)} onOpenChange={(open) => !open && resetVoidDialog()}>
        <DialogContent className="max-w-md">
          {selectedSale ? (
            <>
              <DialogHeader>
                <DialogTitle>Konfirmasi Void Struk</DialogTitle>
                <DialogDescription>
                  Pembatalan akan mengembalikan stok ke gudang. Masukkan alasan singkat untuk audit.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-sm font-semibold text-foreground">{selectedSale.receiptNumber}</p>
                  <p className="text-xs text-muted-foreground">Pastikan kasir telah menandatangani bukti pembatalan.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="void-reason" className="text-xs font-semibold text-muted-foreground">
                    Alasan pembatalan
                  </Label>
                  <Input
                    id="void-reason"
                    value={voidReason}
                    onChange={(event) => setVoidReason(event.target.value)}
                    placeholder="Contoh: Produk rusak / transaksi ganda"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={resetVoidDialog} disabled={voidSale.isPending}>
                  Batal
                </Button>
                <Button type="button" onClick={() => void confirmVoid()} disabled={voidSale.isPending}>
                  {voidSale.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Konfirmasi Void
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

