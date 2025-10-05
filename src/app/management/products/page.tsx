"use client";

import { useMemo, useState } from "react";
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function ProductManagementPage() {
  const [search, setSearch] = useState("");
  const productsQuery = api.products.list.useQuery({ search });
  const upsertProduct = api.products.upsert.useMutation();
  const categoriesQuery = api.products.categories.useQuery();

  const [formState, setFormState] = useState({
    id: "",
    name: "",
    sku: "",
    barcode: "",
    price: 0,
    categoryId: "",
    costPrice: 0,
  });

  const resetForm = () => {
    setFormState({ id: "", name: "", sku: "", barcode: "", price: 0, categoryId: "", costPrice: 0 });
  };

  const handleSubmit = async () => {
    if (!formState.name || !formState.sku) return;

    try {
      await upsertProduct.mutateAsync({
        id: formState.id || undefined,
        name: formState.name,
        sku: formState.sku,
        barcode: formState.barcode || undefined,
        price: Number(formState.price || 0),
        costPrice: Number(formState.costPrice || 0),
        categoryId: formState.categoryId || undefined,
        isActive: true,
      });

      await productsQuery.refetch();
      toast.success("Produk tersimpan");
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan produk");
    }
  };

  const editingProduct = useMemo(
    () => productsQuery.data?.find((product) => product.id === formState.id),
    [productsQuery.data, formState.id],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Manajemen Produk</h1>
        <p className="text-muted-foreground">
          Sinkronkan SKU, barcode, dan harga untuk memastikan katalog kasir selalu up to date.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Produk</CardTitle>
            <CardDescription>Tampilkan produk aktif beserta harga jual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Cari nama, SKU, atau barcode"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsQuery.data?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.barcode ?? "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setFormState({
                            id: product.id,
                            name: product.name,
                            sku: product.sku,
                            barcode: product.barcode ?? "",
                            price: product.price,
                            categoryId: product.categoryId ?? "",
                            costPrice: product.costPrice ?? 0,
                          })
                        }
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {productsQuery.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Belum ada produk yang sesuai filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingProduct ? "Ubah Produk" : "Tambah Produk"}</CardTitle>
            <CardDescription>Data otomatis tersimpan ke Supabase melalui Prisma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Produk</Label>
              <Input
                id="name"
                value={formState.name}
                onChange={(event) => setFormState((state) => ({ ...state, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formState.sku}
                onChange={(event) => setFormState((state) => ({ ...state, sku: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formState.barcode}
                onChange={(event) => setFormState((state) => ({ ...state, barcode: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Harga Jual</Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={formState.price}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, price: Number(event.target.value || 0) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="costPrice">Harga Pokok (opsional)</Label>
              <Input
                id="costPrice"
                type="number"
                min={0}
                value={formState.costPrice}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, costPrice: Number(event.target.value || 0) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Kategori</Label>
              <select
                id="category"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={formState.categoryId}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, categoryId: event.target.value }))
                }
              >
                <option value="">Pilih kategori</option>
                {categoriesQuery.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void handleSubmit()} disabled={upsertProduct.isLoading}>
                {upsertProduct.isLoading ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
