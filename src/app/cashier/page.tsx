"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import type { PaymentMethod } from "@prisma/client";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MotionTableBody, MotionTableRow } from "@/components/ui/motion-table";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cacheProducts, getCachedProductByBarcode } from "@/lib/catalog-cache";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/client";

const DEFAULT_PAYMENT_METHOD: PaymentMethod = "CASH";
const QRIS_PAYMENT_METHOD: PaymentMethod = "QRIS";
const DISCOUNT_LIMIT_PERCENT = Number(
  process.env.NEXT_PUBLIC_DISCOUNT_LIMIT_PERCENT ?? 50,
);
const STORE_NPWP =
  process.env.NEXT_PUBLIC_STORE_NPWP ?? "NPWP belum ditetapkan";

const RECEIPT_WIDTH_CLASS: Record<"58" | "80", string> = {
  "58": "w-[220px]",
  "80": "w-[320px]",
};

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

type ReceiptPreviewState = {
  receiptNumber: string;
  soldAt: Date;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
};

export default function CashierPage() {
  const { activeOutlet, outlets, setActiveOutlet } = useActiveOutlet();
  const activeOutletId = activeOutlet?.id;

  const [barcode, setBarcode] = useState("");
  const [manualDiscount, setManualDiscount] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    DEFAULT_PAYMENT_METHOD,
  );
  const [paymentReference, setPaymentReference] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] =
    useState<ReceiptPreviewState | null>(null);
  const [receiptWidth, setReceiptWidth] = useState<"58" | "80">("58");
  const [receiptQr, setReceiptQr] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<"idle" | "review" | "success">("idle");
  const [isExpressMode, setIsExpressMode] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const productLookup = api.products.getByBarcode.useQuery(
    { barcode },
    { enabled: false, retry: 0 },
  );
  const catalogQuery = api.products.list.useQuery({ take: 100 }, { staleTime: 300_000 });
  const recordSale = api.sales.recordSale.useMutation();
  const printReceipt = api.sales.printReceipt.useMutation();
  const recentSales = api.sales.listRecent.useQuery({ limit: 5 });
  const voidSaleMutation = api.sales.voidSale.useMutation();
  const refundSaleMutation = api.sales.refundSale.useMutation();

  type RecentSale = NonNullable<typeof recentSales.data>[number];

  type AfterSalesActionState = {
    type: "void" | "refund";
    sale: RecentSale;
    note: string;
  };

  const [afterSalesAction, setAfterSalesAction] = useState<AfterSalesActionState | null>(null);

  useEffect(() => {
    if (!catalogQuery.data?.length) return;
    void cacheProducts(
      catalogQuery.data
        .filter((item) => item.barcode)
        .map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          barcode: item.barcode as string,
          price: item.price ?? 0,
        })),
    );
  }, [catalogQuery.data]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!receiptPreview) {
      setReceiptQr(null);
      return;
    }
    QRCode.toDataURL(receiptPreview.receiptNumber, {
      errorCorrectionLevel: "M",
      width: 180,
      margin: 1,
    })
      .then((url) => setReceiptQr(url))
      .catch(() => setReceiptQr(null));
  }, [receiptPreview]);

  useEffect(() => {
    if (!isPaymentDialogOpen && receiptUrl) {
      const url = receiptUrl;
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setReceiptUrl(null);
    }
  }, [isPaymentDialogOpen, receiptUrl]);

  const isProcessingAfterSales = voidSaleMutation.isPending || refundSaleMutation.isPending;

  const openAfterSalesDialog = (sale: RecentSale, type: "void" | "refund") => {
    if (sale.status !== "COMPLETED") {
      toast.info("Transaksi sudah diproses sebelumnya.");
      return;
    }
    setAfterSalesAction({ type, sale, note: "" });
  };

  const updateAfterSalesNote = (value: string) => {
    setAfterSalesAction((current) => (current ? { ...current, note: value } : current));
  };

  const handleConfirmAfterSales = async () => {
    if (!afterSalesAction) return;
    const { sale, type, note } = afterSalesAction;

    try {
      if (type === "void") {
        const result = await voidSaleMutation.mutateAsync({
          saleId: sale.id,
          reason: note || undefined,
        });
        toast.success(`Transaksi ${result.receiptNumber} dibatalkan.`);
        setLiveMessage(`Transaksi ${result.receiptNumber} dibatalkan.`);
      } else {
        const result = await refundSaleMutation.mutateAsync({
          saleId: sale.id,
          reason: note || undefined,
          amount: sale.totalNet,
        });
        toast.success(
          `Refund ${result.receiptNumber} sebesar ${formatCurrency(result.refundAmount)} berhasil.`,
        );
        setLiveMessage(`Refund ${result.receiptNumber} berhasil.`);
      }
      await recentSales.refetch();
      setAfterSalesAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memproses tindakan.";
      toast.error(message);
      setLiveMessage(message);
    }
  };

  const closeAfterSalesDialog = () => {
    if (isProcessingAfterSales) return;
    setAfterSalesAction(null);
  };

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
      itemDiscounts,
    };
  }, [cart, manualDiscount]);

  const addProductToCart = useCallback(async () => {
    const code = barcode.trim();
    if (!code) return;

    try {
      let product = await getCachedProductByBarcode(code);

      if (!product) {
        const result = await productLookup.refetch();
        const fetched = result.data;

        if (!fetched) {
          toast.error("Produk tidak ditemukan");
          setLiveMessage("Produk tidak ditemukan.");
          return;
        }

        product = {
          id: fetched.id,
          name: fetched.name,
          sku: fetched.sku,
          barcode: code,
          price: fetched.price,
        };
        void cacheProducts([product]);
      }

      setCart((prev) => {
        const existing = prev.find((item) => item.productId === product!.id);
        if (existing) {
          return prev.map((item) =>
            item.productId === product!.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [
          ...prev,
          {
            productId: product!.id,
            name: product!.name,
            price: product!.price,
            quantity: 1,
            discount: 0,
          },
        ];
      });

      setBarcode("");
      setLiveMessage(`${product.name} ditambahkan ke keranjang.`);
      barcodeInputRef.current?.focus();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menambahkan produk");
      setLiveMessage("Gagal menambahkan produk.");
    }
  }, [barcode, productLookup]);

  const updateItemQuantity = useCallback((productId: string, quantity: number) => {
    const safeQuantity = Number.isNaN(quantity) ? 1 : quantity;
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(safeQuantity, 1) }
          : item,
      ),
    );
  }, []);

  const updateItemDiscount = useCallback((productId: string, discount: number) => {
    const safeDiscount = Number.isNaN(discount) ? 0 : discount;
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, discount: Math.max(safeDiscount, 0) }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const handleManualDiscountChange = (value: number) => {
    const safeValue = Math.max(value, 0);
    if (totals.totalGross === 0) {
      setManualDiscount(safeValue);
      return;
    }
    const limitValue = (totals.totalGross * DISCOUNT_LIMIT_PERCENT) / 100;
    if (safeValue > limitValue) {
      toast.warning(
        `Diskon tambahan dibatasi ${DISCOUNT_LIMIT_PERCENT}% dari total.`,
      );
      setManualDiscount(limitValue);
      setLiveMessage("Diskon tambahan disesuaikan dengan batas toko.");
      return;
    }
    setManualDiscount(safeValue);
  };

  const openPaymentDialog = useCallback(() => {
    if (!activeOutletId) {
      toast.error("Pilih outlet terlebih dahulu");
      return;
    }
    if (cart.length === 0) {
      toast.error("Keranjang masih kosong");
      return;
    }
    const isNonCash = paymentMethod !== DEFAULT_PAYMENT_METHOD;
    const trimmedReference = paymentReference.trim();
    if (isNonCash && !trimmedReference) {
      toast.error("Masukkan referensi pembayaran non-tunai");
      return;
    }

    const receiptNumber = `POS-${Date.now()}`;
    setReceiptPreview({
      receiptNumber,
      soldAt: new Date(),
      paymentMethod,
      paymentReference: isNonCash ? trimmedReference : undefined,
    });
    setCheckoutState("review");
    setPaymentDialogOpen(true);
  }, [activeOutletId, cart.length, paymentMethod, paymentReference]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        barcodeInputRef.current?.focus();
      }
      if (event.key === "F2") {
        event.preventDefault();
        openPaymentDialog();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (cart.length) {
          setCart([]);
          setManualDiscount(0);
          toast.info("Keranjang dikosongkan");
          setLiveMessage("Keranjang dikosongkan.");
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart.length, openPaymentDialog]);

  const finalizeCheckout = useCallback(async () => {
    if (!activeOutletId || !receiptPreview) {
      toast.error("Outlet atau data struk belum siap");
      return;
    }

    const isNonCash = paymentMethod !== DEFAULT_PAYMENT_METHOD;

    try {
      const sale = await recordSale.mutateAsync({
        outletId: activeOutletId,
        receiptNumber: receiptPreview.receiptNumber,
        discountTotal: manualDiscount,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount,
        })),
        payments: [
          {
            method: paymentMethod,
            amount: totals.totalNet,
            reference: isNonCash ? paymentReference.trim() : undefined,
          },
        ],
      });

      const receipt = await printReceipt.mutateAsync({ saleId: sale.id });
      const byteCharacters = atob(receipt.base64);
      const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0));
      const file = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(file);
      setReceiptUrl(url);

      setCart([]);
      setManualDiscount(0);
      setPaymentMethod(DEFAULT_PAYMENT_METHOD);
      setPaymentReference("");
      barcodeInputRef.current?.focus();
      setCheckoutState("success");
      toast.success("Transaksi tersimpan");
      setLiveMessage(`Transaksi ${receiptPreview.receiptNumber} berhasil.`);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyelesaikan transaksi");
      setLiveMessage("Gagal menyelesaikan transaksi.");
    }
  }, [
    activeOutletId,
    receiptPreview,
    paymentMethod,
    recordSale,
    manualDiscount,
    cart,
    totals.totalNet,
    printReceipt,
    paymentReference,
  ]);

  const downloadReceipt = () => {
    if (!receiptUrl || !receiptPreview) return;
    const link = document.createElement("a");
    link.href = receiptUrl;
    link.download = `${receiptPreview.receiptNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openReceipt = () => {
    if (!receiptUrl) return;
    window.open(receiptUrl, "_blank", "noopener");
  };

  return (
    <div className="space-y-6">
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>

      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Modul Kasir
            </p>
            <h1 className="text-3xl font-semibold text-foreground">
              {activeOutlet?.name ?? "Outlet belum dipilih"}
            </h1>
            <p className="text-muted-foreground">
              {isExpressMode ? "Mode cepat: Scan barcode dan checkout otomatis." : "Fokus ke input barcode dengan Ctrl+K, tambah item dengan F1, buka pembayaran dengan F2."}
            </p>
          </div>
          <Button
            variant={isExpressMode ? "default" : "outline"}
            onClick={() => setIsExpressMode(!isExpressMode)}
          >
            {isExpressMode ? "Mode Normal" : "Mode Cepat"}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="h-full">
          <CardHeader className="space-y-3 border-b bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Scan & Keranjang</CardTitle>
                <CardDescription>
                  Input cepat, validasi diskon otomatis.
                </CardDescription>
              </div>
              <div className="flex flex-col text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Shortcut</span>
                <span>F1 tambah baris · F2 bayar · Esc batal</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:items-end">
              <div className="grid gap-1.5">
                <Label htmlFor="outlet">Outlet Aktif</Label>
                <select
                  id="outlet"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={activeOutletId ?? ""}
                  onChange={(event) => setActiveOutlet(event.target.value)}
                >
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="barcode">Scan / Cari Produk</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="barcode"
                    ref={barcodeInputRef}
                    value={barcode}
                    onChange={(event) => setBarcode(event.target.value)}
                    placeholder="Scan barcode atau ketik nama produk"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void addProductToCart();
                      }
                    }}
                    aria-describedby="scan-helper"
                  />
                  <Button
                    className="sm:w-auto"
                    onClick={() => void addProductToCart()}
                  >
                    Tambah (F1)
                  </Button>
                </div>
                <p id="scan-helper" className="text-xs text-muted-foreground">
                  Ctrl+K untuk fokus cepat ke input scan.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table className="[&_tbody]:block [&_tbody]:max-h-[340px] [&_tbody]:overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Produk</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-28 text-right">Harga</TableHead>
                    <TableHead className="w-28 text-right">Diskon</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-20 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <MotionTableBody>
                  {cart.map((item) => (
                    <MotionTableRow key={item.productId} className="border-b">
                      <TableCell className="font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItemQuantity(
                              item.productId,
                              Number(event.target.value),
                            )
                          }
                          className="h-9 text-right"
                          aria-label={`Jumlah untuk ${item.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={item.discount}
                          onChange={(event) =>
                            updateItemDiscount(
                              item.productId,
                              Number(event.target.value),
                            )
                          }
                          className="h-9 text-right"
                          aria-label={`Diskon untuk ${item.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          item.price * item.quantity - item.discount,
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.productId)}
                        >
                          Hapus
                        </Button>
                      </TableCell>
                    </MotionTableRow>
                  ))}
                  {cart.length === 0 && (
                    <MotionTableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground"
                      >
                        Keranjang kosong. Scan barcode atau cari produk.
                      </TableCell>
                    </MotionTableRow>
                  )}
                </MotionTableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Ringkasan Pembayaran</CardTitle>
              <CardDescription>
                Hierarki total membantu kasir menutup transaksi cepat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">Subtotal (H3)</span>
                  <span>{formatCurrency(totals.totalGross)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Diskon Item</span>
                  <span>- {formatCurrency(totals.itemDiscounts)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span>Diskon Tambahan</span>
                    <Input
                      type="number"
                      min={0}
                      value={manualDiscount}
                      onChange={(event) =>
                        handleManualDiscountChange(
                          Number(event.target.value || 0),
                        )
                      }
                      className="h-9 w-32 text-right"
                      aria-describedby="manual-discount-helper"
                    />
                  </div>
                  <p
                    id="manual-discount-helper"
                    className="text-xs text-muted-foreground"
                  >
                    Diskon maksimal mengikuti kebijakan toko:{" "}
                    {DISCOUNT_LIMIT_PERCENT}%
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-dashed pt-3 text-lg font-semibold text-foreground">
                  <span>Total Dibayar (H2)</span>
                  <span>{formatCurrency(totals.totalNet)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Metode Pembayaran
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Tunai", value: DEFAULT_PAYMENT_METHOD },
                      { label: "Non-Tunai (QRIS)", value: QRIS_PAYMENT_METHOD },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={
                          paymentMethod === option.value ? "default" : "outline"
                        }
                        className={cn(
                          "justify-start",
                          paymentMethod === option.value
                            ? ""
                            : "bg-muted/40 text-muted-foreground",
                        )}
                        onClick={() => setPaymentMethod(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  {paymentMethod !== DEFAULT_PAYMENT_METHOD && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="payment-reference" className="text-xs">
                        Referensi Pembayaran
                      </Label>
                      <Input
                        id="payment-reference"
                        placeholder="Masukkan nomor referensi"
                        value={paymentReference}
                        onChange={(event) =>
                          setPaymentReference(event.target.value)
                        }
                        className="h-9"
                      />
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="w-fit">
                  {paymentMethod === DEFAULT_PAYMENT_METHOD
                    ? "Pembayaran: Tunai"
                    : `Pembayaran: Non-Tunai${
                        paymentReference.trim()
                          ? ` · Ref ${paymentReference.trim()}`
                          : ""
                      }`}
                </Badge>
              </div>

              <Dialog
                open={isPaymentDialogOpen}
                onOpenChange={(open) => {
                  setPaymentDialogOpen(open);
                  if (!open) {
                    setReceiptPreview(null);
                    setCheckoutState("idle");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={openPaymentDialog}
                  >
                    Tinjau Pembayaran (F2)
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="space-y-2">
                    <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
                    <DialogDescription>
                      Pastikan detail transaksi sebelum memproses.
                    </DialogDescription>
                  </DialogHeader>

                  {checkoutState === "review" && receiptPreview && (
                    <div className="space-y-4">
                      <section className="rounded-lg border bg-muted/20 p-4 text-sm">
                        <h2 className="text-base font-semibold text-foreground">
                          {activeOutlet?.name}
                        </h2>
                        <p className="text-muted-foreground">
                          Total bayar:{" "}
                          <span className="font-semibold text-foreground">
                            {formatCurrency(totals.totalNet)}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          Metode:{" "}
                          <span className="font-semibold text-foreground">
                            {paymentMethod === DEFAULT_PAYMENT_METHOD
                              ? "Tunai"
                              : "QRIS / Non-Tunai"}
                          </span>
                          {receiptPreview.paymentReference
                            ? ` · Ref ${receiptPreview.paymentReference}`
                            : ""}
                        </p>
                      </section>

                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Preview Struk
                          </h3>
                          <div className="flex gap-2">
                            {(["58", "80"] as const).map((size) => (
                              <Button
                                key={size}
                                variant={
                                  receiptWidth === size ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setReceiptWidth(size)}
                              >
                                {size} mm
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "mx-auto rounded-lg border border-dashed bg-white p-6 text-xs text-foreground shadow-sm",
                            RECEIPT_WIDTH_CLASS[receiptWidth],
                          )}
                        >
                          <div className="space-y-2 text-center">
                            <p className="text-sm font-semibold uppercase tracking-wide">
                              {activeOutlet?.name}
                            </p>
                            <p className="text-muted-foreground">
                              NPWP: {STORE_NPWP}
                            </p>
                            <p className="text-muted-foreground">
                              {receiptPreview.receiptNumber}
                            </p>
                            <p className="text-muted-foreground">
                              {receiptPreview.soldAt.toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div className="my-4 border-t border-dashed" />
                          <div className="space-y-2">
                            {cart.map((item) => (
                              <div
                                key={item.productId}
                                className="flex justify-between"
                              >
                                <span>
                                  {item.name} × {item.quantity}
                                </span>
                                <span>
                                  {formatCurrency(
                                    item.price * item.quantity - item.discount,
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="my-4 border-t border-dashed" />
                          <div className="space-y-1 text-sm font-semibold">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span>{formatCurrency(totals.totalGross)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Diskon</span>
                              <span>
                                -{formatCurrency(totals.totalDiscount)}
                              </span>
                            </div>
                            <div className="flex justify-between text-base">
                              <span>Total</span>
                              <span>{formatCurrency(totals.totalNet)}</span>
                            </div>
                          </div>
                          {receiptQr && (
                            <div className="mt-4 flex flex-col items-center gap-2 text-center text-[10px] text-muted-foreground">
                              <Image
                                src={receiptQr}
                                alt="QR Nomor Struk"
                                width={96}
                                height={96}
                                className="h-24 w-24"
                                unoptimized
                              />
                              <span>Scan untuk detail struk</span>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  )}

                  {checkoutState === "success" && receiptPreview && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                        Pembayaran berhasil. Pilih tindakan untuk struk.
                      </div>
                      <div
                        className={cn(
                          "mx-auto rounded-lg border border-dashed bg-white p-6 text-xs shadow-sm",
                          RECEIPT_WIDTH_CLASS[receiptWidth],
                        )}
                      >
                        <p className="text-center text-sm font-semibold text-foreground">
                          {receiptPreview.receiptNumber}
                        </p>
                        <p className="text-center text-muted-foreground">
                          {receiptPreview.soldAt.toLocaleString("id-ID")}
                        </p>
                        <p className="mt-2 text-center text-muted-foreground">
                          Total {formatCurrency(totals.totalNet)}
                        </p>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="gap-2 pt-2">
                    {checkoutState === "review" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPaymentDialogOpen(false)}
                        >
                          Batal
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void finalizeCheckout()}
                          disabled={recordSale.isPending || printReceipt.isPending}
                        >
                          {recordSale.isPending || printReceipt.isPending
                            ? "Memproses..."
                            : "Proses Pembayaran"}
                        </Button>
                      </>
                    )}
                    {checkoutState === "success" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={downloadReceipt}
                          disabled={!receiptUrl}
                        >
                          Unduh PDF
                        </Button>
                        <Button
                          type="button"
                          onClick={openReceipt}
                          disabled={!receiptUrl}
                        >
                          Cetak Langsung
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setPaymentDialogOpen(false)}
                        >
                          Tutup
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terakhir</CardTitle>
            <CardDescription>
              Refund atau void dengan ringkasan stok yang kembali.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {recentSales.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat transaksi…
              </div>
            ) : recentSales.isError ? (
              <div className="space-y-2 text-sm text-destructive">
                <p>Gagal memuat transaksi terbaru.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => recentSales.refetch()}
                >
                  Coba lagi
                </Button>
              </div>
            ) : (recentSales.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Belum ada transaksi yang tercatat.
              </div>
            ) : (
              <div className="space-y-3">
                {(recentSales.data ?? []).map((sale) => {
                  const formattedTotal = formatCurrency(sale.totalNet);
                  const isActionAvailable = sale.status === "COMPLETED";
                  const statusLabel = (() => {
                    switch (sale.status) {
                      case "VOIDED":
                        return "Void";
                      case "REFUNDED":
                        return "Refund";
                      default:
                        return "Selesai";
                    }
                  })();

                  return (
                    <div
                      key={sale.id}
                      className="rounded-lg border border-dashed border-border bg-muted/10 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {sale.receiptNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sale.soldAt).toLocaleString("id-ID")} · {sale.totalItems} item · {formattedTotal}
                          </p>
                          {sale.status !== "COMPLETED" ? (
                            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
                              Status: {statusLabel}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={!isActionAvailable || isProcessingAfterSales}
                            onClick={() => openAfterSalesDialog(sale, "refund")}
                          >
                            Refund
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!isActionAvailable || isProcessingAfterSales}
                            onClick={() => openAfterSalesDialog(sale, "void")}
                          >
                            Void
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tips Operasional</CardTitle>
            <CardDescription>
              Micro-interaction yang membantu kasir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>• Pastikan SKU populer di-pin di rak untuk scan cepat.</p>
            <p>• Gunakan shortcut F2 untuk mengurangi waktu antrian.</p>
            <p>• Konfirmasi refund/void hanya setelah cek stok fisik.</p>
          </CardContent>
        </Card>
      </div>
    </div>

      <Dialog
        open={Boolean(afterSalesAction)}
        onOpenChange={(open) => {
          if (!open) {
            closeAfterSalesDialog();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          {afterSalesAction ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {afterSalesAction.type === "void"
                    ? "Konfirmasi Void Transaksi"
                    : "Konfirmasi Refund Transaksi"}
                </DialogTitle>
                <DialogDescription>
                  Tinjau ringkasan stok dan catatan sebelum melanjutkan.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <section className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {afterSalesAction.sale.receiptNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(afterSalesAction.sale.soldAt).toLocaleString("id-ID")} · {afterSalesAction.sale.totalItems} item · {formatCurrency(afterSalesAction.sale.totalNet)}
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Stok yang dikembalikan
                  </h4>
                  <ul className="space-y-1 rounded-md border border-dashed bg-muted/10 p-3 text-xs">
                    {afterSalesAction.sale.items.map((item) => (
                      <li key={`${afterSalesAction.sale.id}-${item.productName}`} className="flex justify-between gap-3">
                        <span>{item.productName}</span>
                        <span className="font-medium">× {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  {(() => {
                    const restockCount = afterSalesAction.sale.items.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    );
                    const refundLabel = formatCurrency(afterSalesAction.sale.totalNet);
                    return (
                      <p className="text-xs text-muted-foreground">
                        {afterSalesAction.type === "void"
                          ? `Void akan mengembalikan ${restockCount} item ke stok dan menandai transaksi sebagai void.`
                          : `Refund akan mengembalikan ${restockCount} item ke stok dan mencatat pengembalian dana sebesar ${refundLabel}.`}
                      </p>
                    );
                  })()}
                </section>

                <section className="space-y-1">
                  <Label htmlFor="after-sales-note" className="text-xs font-semibold text-muted-foreground">
                    Catatan (opsional)
                  </Label>
                  <textarea
                    id="after-sales-note"
                    value={afterSalesAction.note}
                    onChange={(event) => updateAfterSalesNote(event.target.value)}
                    className="h-20 w-full rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Contoh: disetujui supervisor atau alasan pengembalian"
                  />
                </section>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeAfterSalesDialog}
                  disabled={isProcessingAfterSales}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant={afterSalesAction.type === "void" ? "ghost" : "default"}
                  onClick={() => void handleConfirmAfterSales()}
                  disabled={isProcessingAfterSales}
                >
                  {isProcessingAfterSales
                    ? "Memproses..."
                    : afterSalesAction.type === "void"
                      ? "Lanjutkan Void"
                      : "Lanjutkan Refund"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
