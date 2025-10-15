"use client";

import { useEffect, useMemo, useState } from "react";

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

type DemoProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplier: string;
  price: number;
  stock: number;
};

const demoProducts: DemoProduct[] = [
  {
    id: "p-1",
    sku: "SKU-AL-001",
    name: "Almond Milk 1L",
    category: "Beverage",
    supplier: "Healthy Co",
    price: 42000,
    stock: 36,
  },
  {
    id: "p-2",
    sku: "SKU-KP-004",
    name: "Keripik Pisang Manis",
    category: "Snack",
    supplier: "UMKM Nusantara",
    price: 18000,
    stock: 58,
  },
  {
    id: "p-3",
    sku: "SKU-KO-009",
    name: "Kopi Drip Arabica",
    category: "Beverage",
    supplier: "Roastery 88",
    price: 35000,
    stock: 12,
  },
  {
    id: "p-4",
    sku: "SKU-SB-007",
    name: "Sambal Matah Ready",
    category: "Grocery",
    supplier: "UMKM Nusantara",
    price: 24000,
    stock: 24,
  },
];

const columnConfig = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Nama Produk" },
  { key: "category", label: "Kategori" },
  { key: "supplier", label: "Supplier" },
  { key: "price", label: "Harga" },
  { key: "stock", label: "Stok" },
] as const;

const STORAGE_KEY = "kios-pos:demo-products-columns";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

type ColumnKey = (typeof columnConfig)[number]["key"];

export default function DemoProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    sku: true,
    name: true,
    category: true,
    supplier: true,
    price: true,
    stock: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Record<ColumnKey, boolean>;
      setVisibleColumns((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const filteredProducts = useMemo(() => {
    return demoProducts.filter((product) => {
      const matchSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "all" || product.category === category;
      const matchSupplier = supplier === "all" || product.supplier === supplier;
      return matchSearch && matchCategory && matchSupplier;
    });
  }, [search, category, supplier]);

  const uniqueCategories = ["all", ...new Set(demoProducts.map((product) => product.category))];
  const uniqueSuppliers = ["all", ...new Set(demoProducts.map((product) => product.supplier))];

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const exportCsv = () => {
    const header = columnConfig
      .filter((column) => visibleColumns[column.key])
      .map((column) => column.label);
    const rows = filteredProducts
      .map((product) =>
        columnConfig
          .filter((column) => visibleColumns[column.key])
          .map((column) => {
            if (column.key === "price") {
              return product.price.toString();
            }
            return String(product[column.key]);
          })
          .join(","),
      )
      .join("\n");

    const csvContent = [header.join(","), rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kios-pos-demo-products.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Demo Read-only
        </p>
        <h1 className="text-3xl font-semibold text-foreground">Manajemen Produk</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Kustomisasi tabel dengan sticky header, filter, dan ekspor CSV. Preferensi kolom
          tersimpan di browser Anda.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Toolbar</CardTitle>
          <CardDescription>
            Cari, filter, dan ekspor. Semua interaksi tetap di sisi client.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(0,240px)_minmax(0,180px)_minmax(0,180px)] lg:items-end lg:gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cari produk</label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nama atau SKU…"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Kategori</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {uniqueCategories.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "Semua kategori" : value}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Supplier</label>
              <select
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {uniqueSuppliers.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "Semua supplier" : value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {columnConfig.map((column) => (
              <Button
                key={column.key}
                variant={visibleColumns[column.key] ? "secondary" : "outline"}
                size="sm"
                onClick={() => toggleColumn(column.key)}
              >
                {visibleColumns[column.key] ? "✓" : "○"} {column.label}
              </Button>
            ))}
            <Button variant="default" size="sm" onClick={exportCsv}>
              Ekspor CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk</CardTitle>
          <CardDescription>Sticky header & kolom yang bisa disembunyikan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-md border">
            <Table className="[&_tbody]:block [&_tbody]:max-h-[360px] [&_tbody]:overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background">
              <TableHeader>
                <TableRow>
                  {columnConfig
                    .filter((column) => visibleColumns[column.key])
                    .map((column) => (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <MotionTableBody>
                {filteredProducts.map((product) => (
                  <MotionTableRow key={product.id} className="border-b">
                    {columnConfig
                      .filter((column) => visibleColumns[column.key])
                      .map((column) => {
                        const value = product[column.key];
                        return (
                          <TableCell key={column.key}>
                            {column.key === "price"
                              ? formatCurrency(value as number)
                              : value}
                          </TableCell>
                        );
                      })}
                  </MotionTableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <MotionTableRow>
                    <TableCell colSpan={columnConfig.length} className="py-10 text-center text-sm text-muted-foreground">
                      Belum ada produk sesuai filter.{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        onClick={() => {
                          setCategory("all");
                          setSupplier("all");
                          setSearch("");
                        }}
                      >
                        Reset filter
                      </button>{" "}
                      atau{" "}
                      <span className="font-medium text-primary">Impor CSV</span>.
                    </TableCell>
                  </MotionTableRow>
                )}
              </MotionTableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Klik nama kolom di toolbar untuk menyembunyikan/menampilkan. Preferensi tersimpan otomatis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

