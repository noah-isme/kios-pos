"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const sampleProducts = [
  { id: "demo-1", name: "Kopi Botol 250ml", barcode: "899999000001", price: 18000 },
  { id: "demo-2", name: "Susu Almond 1L", barcode: "899999000002", price: 42000 },
  { id: "demo-3", name: "Keripik Singkong Pedas", barcode: "899999000003", price: 15000 },
];

type DemoCartItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

export default function DemoCashierPage() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<DemoCartItem[]>([
    { productId: "demo-1", name: "Kopi Botol 250ml", quantity: 2, price: 18000 },
  ]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    return {
      subtotal,
      total: subtotal,
    };
  }, [cart]);

  const appendProduct = (product: (typeof sampleProducts)[number]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const handleAdd = () => {
    const keyword = barcode.trim();
    if (!keyword) return;
    const product = sampleProducts.find(
      (item) =>
        item.barcode === keyword ||
        item.name.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (!product) {
      setBarcode("");
      return;
    }
    appendProduct(product);
    setBarcode("");
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Demo Read-only
        </p>
        <h1 className="text-3xl font-semibold text-foreground">Kasir</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Coba alur kasir tanpa login. Data bersifat mock dan tidak disimpan.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Scan & Keranjang</CardTitle>
            <CardDescription>
              Ketik barcode demo (contoh: 899999000001) atau pilih dari daftar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="grid gap-1.5">
                <label htmlFor="barcode" className="text-sm font-medium text-foreground">
                  Input Barcode
                </label>
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="Scan barcode demo atau ketik nama produk"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAdd();
                    }
                  }}
                />
              </div>
              <Button onClick={handleAdd}>Tambah ke Keranjang</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {sampleProducts.map((product) => (
                <Button
                  key={product.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => appendProduct(product)}
                >
                  {product.name}
                </Button>
              ))}
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table className="[&_tbody]:block [&_tbody]:max-h-[320px] [&_tbody]:overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background">
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-32 text-right">Harga</TableHead>
                    <TableHead className="w-32 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <MotionTableBody>
                  {cart.map((item) => (
                    <MotionTableRow key={item.productId} className="border-b">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </TableCell>
                    </MotionTableRow>
                  ))}
                  {cart.length === 0 && (
                    <MotionTableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-sm text-muted-foreground"
                      >
                        Keranjang kosong. Gunakan tombol cepat di atas.
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
            <CardTitle>Ringkasan Pembayaran</CardTitle>
            <CardDescription>Simulasi total bayar kasir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed pt-2 text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit">
              Mode demo · Tidak ada transaksi nyata
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
