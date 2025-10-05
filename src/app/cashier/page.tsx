"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentMethod } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
};

type PaymentEntry = {
  method: PaymentMethod;
  amount: number;
  reference?: string;
};

const paymentLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Tunai",
  [PaymentMethod.CARD]: "Kartu",
  [PaymentMethod.QRIS]: "QRIS",
  [PaymentMethod.EWALLET]: "E-Wallet",
};

const paymentOptions: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.QRIS,
  PaymentMethod.EWALLET,
];

export default function CashierPage() {
  const { data: outlets } = api.outlets.list.useQuery();
  const [selectedOutlet, setSelectedOutlet] = useState<string | undefined>();
  const [barcode, setBarcode] = useState("");
  const [manualDiscount, setManualDiscount] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([
    { method: PaymentMethod.CASH, amount: 0, reference: "" },
  ]);
  const [refundReceipt, setRefundReceipt] = useState("");
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    if (!selectedOutlet && outlets?.length) {
      setSelectedOutlet(outlets[0]?.id);
    }
  }, [outlets, selectedOutlet]);

  const productLookup = api.products.getByBarcode.useQuery(
    { barcode },
    {
      enabled: false,
    },
  );

  const recordSale = api.sales.recordSale.useMutation();
  const printReceipt = api.sales.printReceipt.useMutation();
  const refundSale = api.sales.refundSale.useMutation();

  const totals = useMemo(() => {
    const totalGross = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const itemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
    const totalDiscount = itemDiscounts + manualDiscount;
    const totalNet = Math.max(totalGross - totalDiscount, 0);

    return {
      totalGross,
      totalDiscount,
      totalNet,
    };
  }, [cart, manualDiscount]);

  const paymentsTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + (Number.isNaN(payment.amount) ? 0 : payment.amount), 0),
    [payments],
  );

  useEffect(() => {
    setPayments((prev) => {
      if (prev.length === 0) {
        return [
          {
            method: PaymentMethod.CASH,
            amount: totals.totalNet,
            reference: "",
          },
        ];
      }

      const sum = prev.reduce((acc, payment) => acc + payment.amount, 0);
      if (sum === 0 && totals.totalNet > 0) {
        const [first, ...rest] = prev;
        return [
          {
            ...first,
            amount: totals.totalNet,
          },
          ...rest,
        ];
      }

      return prev;
    });
  }, [totals.totalNet]);

  const setPaymentValue = <Key extends keyof PaymentEntry>(
    index: number,
    key: Key,
    value: PaymentEntry[Key],
  ) => {
    setPayments((prev) =>
      prev.map((payment, idx) =>
        idx === index
          ? {
              ...payment,
              [key]: key === "amount" && typeof value === "number" ? Math.max(value, 0) : value,
            }
          : payment,
      ),
    );
  };

  const addPaymentMethod = () => {
    const remaining = Math.max(totals.totalNet - paymentsTotal, 0);
    setPayments((prev) => [
      ...prev,
      { method: PaymentMethod.CASH, amount: remaining, reference: "" },
    ]);
  };

  const removePaymentMethod = (index: number) => {
    setPayments((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const addProductToCart = async () => {
    if (!barcode.trim()) return;

    const result = await productLookup.refetch();

    if (!result.data) {
      toast.error("Produk tidak ditemukan");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === result.data?.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === result.data?.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: result.data.id,
          name: result.data.name,
          price: result.data.price,
          quantity: 1,
          discount: 0,
        },
      ];
    });
    setBarcode("");
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    const safeQuantity = Number.isNaN(quantity) ? 1 : quantity;
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(safeQuantity, 1) }
          : item,
      ),
    );
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    const safeDiscount = Number.isNaN(discount) ? 0 : discount;
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, discount: Math.max(safeDiscount, 0) }
          : item,
      ),
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleCheckout = async () => {
    if (!selectedOutlet) {
      toast.error("Pilih outlet terlebih dahulu");
      return;
    }
    if (cart.length === 0) {
      toast.error("Keranjang masih kosong");
      return;
    }

    if (Math.abs(paymentsTotal - totals.totalNet) > 0.01) {
      toast.error("Nominal pembayaran belum seimbang dengan total tagihan");
      return;
    }

    try {
      const sale = await recordSale.mutateAsync({
        outletId: selectedOutlet,
        receiptNumber: `POS-${Date.now()}`,
        discountTotal: manualDiscount,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount,
        })),
        payments: payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          reference: payment.reference || undefined,
        })),
      });

      toast.success("Transaksi tersimpan");

      const receipt = await printReceipt.mutateAsync({ saleId: sale.id });
      const byteCharacters = atob(receipt.base64);
      const byteNumbers = new Array(byteCharacters.length)
        .fill(0)
        .map((_, index) => byteCharacters.charCodeAt(index));
      const file = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
      const url = URL.createObjectURL(file);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      setCart([]);
      setManualDiscount(0);
      setPayments([{ method: PaymentMethod.CASH, amount: 0, reference: "" }]);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan transaksi");
    }
  };

  const handleRefund = async () => {
    if (!refundReceipt.trim()) {
      toast.error("Masukkan nomor struk untuk refund");
      return;
    }

    try {
      const result = await refundSale.mutateAsync({
        receiptNumber: refundReceipt.trim(),
        reason: refundReason.trim() || undefined,
      });

      toast.success(`Refund berhasil untuk ${result.saleId}`);
      setRefundReceipt("");
      setRefundReason("");
    } catch (error) {
      console.error(error);
      toast.error("Gagal melakukan refund");
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Modul Kasir</h1>
        <p className="text-muted-foreground">
          Scan barcode, kelola diskon, dan selesaikan pembayaran dengan PDF struk otomatis.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Input Produk</CardTitle>
            <CardDescription>Gunakan scanner barcode atau cari manual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="outlet">Outlet</Label>
              <select
                id="outlet"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedOutlet ?? ""}
                onChange={(event) => setSelectedOutlet(event.target.value)}
              >
                {outlets?.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="Scan atau ketik barcode"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addProductToCart();
                    }
                  }}
                />
                <Button onClick={() => void addProductToCart()}>Tambah</Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="w-24 text-right">Qty</TableHead>
                  <TableHead className="w-24 text-right">Harga</TableHead>
                  <TableHead className="w-24 text-right">Diskon</TableHead>
                  <TableHead className="w-24 text-right">Total</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) =>
                          updateItemQuantity(item.productId, Number(event.target.value))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={item.discount}
                        onChange={(event) =>
                          updateItemDiscount(item.productId, Number(event.target.value))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.price * item.quantity - item.discount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeItem(item.productId)}
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Pembayaran</CardTitle>
              <CardDescription>Metode bayar dapat dikembangkan sesuai kebutuhan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Total Bruto</span>
                <span>{formatCurrency(totals.totalGross)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Diskon Item</span>
                <span>- {formatCurrency(cart.reduce((sum, item) => sum + item.discount, 0))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Diskon Tambahan</span>
                <Input
                  type="number"
                  min={0}
                  value={manualDiscount}
                  onChange={(event) =>
                    setManualDiscount(Number(event.target.value || 0))
                  }
                  className="h-9 w-28 text-right"
                />
              </div>
              <div className="flex items-center justify-between border-t border-dashed pt-3 text-base font-semibold">
                <span>Total Dibayar</span>
                <span>{formatCurrency(totals.totalNet)}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Pembayaran</span>
                  <span>{formatCurrency(paymentsTotal)}</span>
                </div>
                <div className="space-y-2">
                  {payments.map((payment, index) => (
                    <div key={`${payment.method}-${index}`} className="rounded-md border p-3">
                      <div className="flex flex-col gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <label className="w-24 font-semibold" htmlFor={`payment-method-${index}`}>
                            Metode
                          </label>
                          <select
                            id={`payment-method-${index}`}
                            className="h-8 flex-1 rounded-md border border-input bg-background px-2"
                            value={payment.method}
                            onChange={(event) =>
                              setPaymentValue(index, "method", event.target.value as PaymentMethod)
                            }
                          >
                            {paymentOptions.map((method) => (
                              <option key={method} value={method}>
                                {paymentLabels[method]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="w-24 font-semibold" htmlFor={`payment-amount-${index}`}>
                            Nominal
                          </label>
                          <Input
                            id={`payment-amount-${index}`}
                            type="number"
                            min={0}
                            value={payment.amount}
                            onChange={(event) =>
                              setPaymentValue(index, "amount", Number(event.target.value || 0))
                            }
                            className="h-8 flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="w-24 font-semibold" htmlFor={`payment-ref-${index}`}>
                            Referensi
                          </label>
                          <Input
                            id={`payment-ref-${index}`}
                            value={payment.reference ?? ""}
                            placeholder="ID transaksi / 4 digit akhir"
                            onChange={(event) =>
                              setPaymentValue(index, "reference", event.target.value)
                            }
                            className="h-8 flex-1"
                          />
                        </div>
                        {payments.length > 1 && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePaymentMethod(index)}
                            >
                              Hapus Metode
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={addPaymentMethod}>
                    Tambah Metode Pembayaran
                  </Button>
                </div>
                <Badge
                  variant={Math.abs(paymentsTotal - totals.totalNet) < 0.01 ? "secondary" : "destructive"}
                  className="w-fit"
                >
                  {Math.abs(paymentsTotal - totals.totalNet) < 0.01
                    ? "Pembayaran seimbang"
                    : `Selisih ${formatCurrency(totals.totalNet - paymentsTotal)}`}
                </Badge>
              </div>
              <Button
                className={cn("w-full", recordSale.isLoading && "opacity-60")}
                disabled={recordSale.isLoading}
                onClick={() => void handleCheckout()}
              >
                {recordSale.isLoading ? "Memproses..." : "Selesaikan & Cetak Struk"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tips Operasional</CardTitle>
              <CardDescription>Best practice shift kasir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>• Mulai shift dengan hitung kas fisik dan update float di modul outlet.</p>
              <p>• Gunakan retur dengan approval Admin untuk menghindari fraud.</p>
              <p>• Upload bukti pembayaran non-tunai ke Supabase Storage jika diperlukan.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Proses Refund</CardTitle>
              <CardDescription>Masukkan nomor struk dan alasan singkat.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-2">
                <Label htmlFor="refund-receipt">Nomor Struk</Label>
                <Input
                  id="refund-receipt"
                  value={refundReceipt}
                  onChange={(event) => setRefundReceipt(event.target.value)}
                  placeholder="Contoh: POS-1700000000000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="refund-reason">Alasan</Label>
                <textarea
                  id="refund-reason"
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  className="min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Barang rusak / retur pelanggan"
                />
              </div>
              <Button
                className={cn("w-full", refundSale.isLoading && "opacity-60")}
                disabled={refundSale.isLoading}
                onClick={() => void handleRefund()}
              >
                {refundSale.isLoading ? "Memproses..." : "Refund Transaksi"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
