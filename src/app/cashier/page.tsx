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

export default function CashierPage() {
  const { data: outlets } = api.outlets.list.useQuery();
  const [selectedOutlet, setSelectedOutlet] = useState<string | undefined>();
  const [barcode, setBarcode] = useState("");
  const [manualDiscount, setManualDiscount] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);

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
        payments: [
          {
            method: PaymentMethod.CASH,
            amount: totals.totalNet,
          },
        ],
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
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan transaksi");
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
              <Badge variant="secondary" className="w-fit">
                Pembayaran: Tunai (mock)
              </Badge>
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
        </div>
      </div>
    </div>
  );
}
