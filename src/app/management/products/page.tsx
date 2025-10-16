"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { MotionButton as Button } from "@/components/ui/button";
import { useUndoToast } from "@/components/ui/undo-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { listVariants, rowVariant, fadeVariant } from "@/components/ui/motion-variants";
import MotionList, { MotionItem } from "@/components/ui/motion-list";

const MotionTbody = motion.tbody;
const MotionTr = motion.tr;
const MotionDiv = motion.div;
import { api } from "@/trpc/client";

const PRODUCT_COLUMNS = [
  { key: "name", label: "Nama", align: "left" },
  { key: "sku", label: "SKU", align: "left" },
  { key: "barcode", label: "Barcode", align: "left" },
  { key: "supplier", label: "Supplier", align: "left" },
  { key: "price", label: "Harga", align: "right" },
  { key: "discount", label: "Diskon", align: "right" },
  { key: "promo", label: "Promo", align: "right" },
  { key: "tax", label: "PPN", align: "right" },
] as const;

type ColumnKey = (typeof PRODUCT_COLUMNS)[number]["key"];

const COLUMN_STORAGE_KEY = "kios-pos:products-columns";

const DISCOUNT_POLICY_PERCENT = Number(
  process.env.NEXT_PUBLIC_DISCOUNT_LIMIT_PERCENT ?? 50,
);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toFixed(2).replace(/\.00$/, "")}%`;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

type ProductFormState = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  categoryId: string;
  supplierId: string;
  costPrice: string;
  defaultDiscountPercent: string;
  promoName: string;
  promoPrice: string;
  promoStart: string;
  promoEnd: string;
  isTaxable: boolean;
  taxRate: string;
};

const emptyProductForm: ProductFormState = {
  id: "",
  name: "",
  sku: "",
  barcode: "",
  price: "",
  categoryId: "",
  supplierId: "",
  costPrice: "",
  defaultDiscountPercent: "",
  promoName: "",
  promoPrice: "",
  promoStart: "",
  promoEnd: "",
  isTaxable: false,
  taxRate: "",
};

const emptyCategoryDraft = {
  id: "",
  name: "",
};

const emptySupplierDraft = {
  id: "",
  name: "",
  email: "",
  phone: "",
};

const emptyTaxDraft = {
  id: "",
  name: "",
  rate: "",
  isActive: false,
};

export default function ProductManagementPage() {
  const [search, setSearch] = useState("");
  const productsQuery = api.products.list.useQuery({ search });
  const upsertProduct = api.products.upsert.useMutation();
  const categoriesQuery = api.products.categories.useQuery();
  const suppliersQuery = api.products.suppliers.useQuery();
  const upsertCategory = api.products.upsertCategory.useMutation();
  const ctx = api.useContext();

  const deleteCategory = api.products.deleteCategory.useMutation({
    // noop: we handle scheduling manually in handler
  });
  const upsertSupplier = api.products.upsertSupplier.useMutation();
  const deleteSupplier = api.products.deleteSupplier.useMutation({
    // noop: we handle scheduling manually in handler
  });
  

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
    name: true,
    sku: true,
    barcode: true,
    supplier: true,
    price: true,
    discount: true,
    promo: true,
    tax: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Record<ColumnKey, boolean>;
      setColumnVisibility((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore invalid storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      COLUMN_STORAGE_KEY,
      JSON.stringify(columnVisibility),
    );
  }, [columnVisibility]);

  // show undo toast after delete mutation
  const showUndoForCategory = (previous: unknown) => {
    toast.success(
      "Kategori dihapus",
      {
        action: {
          label: "Undo",
          onClick: async () => {
            if (!previous) return;
            // re-create the first deleted item from snapshot
            const arr = Array.isArray(previous) ? previous : (previous as unknown[]);
            const item = arr.find(Boolean) as Record<string, unknown> | undefined;
            if (!item) return;
            try {
              await upsertCategory.mutateAsync({ id: item.id as string, name: item.name as string });
              await categoriesQuery.refetch();
              toast.success("Pembatalan berhasil");
            } catch (err) {
              toast.error("Gagal mengembalikan kategori");
            }
          },
        },
      },
    );
  };

  const showUndoForSupplier = (previous: unknown) => {
    toast.success(
      "Supplier dihapus",
      {
        action: {
          label: "Undo",
          onClick: async () => {
            if (!previous) return;
            const arr = Array.isArray(previous) ? previous : (previous as unknown[]);
            const item = arr.find(Boolean) as Record<string, unknown> | undefined;
            if (!item) return;
            try {
              await upsertSupplier.mutateAsync({ id: item.id as string, name: item.name as string, email: item.email as string ?? undefined, phone: item.phone as string ?? undefined });
              await suppliersQuery.refetch();
              toast.success("Pembatalan berhasil");
            } catch (err) {
              toast.error("Gagal mengembalikan supplier");
            }
          },
        },
      },
    );
  };
  const taxSettingsQuery = api.settings.listTaxSettings.useQuery();
  const upsertTaxSetting = api.settings.upsertTaxSetting.useMutation();
  const activateTaxSetting = api.settings.activateTaxSetting.useMutation();

  // move hook to top-level of component to comply with hooks rules
  const showUndo = useUndoToast();

  const [formState, setFormState] = useState<ProductFormState>(emptyProductForm);
  const [categoryDraft, setCategoryDraft] = useState(emptyCategoryDraft);
  const [supplierDraft, setSupplierDraft] = useState(emptySupplierDraft);
  const [taxDraft, setTaxDraft] = useState(emptyTaxDraft);

  const resetForm = () => {
    setFormState(emptyProductForm);
  };

  const editingProduct = useMemo(
    () => productsQuery.data?.find((product) => product.id === formState.id),
    [productsQuery.data, formState.id],
  );

  const activeTaxRate = useMemo(
    () => taxSettingsQuery.data?.find((setting) => setting.isActive)?.rate ?? null,
    [taxSettingsQuery.data],
  );
  const categoryOptions = categoriesQuery.data ?? [];
  const supplierOptions = suppliersQuery.data ?? [];
  const visibleColumns = PRODUCT_COLUMNS.filter(
    (column) => columnVisibility[column.key],
  );
  const visibleColumnCount = visibleColumns.length;

  const filteredProducts = useMemo(() => {
    const list = productsQuery.data ?? [];
    return list.filter((product) => {
      const matchCategory =
        selectedCategory === "all" || product.categoryId === selectedCategory;
      const matchSupplier =
        selectedSupplier === "all" || product.supplierId === selectedSupplier;
      return matchCategory && matchSupplier;
    });
  }, [productsQuery.data, selectedCategory, selectedSupplier]);

  const renderProductCell = (
    product: (typeof filteredProducts)[number],
    key: ColumnKey,
  ) => {
    switch (key) {
      case "name":
        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{product.name}</span>
            <span className="text-xs text-muted-foreground">
              {product.category ?? "Tanpa kategori"}
            </span>
          </div>
        );
      case "sku":
        return product.sku;
      case "barcode":
        return product.barcode ?? "-";
      case "supplier":
        return product.supplier ?? "-";
      case "price":
        return formatCurrency(product.price ?? 0);
      case "discount":
        return formatPercent(product.defaultDiscountPercent);
      case "promo":
        return product.promoPrice ? (
          <div className="flex flex-col items-end text-right">
            <span>
              {product.promoName ?? "Promo"} ·{" "}
              {formatCurrency(product.promoPrice)}
            </span>
            {product.promoStart ? (
              <span className="text-xs text-muted-foreground">
                {formatDate(product.promoStart)} - {formatDate(product.promoEnd)}
              </span>
            ) : null}
          </div>
        ) : (
          "-"
        );
      case "tax":
        return product.isTaxable
          ? formatPercent(product.taxRate ?? activeTaxRate)
          : "-";
      default:
        return null;
    }
  };

  const toggleColumn = (key: ColumnKey) => {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const exportProductsCsv = () => {
    if (!filteredProducts.length) {
      toast.info("Tidak ada data untuk diekspor.");
      return;
    }
    const headers = PRODUCT_COLUMNS.filter(
      (column) => columnVisibility[column.key],
    ).map((column) => column.label);
    const rows = filteredProducts
      .map((product) =>
        PRODUCT_COLUMNS.filter((column) => columnVisibility[column.key])
          .map((column) => {
            switch (column.key) {
              case "name":
                return product.name ?? "";
              case "sku":
                return product.sku ?? "";
              case "barcode":
                return product.barcode ?? "";
              case "supplier":
                return product.supplier ?? "";
              case "price":
                return String(product.price ?? "");
              case "discount":
                return product.defaultDiscountPercent != null
                  ? String(product.defaultDiscountPercent)
                  : "";
              case "promo":
                return product.promoPrice
                  ? `${product.promoName ?? "Promo"} ${product.promoPrice}`
                  : "";
              case "tax":
                return product.isTaxable
                  ? String(product.taxRate ?? activeTaxRate ?? 0)
                  : "";
              default:
                return "";
            }
          })
          .join(","),
      )
      .join("\n");

    const csvContent = [headers.join(","), rows].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "katalog-produk.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Ekspor CSV berhasil dibuat.");
  };

  const handleSubmit = async () => {
    if (!formState.name || !formState.sku) {
      toast.error("Nama dan SKU wajib diisi");
      return;
    }

    const resolvedTaxRate = formState.isTaxable
      ? formState.taxRate
        ? Number(formState.taxRate)
        : activeTaxRate ?? undefined
      : undefined;

    const payload = {
      id: formState.id || undefined,
      name: formState.name,
      sku: formState.sku,
      barcode: formState.barcode || undefined,
      price: Number(formState.price || 0),
      costPrice: formState.costPrice ? Number(formState.costPrice) : undefined,
      categoryId: formState.categoryId || undefined,
      supplierId: formState.supplierId || undefined,
      isActive: true,
      defaultDiscountPercent: formState.defaultDiscountPercent
        ? Number(formState.defaultDiscountPercent)
        : undefined,
      promoName: formState.promoName || undefined,
      promoPrice: formState.promoPrice ? Number(formState.promoPrice) : undefined,
      promoStart: formState.promoStart ? new Date(formState.promoStart).toISOString() : undefined,
      promoEnd: formState.promoEnd ? new Date(formState.promoEnd).toISOString() : undefined,
      isTaxable: formState.isTaxable,
      taxRate: resolvedTaxRate,
    };

    try {
      await upsertProduct.mutateAsync(payload);
      await productsQuery.refetch();
      toast.success("Produk tersimpan");
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan produk");
    }
  };

  const handleCategorySubmit = async () => {
    if (!categoryDraft.name.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }

    try {
      await upsertCategory.mutateAsync({
        id: categoryDraft.id || undefined,
        name: categoryDraft.name,
      });
      await categoriesQuery.refetch();
      toast.success(`Kategori ${categoryDraft.id ? "diperbarui" : "ditambahkan"}`);
      setCategoryDraft(emptyCategoryDraft);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan kategori");
    }
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) {
      return;
    }

    // optimistic remove + schedule server delete with undo
    try {
      const { optimisticOnMutate } = await import("@/lib/optimistic");
      const snapshot = await optimisticOnMutate(ctx, "categories", id);

      // schedule server delete
      const { scheduleDelete, cancelScheduledDelete } = await import("@/lib/delete-queue");
      scheduleDelete(`category:${id}`, async () => {
        await deleteCategory.mutateAsync({ id });
      });

      const undone = await showUndo({ label: "Kategori dihapus", seconds: 6, onUndo: async () => {
        cancelScheduledDelete(`category:${id}`);
        if (snapshot?.previous) {
          ctx.products.categories.setData(undefined, () => snapshot.previous);
        }
      } });

      if (!undone) {
        await ctx.products.categories.invalidate();
        toast.success("Kategori dihapus");
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Kategori masih digunakan oleh produk.");
    }
  };

  const handleSupplierSubmit = async () => {
    if (!supplierDraft.name.trim()) {
      toast.error("Nama supplier wajib diisi");
      return;
    }

    try {
      await upsertSupplier.mutateAsync({
        id: supplierDraft.id || undefined,
        name: supplierDraft.name,
        email: supplierDraft.email || undefined,
        phone: supplierDraft.phone || undefined,
      });
      await suppliersQuery.refetch();
      toast.success(`Supplier ${supplierDraft.id ? "diperbarui" : "ditambahkan"}`);
      setSupplierDraft(emptySupplierDraft);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan supplier");
    }
  };

  const handleSupplierDelete = async (id: string) => {
    if (!confirm("Hapus supplier ini?")) {
      return;
    }

    try {
      const { optimisticOnMutate } = await import("@/lib/optimistic");
      const snapshot = await optimisticOnMutate(ctx, "suppliers", id);

      const { scheduleDelete, cancelScheduledDelete } = await import("@/lib/delete-queue");
      scheduleDelete(`supplier:${id}`, async () => {
        await deleteSupplier.mutateAsync({ id });
      });

      const undone = await showUndo({ label: "Supplier dihapus", seconds: 6, onUndo: async () => {
        cancelScheduledDelete(`supplier:${id}`);
        if (snapshot?.previous) {
          ctx.products.suppliers.setData(undefined, () => snapshot.previous);
        }
      } });

      if (!undone) {
        await ctx.products.suppliers.invalidate();
        toast.success("Supplier dihapus");
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Supplier masih digunakan oleh produk.");
    }
  };

  const handleTaxSubmit = async () => {
    if (!taxDraft.name.trim() || !taxDraft.rate.trim()) {
      toast.error("Nama dan tarif pajak wajib diisi");
      return;
    }

    try {
      await upsertTaxSetting.mutateAsync({
        id: taxDraft.id || undefined,
        name: taxDraft.name,
        rate: Number(taxDraft.rate),
        isActive: taxDraft.isActive,
      });
      await taxSettingsQuery.refetch();
      toast.success(`Konfigurasi pajak ${taxDraft.id ? "diperbarui" : "ditambahkan"}`);
      setTaxDraft(emptyTaxDraft);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan pengaturan pajak");
    }
  };

  const handleActivateTax = async (id: string) => {
    try {
      await activateTaxSetting.mutateAsync({ id });
      await taxSettingsQuery.refetch();
      toast.success("Tarif pajak aktif diperbarui");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengaktifkan tarif pajak");
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Manajemen Produk</h1>
        <p className="text-muted-foreground">
          Sinkronkan SKU, barcode, kategori, harga jual, promo, dan pajak agar katalog kasir konsisten.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Produk</CardTitle>
            <CardDescription>Monitor harga, promo, supplier, dan status pajak.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(0,240px)_minmax(0,200px)_minmax(0,200px)] lg:items-end lg:gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="search-products">
                    Cari produk
                  </label>
                  <Input
                    id="search-products"
                    placeholder="Nama, SKU, atau barcode"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-category">
                    Filter kategori
                  </label>
                  <select
                    id="filter-category"
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Semua kategori</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-supplier">
                    Filter supplier
                  </label>
                  <select
                    id="filter-supplier"
                    value={selectedSupplier}
                    onChange={(event) => setSelectedSupplier(event.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Semua supplier</option>
                    {supplierOptions.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRODUCT_COLUMNS.map((column) => (
                  <Button
                    key={column.key}
                    variant={columnVisibility[column.key] ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleColumn(column.key)}
                  >
                    {columnVisibility[column.key] ? "✓" : "○"} {column.label}
                  </Button>
                ))}
                <Button variant="default" size="sm" onClick={exportProductsCsv}>
                  Ekspor CSV
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table className="[&_tbody]:block [&_tbody]:max-h-[360px] [&_tbody]:overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background">
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map((column) => (
                      <TableHead
                        key={column.key}
                        className={column.align === "right" ? "text-right" : undefined}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>

                <MotionTbody
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.03 } },
                  }}
                  className="[&_tr:last-child]:border-0"
                >
                  {filteredProducts.map((product) => (
                    <MotionTr
                      key={product.id}
                      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      {visibleColumns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={column.align === "right" ? "text-right" : undefined}
                        >
                          {renderProductCell(product, column.key)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setFormState({
                              id: product.id,
                              name: product.name,
                              sku: product.sku,
                              barcode: product.barcode ?? "",
                              price: String(product.price ?? ""),
                              categoryId: product.categoryId ?? "",
                              supplierId: product.supplierId ?? "",
                              costPrice: product.costPrice != null ? String(product.costPrice) : "",
                              defaultDiscountPercent:
                                product.defaultDiscountPercent != null
                                  ? String(product.defaultDiscountPercent)
                                  : "",
                              promoName: product.promoName ?? "",
                              promoPrice: product.promoPrice != null ? String(product.promoPrice) : "",
                              promoStart: product.promoStart ? product.promoStart.slice(0, 10) : "",
                              promoEnd: product.promoEnd ? product.promoEnd.slice(0, 10) : "",
                              isTaxable: product.isTaxable,
                              taxRate: product.taxRate != null ? String(product.taxRate) : "",
                            })
                          }
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </MotionTr>
                  ))}

                  {filteredProducts.length === 0 && (
                    <MotionTr variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
                      <TableCell colSpan={visibleColumnCount + 1} className="py-10 text-center text-sm text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <p>Belum ada produk. Import master data atau tambah manual terlebih dahulu.</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toast.info("Gunakan script seed: pnpm seed:products")}
                            >
                              Impor CSV
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setFormState(emptyProductForm)}
                            >
                              Tambah Produk
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </MotionTr>
                  )}
                </MotionTbody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{editingProduct ? "Ubah Produk" : "Tambah Produk"}</CardTitle>
              <CardDescription>
                Lengkapi informasi harga pokok, diskon standar, promo musiman, dan konfigurasi PPN per produk.
              </CardDescription>
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
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, barcode: event.target.value }))
                  }
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
                    setFormState((state) => ({ ...state, price: event.target.value }))
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
                    setFormState((state) => ({ ...state, costPrice: event.target.value }))
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
              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier</Label>
                <select
                  id="supplier"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.supplierId}
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, supplierId: event.target.value }))
                  }
                >
                  <option value="">Pilih supplier</option>
                  {suppliersQuery.data?.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="defaultDiscountPercent">Diskon Default (%)</Label>
                <Input
                  id="defaultDiscountPercent"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={formState.defaultDiscountPercent}
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, defaultDiscountPercent: event.target.value }))
                  }
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isNaN(value)) return;
                    if (value > DISCOUNT_POLICY_PERCENT) {
                      toast.warning(`Diskon default dibatasi ${DISCOUNT_POLICY_PERCENT}% sesuai kebijakan toko.`);
                      setFormState((state) => ({
                        ...state,
                        defaultDiscountPercent: String(DISCOUNT_POLICY_PERCENT),
                      }));
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Diskon maksimal mengikuti kebijakan toko: {DISCOUNT_POLICY_PERCENT}%.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promoName">Nama Promo</Label>
                <Input
                  id="promoName"
                  value={formState.promoName}
                  onChange={(event) => setFormState((state) => ({ ...state, promoName: event.target.value }))}
                  placeholder="Contoh: Promo Ramadhan"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promoPrice">Harga Promo</Label>
                <Input
                  id="promoPrice"
                  type="number"
                  min={0}
                  value={formState.promoPrice}
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, promoPrice: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="promoStart">Mulai Promo</Label>
                  <Input
                    id="promoStart"
                    type="date"
                    value={formState.promoStart}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, promoStart: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="promoEnd">Selesai Promo</Label>
                  <Input
                    id="promoEnd"
                    type="date"
                    value={formState.promoEnd}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, promoEnd: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="isTaxable"
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={formState.isTaxable}
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, isTaxable: event.target.checked }))
                  }
                />
                <div>
                  <Label htmlFor="isTaxable" className="font-medium">
                    Terapkan PPN untuk produk ini
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Tandai untuk menghitung PPN saat transaksi.
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taxRate">Tarif PPN (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={formState.taxRate}
                  disabled={!formState.isTaxable}
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, taxRate: event.target.value }))
                  }
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => void handleSubmit()} disabled={upsertProduct.isPending}>
                  {upsertProduct.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kategori Produk</CardTitle>
              <CardDescription>Kelola klasifikasi untuk laporan dan filter kasir.</CardDescription>
            </CardHeader>
              <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Nama kategori"
                  value={categoryDraft.name}
                  onChange={(event) =>
                    setCategoryDraft((draft) => ({ ...draft, name: event.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button onClick={() => void handleCategorySubmit()} disabled={upsertCategory.isPending}>
                    {upsertCategory.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      categoryDraft.id ? "Perbarui" : "Tambah"
                    )}
                  </Button>
                  {categoryDraft.id && (
                    <Button
                      variant="outline"
                      onClick={() => setCategoryDraft(emptyCategoryDraft)}
                    >
                      Batal
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <MotionList className="space-y-2">
                  {categoriesQuery.data?.map((category) => (
                    <MotionItem
                      key={category.id}
                      className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">{category.slug}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCategoryDraft({ id: category.id, name: category.name })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleCategoryDelete(category.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </MotionItem>
                  ))}
                </MotionList>
                {categoriesQuery.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supplier</CardTitle>
              <CardDescription>Catat vendor untuk mempermudah restock dan negosiasi harga.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Input
                  placeholder="Nama supplier"
                  value={supplierDraft.name}
                  onChange={(event) =>
                    setSupplierDraft((draft) => ({ ...draft, name: event.target.value }))
                  }
                />
                <Input
                  placeholder="Email (opsional)"
                  value={supplierDraft.email}
                  onChange={(event) =>
                    setSupplierDraft((draft) => ({ ...draft, email: event.target.value }))
                  }
                />
                <Input
                  placeholder="No. telepon (opsional)"
                  value={supplierDraft.phone}
                  onChange={(event) =>
                    setSupplierDraft((draft) => ({ ...draft, phone: event.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button onClick={() => void handleSupplierSubmit()} disabled={upsertSupplier.isPending}>
                    {upsertSupplier.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      supplierDraft.id ? "Perbarui" : "Tambah"
                    )}
                  </Button>
                  {supplierDraft.id && (
                    <Button
                      variant="outline"
                      onClick={() => setSupplierDraft(emptySupplierDraft)}
                    >
                      Batal
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <MotionList className="space-y-2">
                  {suppliersQuery.data?.map((supplier) => (
                    <MotionItem
                      key={supplier.id}
                      className="flex flex-col gap-2 rounded-md border border-dashed border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{supplier.name}</p>
                        {(supplier.email || supplier.phone) && (
                          <p className="text-xs text-muted-foreground">
                            {[supplier.email, supplier.phone].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSupplierDraft({
                              id: supplier.id,
                              name: supplier.name,
                              email: supplier.email ?? "",
                              phone: supplier.phone ?? "",
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleSupplierDelete(supplier.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </MotionItem>
                  ))}
                </MotionList>
                {suppliersQuery.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada supplier.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pengaturan PPN</CardTitle>
              <CardDescription>
                Simpan tarif PPN nasional atau outlet tertentu dan pilih mana yang aktif untuk kasir.
              </CardDescription>
            </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="taxName">Nama Tarif</Label>
                  <Input
                    id="taxName"
                    placeholder="Contoh: PPN 11%"
                    value={taxDraft.name}
                    onChange={(event) =>
                      setTaxDraft((draft) => ({ ...draft, name: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="taxRate">Tarif (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={taxDraft.rate}
                    onChange={(event) =>
                      setTaxDraft((draft) => ({ ...draft, rate: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="taxActive"
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={taxDraft.isActive}
                  onChange={(event) =>
                    setTaxDraft((draft) => ({ ...draft, isActive: event.target.checked }))
                  }
                />
                <Label htmlFor="taxActive">Jadikan aktif setelah disimpan</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void handleTaxSubmit()} disabled={upsertTaxSetting.isPending}>
                  {upsertTaxSetting.isPending ? "Memproses..." : taxDraft.id ? "Perbarui" : "Simpan"}
                </Button>
                {taxDraft.id && (
                  <Button variant="outline" onClick={() => setTaxDraft(emptyTaxDraft)}>
                    Batal
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <MotionList className="space-y-2">
                  {taxSettingsQuery.data?.map((setting) => (
                    <MotionItem
                      key={setting.id}
                      className="flex flex-col gap-2 rounded-md border border-dashed border-border px-3 py-2 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {setting.name} · {formatPercent(setting.rate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {setting.isActive ? "Aktif" : "Nonaktif"} · diperbarui {formatDate(setting.updatedAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTaxDraft({
                              id: setting.id,
                              name: setting.name,
                              rate: String(setting.rate),
                              isActive: setting.isActive,
                            })
                          }
                        >
                          Edit
                        </Button>
                        {!setting.isActive && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleActivateTax(setting.id)}
                          >
                            Aktifkan
                          </Button>
                        )}
                      </div>
                    </MotionItem>
                  ))}
                </MotionList>
                {taxSettingsQuery.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada tarif PPN tersimpan.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
