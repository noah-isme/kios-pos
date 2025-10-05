"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/client";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(value);

export default function StockManagementPage() {
  const { data: outlets } = api.outlets.list.useQuery();
  const [selectedOutlet, setSelectedOutlet] = useState("");

  useEffect(() => {
    if (!selectedOutlet && outlets?.length) {
      setSelectedOutlet(outlets[0]?.id ?? "");
    }
  }, [outlets, selectedOutlet]);

  const productsQuery = api.products.list.useQuery({ take: 100 });
  const inventoryQuery = api.outlets.getStockSnapshot.useQuery(
    { outletId: selectedOutlet },
    { enabled: Boolean(selectedOutlet) },
  );

  const adjustStock = api.outlets.adjustStock.useMutation();
  const transferStock = api.outlets.transferStock.useMutation();
  const performOpname = api.outlets.performOpname.useMutation();

  const [adjustForm, setAdjustForm] = useState({ productId: "", quantity: 0, note: "" });
  const [transferForm, setTransferForm] = useState({
    productId: "",
    fromOutletId: "",
    toOutletId: "",
    quantity: 0,
    note: "",
  });
  const [opnameForm, setOpnameForm] = useState({ productId: "", countedQuantity: 0, note: "" });

  useEffect(() => {
    if (selectedOutlet) {
      setTransferForm((state) => ({ ...state, fromOutletId: selectedOutlet }));
    }
  }, [selectedOutlet]);

  const productOptions = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const resetForms = () => {
    setAdjustForm({ productId: "", quantity: 0, note: "" });
    setTransferForm((state) => ({ ...state, productId: "", quantity: 0, note: "" }));
    setOpnameForm({ productId: "", countedQuantity: 0, note: "" });
  };

  const handleAdjust = async () => {
    if (!selectedOutlet || !adjustForm.productId) {
      toast.error("Pilih outlet dan produk terlebih dahulu");
      return;
    }

    if (Number(adjustForm.quantity) === 0) {
      toast.error("Jumlah penyesuaian tidak boleh 0");
      return;
    }

    try {
      await adjustStock.mutateAsync({
        outletId: selectedOutlet,
        productId: adjustForm.productId,
        quantity: Number(adjustForm.quantity),
        note: adjustForm.note || undefined,
      });
      toast.success("Penyesuaian stok berhasil");
      await inventoryQuery.refetch();
      resetForms();
    } catch (error) {
      console.error(error);
      toast.error("Gagal melakukan penyesuaian stok");
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.productId || !transferForm.fromOutletId || !transferForm.toOutletId) {
      toast.error("Lengkapi outlet asal, tujuan, dan produk");
      return;
    }

    if (Number(transferForm.quantity) <= 0) {
      toast.error("Jumlah transfer harus lebih dari 0");
      return;
    }

    try {
      await transferStock.mutateAsync({
        productId: transferForm.productId,
        fromOutletId: transferForm.fromOutletId,
        toOutletId: transferForm.toOutletId,
        quantity: Number(transferForm.quantity),
        note: transferForm.note || undefined,
      });
      toast.success("Transfer stok berhasil");
      await inventoryQuery.refetch();
      resetForms();
    } catch (error) {
      console.error(error);
      toast.error("Gagal melakukan transfer stok");
    }
  };

  const handleOpname = async () => {
    if (!selectedOutlet || !opnameForm.productId) {
      toast.error("Pilih outlet dan produk untuk opname");
      return;
    }

    if (Number(opnameForm.countedQuantity) < 0) {
      toast.error("Qty hasil hitung tidak valid");
      return;
    }

    try {
      await performOpname.mutateAsync({
        outletId: selectedOutlet,
        entries: [
          {
            productId: opnameForm.productId,
            countedQuantity: Number(opnameForm.countedQuantity),
            note: opnameForm.note || undefined,
          },
        ],
      });
      toast.success("Opname stok tersimpan");
      await inventoryQuery.refetch();
      resetForms();
    } catch (error) {
      console.error(error);
      toast.error("Gagal melakukan opname");
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Manajemen Stok</h1>
        <p className="text-muted-foreground">
          Pantau pergerakan stok, lakukan penyesuaian, transfer antar outlet, dan opname berkala.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Stok Outlet</CardTitle>
          <CardDescription>Pilih outlet untuk melihat ringkasan stok terkini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="inventory-outlet">Outlet</Label>
            <select
              id="inventory-outlet"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedOutlet}
              onChange={(event) => setSelectedOutlet(event.target.value)}
            >
              <option value="">Pilih outlet</option>
              {outlets?.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryQuery.data?.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell className="font-medium">{row.productName}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                </TableRow>
              ))}
              {inventoryQuery.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Belum ada data stok untuk outlet ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Penyesuaian Cepat</CardTitle>
            <CardDescription>Tambah atau kurangi stok karena kerusakan, bonus, atau koreksi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2">
              <Label htmlFor="adjust-product">Produk</Label>
              <select
                id="adjust-product"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={adjustForm.productId}
                onChange={(event) => setAdjustForm((state) => ({ ...state, productId: event.target.value }))}
              >
                <option value="">Pilih produk</option>
                {productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjust-quantity">Perubahan Qty</Label>
              <Input
                id="adjust-quantity"
                type="number"
                value={adjustForm.quantity}
                onChange={(event) =>
                  setAdjustForm((state) => ({ ...state, quantity: Number(event.target.value) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjust-note">Catatan</Label>
              <textarea
                id="adjust-note"
                value={adjustForm.note}
                onChange={(event) => setAdjustForm((state) => ({ ...state, note: event.target.value }))}
                className="min-h-[70px] rounded-md border border-input bg-background px-3 py-2"
                placeholder="Contoh: koreksi stok akhir hari"
              />
            </div>
            <Button className="w-full" onClick={() => void handleAdjust()} disabled={adjustStock.isLoading}>
              {adjustStock.isLoading ? "Menyimpan..." : "Simpan Penyesuaian"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transfer Antar Outlet</CardTitle>
            <CardDescription>Catat perpindahan stok antar cabang atau gudang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2">
              <Label htmlFor="transfer-product">Produk</Label>
              <select
                id="transfer-product"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={transferForm.productId}
                onChange={(event) => setTransferForm((state) => ({ ...state, productId: event.target.value }))}
              >
                <option value="">Pilih produk</option>
                {productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transfer-from">Outlet Asal</Label>
              <select
                id="transfer-from"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={transferForm.fromOutletId}
                onChange={(event) =>
                  setTransferForm((state) => ({ ...state, fromOutletId: event.target.value }))
                }
              >
                <option value="">Pilih outlet asal</option>
                {outlets?.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transfer-to">Outlet Tujuan</Label>
              <select
                id="transfer-to"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={transferForm.toOutletId}
                onChange={(event) => setTransferForm((state) => ({ ...state, toOutletId: event.target.value }))}
              >
                <option value="">Pilih outlet tujuan</option>
                {outlets?.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transfer-quantity">Jumlah</Label>
              <Input
                id="transfer-quantity"
                type="number"
                min={1}
                value={transferForm.quantity}
                onChange={(event) =>
                  setTransferForm((state) => ({ ...state, quantity: Number(event.target.value) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transfer-note">Catatan</Label>
              <textarea
                id="transfer-note"
                value={transferForm.note}
                onChange={(event) => setTransferForm((state) => ({ ...state, note: event.target.value }))}
                className="min-h-[70px] rounded-md border border-input bg-background px-3 py-2"
                placeholder="Contoh: mutasi stok ke cabang B"
              />
            </div>
            <Button className="w-full" onClick={() => void handleTransfer()} disabled={transferStock.isLoading}>
              {transferStock.isLoading ? "Memproses..." : "Transfer Stok"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Opname</CardTitle>
            <CardDescription>Rekonsiliasi jumlah fisik dengan sistem secara berkala.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2">
              <Label htmlFor="opname-product">Produk</Label>
              <select
                id="opname-product"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={opnameForm.productId}
                onChange={(event) => setOpnameForm((state) => ({ ...state, productId: event.target.value }))}
              >
                <option value="">Pilih produk</option>
                {productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opname-quantity">Qty Hasil Hitung</Label>
              <Input
                id="opname-quantity"
                type="number"
                min={0}
                value={opnameForm.countedQuantity}
                onChange={(event) =>
                  setOpnameForm((state) => ({ ...state, countedQuantity: Number(event.target.value) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opname-note">Catatan</Label>
              <textarea
                id="opname-note"
                value={opnameForm.note}
                onChange={(event) => setOpnameForm((state) => ({ ...state, note: event.target.value }))}
                className="min-h-[70px] rounded-md border border-input bg-background px-3 py-2"
                placeholder="Contoh: hasil hitung ulang malam"
              />
            </div>
            <Button className="w-full" onClick={() => void handleOpname()} disabled={performOpname.isLoading}>
              {performOpname.isLoading ? "Menyimpan..." : "Simpan Opname"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
