"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

import { MotionButton as Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { listVariants } from "@/components/ui/motion-variants";
import MotionList, { MotionItem } from "@/components/ui/motion-list";
import { MotionTableBody, MotionTableRow } from "@/components/ui/motion-table";
import {
  ColumnDef,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

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

const defaultColumnVisibility: VisibilityState = PRODUCT_COLUMNS.reduce(
  (acc, column) => ({ ...acc, [column.key]: true }),
  {} as VisibilityState,
);

type ProductColumnMeta = {
  align?: "left" | "right";
  label?: string;
  key?: string;
};

const getColumnMeta = (meta: unknown): ProductColumnMeta =>
  (meta ?? {}) as ProductColumnMeta;

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
  const [activeTab, setActiveTab] = useState("products");
  const showUndo = useUndoToast();
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
  const outletsQuery = api.outlets.list.useQuery();
  
  type ProductRow = NonNullable<typeof productsQuery.data>[number];


  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === "undefined") {
      return defaultColumnVisibility;
    }
    const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!stored) {
      return defaultColumnVisibility;
    }
    try {
      const parsed = JSON.parse(stored) as VisibilityState;
      return { ...defaultColumnVisibility, ...parsed };
    } catch {
      return defaultColumnVisibility;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      COLUMN_STORAGE_KEY,
      JSON.stringify(columnVisibility),
    );
  }, [columnVisibility]);

  // show undo toast after delete mutation
  const taxSettingsQuery = api.settings.listTaxSettings.useQuery();
  const upsertTaxSetting = api.settings.upsertTaxSetting.useMutation();
  const activateTaxSetting = api.settings.activateTaxSetting.useMutation();

  // move hook to top-level of component to comply with hooks rules
  const [formState, setFormState] = useState<ProductFormState>(emptyProductForm);
  const [categoryDraft, setCategoryDraft] = useState(emptyCategoryDraft);
  const [supplierDraft, setSupplierDraft] = useState(emptySupplierDraft);
  const [taxDraft, setTaxDraft] = useState(emptyTaxDraft);
  const [movementProductId, setMovementProductId] = useState<string>("");
  const [movementOutletId, setMovementOutletId] = useState<string>("");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementNote, setMovementNote] = useState("");

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
  const productOptions = productsQuery.data ?? [];

  useEffect(() => {
    if (!movementProductId && productOptions.length > 0) {
      setMovementProductId(productOptions[0].id);
    }
  }, [movementProductId, productOptions]);

  useEffect(() => {
    if (!movementOutletId && outletsQuery.data?.length) {
      setMovementOutletId(outletsQuery.data[0].id);
    }
  }, [movementOutletId, outletsQuery.data]);

  const inventoryQuery = api.products.getInventoryByProduct.useQuery(
    { productId: movementProductId },
    { enabled: Boolean(movementProductId) },
  );
  const stockMovementsQuery = api.products.getStockMovements.useQuery(
    { productId: movementProductId, limit: 25 },
    { enabled: Boolean(movementProductId), refetchInterval: 60_000 },
  );
  const createStockAdjustment = api.products.createStockAdjustment.useMutation();

  const selectedMovementProduct = useMemo(
    () => productOptions.find((product) => product.id === movementProductId) ?? null,
    [movementProductId, productOptions],
  );
  const inventoryRecords = inventoryQuery.data ?? [];
  const movementRecords = stockMovementsQuery.data ?? [];
  const isPostingAdjustment = createStockAdjustment.isPending;

  const columns = useMemo<ColumnDef<ProductRow>[]>(() => {
    const baseColumns: ColumnDef<ProductRow>[] = PRODUCT_COLUMNS.map((column) => {
      const key = column.key as string;
      const label = column.label;
      const align = column.align;

      if (column.key === "name") {
        return {
          id: key,
          accessorKey: "name",
          header: label,
          meta: { align, label, key },
          size: 260,
          cell: ({ row }) => (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{row.original.name}</span>
              <span className="text-xs text-muted-foreground">
                {row.original.category ?? "Tanpa kategori"}
              </span>
            </div>
          ),
        } satisfies ColumnDef<ProductRow>;
      }

      if (column.key === "sku") {
        return {
          id: key,
          accessorKey: "sku",
          header: label,
          meta: { align, label, key },
          size: 160,
          cell: ({ row }) => row.original.sku ?? "-",
        } satisfies ColumnDef<ProductRow>;
      }

      if (column.key === "barcode") {
        return {
          id: key,
          accessorKey: "barcode",
          header: label,
          meta: { align, label, key },
          size: 160,
          cell: ({ row }) => row.original.barcode ?? "-",
        } satisfies ColumnDef<ProductRow>;
      }

      if (column.key === "supplier") {
        return {
          id: key,
          accessorKey: "supplier",
          header: label,
          meta: { align, label, key },
          size: 180,
          cell: ({ row }) => row.original.supplier ?? "-",
        } satisfies ColumnDef<ProductRow>;
      }

      if (column.key === "price") {
        return {
          id: key,
          accessorKey: "price",
          header: label,
          meta: { align, label, key },
          size: 140,
          cell: ({ row }) => (
            <span className="whitespace-nowrap">
              {formatCurrency(row.original.price ?? 0)}
            </span>
          ),
        } satisfies ColumnDef<ProductRow>;
      }

      if (column.key === "discount") {
        return {
          id: key,
          accessorFn: (row) => row.defaultDiscountPercent,
          header: label,
          meta: { align, label, key },
          size: 120,
          cell: ({ row }) => formatPercent(row.original.defaultDiscountPercent),
        } satisfies ColumnDef<ProductRow>;
      }

      if (column.key === "promo") {
        return {
          id: key,
          accessorFn: (row) => row.promoPrice,
          header: label,
          meta: { align, label, key },
          size: 200,
          cell: ({ row }) => {
            if (!row.original.promoPrice) {
              return "-";
            }
            return (
              <div className="flex flex-col items-end text-right">
                <span>
                  {row.original.promoName ?? "Promo"} ·{" "}
                  {formatCurrency(row.original.promoPrice)}
                </span>
                {row.original.promoStart ? (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(row.original.promoStart)} - {formatDate(row.original.promoEnd)}
                  </span>
                ) : null}
              </div>
            );
          },
        } satisfies ColumnDef<ProductRow>;
      }

      if (column.key === "tax") {
        return {
          id: key,
          accessorFn: (row) => row.taxRate,
          header: label,
          meta: { align, label, key },
          size: 120,
          cell: ({ row }) =>
            row.original.isTaxable
              ? formatPercent(row.original.taxRate ?? activeTaxRate)
              : "-",
        } satisfies ColumnDef<ProductRow>;
      }

      return {
        id: key,
        accessorKey: key,
        header: label,
        meta: { align, label, key },
      } satisfies ColumnDef<ProductRow>;
    });

    baseColumns.push({
      id: "actions",
      header: () => null,
      meta: { align: "left", label: "Aksi", key: "actions" },
      enableHiding: false,
      enableResizing: false,
      size: 80,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setFormState({
              id: row.original.id,
              name: row.original.name,
              sku: row.original.sku,
              barcode: row.original.barcode ?? "",
              price: String(row.original.price ?? 0),
              categoryId: row.original.categoryId ?? "",
              supplierId: row.original.supplierId ?? "",
              costPrice:
                row.original.costPrice != null
                  ? String(row.original.costPrice)
                  : "",
              defaultDiscountPercent:
                row.original.defaultDiscountPercent != null
                  ? String(row.original.defaultDiscountPercent)
                  : "",
              promoName: row.original.promoName ?? "",
              promoPrice:
                row.original.promoPrice != null
                  ? String(row.original.promoPrice)
                  : "",
              promoStart: row.original.promoStart
                ? row.original.promoStart.slice(0, 10)
                : "",
              promoEnd: row.original.promoEnd
                ? row.original.promoEnd.slice(0, 10)
                : "",
              isTaxable: row.original.isTaxable,
              taxRate:
                row.original.taxRate != null ? String(row.original.taxRate) : "",
            })
          }
        >
          Edit
        </Button>
      ),
    });

    return baseColumns;
  }, [activeTaxRate, setFormState]);

  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  const exportProductsCsv = () => {
    if (!filteredProducts.length) {
      toast.info("Tidak ada data untuk diekspor.");
      return;
    }

    const visibleColumns = table
      .getAllLeafColumns()
      .filter((column) => {
        const meta = getColumnMeta(column.columnDef.meta);
        return column.getIsVisible() && meta.key && meta.key !== "actions";
      });

    if (!visibleColumns.length) {
      toast.info("Tampilkan minimal satu kolom sebelum ekspor.");
      return;
    }

    const headers = visibleColumns.map((column) => {
      const meta = getColumnMeta(column.columnDef.meta);
      return meta.label ?? column.id;
    });

    const rows = filteredProducts
      .map((product) =>
        visibleColumns
          .map((column) => {
            const meta = getColumnMeta(column.columnDef.meta);
            const metaKey = meta.key as ColumnKey | undefined;
            switch (metaKey) {
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

  const handleSubmitStockAdjustment = async () => {
    if (!movementProductId) {
      toast.error("Pilih produk terlebih dahulu");
      return;
    }

    if (!movementOutletId) {
      toast.error("Pilih outlet untuk penyesuaian stok");
      return;
    }

    const parsedQuantity = Number(movementQuantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      toast.error("Jumlah penyesuaian minimal 1 dan harus bilangan bulat");
      return;
    }

    try {
      await createStockAdjustment.mutateAsync({
        productId: movementProductId,
        outletId: movementOutletId,
        type: movementType,
        quantity: parsedQuantity,
        note: movementNote.trim() || undefined,
      });
      toast.success("Pergerakan stok berhasil dicatat");
      setMovementQuantity("");
      setMovementNote("");
      await Promise.all([inventoryQuery.refetch(), stockMovementsQuery.refetch()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mencatat pergerakan stok.";
      toast.error(message);
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
          Kelola katalog produk, kategori, supplier, dan pengaturan pajak untuk operasi kios yang efisien.
        </p>
      </header>

      <nav className="flex space-x-1 border-b">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "products"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Produk
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Kategori
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "suppliers"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Supplier
        </button>
        <button
          onClick={() => setActiveTab("tax")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "tax"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          PPN
        </button>
        <button
          onClick={() => setActiveTab("movements")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "movements"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Pergerakan Stok
        </button>
      </nav>

      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Produk content */}
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
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-category">
                        Kategori
                      </label>
                      <select
                        id="filter-category"
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="all">Semua kategori</option>
                        {categoriesQuery.data?.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-supplier">
                        Supplier
                      </label>
                      <select
                        id="filter-supplier"
                        value={selectedSupplier}
                        onChange={(event) => setSelectedSupplier(event.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="all">Semua supplier</option>
                        {suppliersQuery.data?.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportProductsCsv}
                    >
                      Ekspor CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setFormState(emptyProductForm)}
                    >
                      Tambah Produk
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                    Kolom
                  </span>
                  {table.getAllLeafColumns().map((column) => {
                    const meta = getColumnMeta(column.columnDef.meta);
                    if (!meta.key || meta.key === "actions") {
                      return null;
                    }
                    return (
                      <label
                        key={column.id}
                        className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={() => column.toggleVisibility()}
                          className="h-3 w-3 accent-primary"
                        />
                        {meta.label ?? column.id}
                      </label>
                    );
                  })}
                </div>
                <div className="rounded-md border">
                  <Table className="[&_tbody]:block [&_tbody]:max-h-[340px] [&_tbody]:overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background">
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            const meta = getColumnMeta(header.column.columnDef.meta);
                            const align = meta.align === "right" ? "text-right" : "text-left";
                            return (
                              <TableHead
                                key={header.id}
                                className={`relative ${align}`}
                                style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getCanResize() ? (
                                  <div
                                    onMouseDown={header.getResizeHandler()}
                                    onTouchStart={header.getResizeHandler()}
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none"
                                  />
                                ) : null}
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <MotionTableBody className="bg-background" variants={listVariants}>
                      {table.getRowModel().rows.map((row) => (
                        <MotionTableRow key={row.id} className="border-b">
                          {row.getVisibleCells().map((cell) => {
                            const meta = getColumnMeta(cell.column.columnDef.meta);
                            const align = meta.align === "right" ? "text-right" : "";
                            return (
                              <TableCell
                                key={cell.id}
                                className={align}
                                style={{ width: cell.column.getSize() ? `${cell.column.getSize()}px` : undefined }}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            );
                          })}
                        </MotionTableRow>
                      ))}
                      {table.getRowModel().rows.length === 0 && (
                        <MotionTableRow className="border-b" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
                          <TableCell
                            colSpan={Math.max(table.getVisibleLeafColumns().length, 1)}
                            className="py-10 text-center text-sm text-muted-foreground"
                          >
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
                        </MotionTableRow>
                      )}
                    </MotionTableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

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
                    value={formState.categoryId}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, categoryId: event.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                    value={formState.supplierId}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, supplierId: event.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                  <Label htmlFor="defaultDiscountPercent">Diskon Standar (%)</Label>
                  <Input
                    id="defaultDiscountPercent"
                    type="number"
                    min={0}
                    max={DISCOUNT_POLICY_PERCENT}
                    value={formState.defaultDiscountPercent}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, defaultDiscountPercent: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="promoName">Nama Promo (opsional)</Label>
                  <Input
                    id="promoName"
                    value={formState.promoName}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, promoName: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="promoPrice">Harga Promo (opsional)</Label>
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
                    <Label htmlFor="promoEnd">Akhir Promo</Label>
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
                <div className="grid gap-2">
                  <Label htmlFor="isTaxable">PPN</Label>
                  <select
                    id="isTaxable"
                    value={formState.isTaxable ? "taxable" : "non-taxable"}
                    onChange={(event) =>
                      setFormState((state) => ({ ...state, isTaxable: event.target.value === "taxable" }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="non-taxable">Tidak kena PPN</option>
                    <option value="taxable">Kena PPN</option>
                  </select>
                </div>
                {formState.isTaxable && (
                  <div className="grid gap-2">
                    <Label htmlFor="taxRate">Tarif PPN (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={formState.taxRate}
                      onChange={(event) =>
                        setFormState((state) => ({ ...state, taxRate: event.target.value }))
                      }
                    />
                  </div>
                )}
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
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="space-y-6">
          {/* Kategori content */}
          <Card>
            <CardHeader>
              <CardTitle>Kategori Produk</CardTitle>
              <CardDescription>Kelola klasifikasi untuk laporan dan filter kasir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="categoryName">Nama Kategori</Label>
                <Input
                  id="categoryName"
                  placeholder="Contoh: Minuman"
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
                <MotionList as="div" className="space-y-2">
                  {categoriesQuery.data?.map((category) => (
                    <MotionItem key={category.id} as="div" className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2">
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
        </div>
      )}

      {activeTab === "suppliers" && (
        <div className="space-y-6">
          {/* Supplier content */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier</CardTitle>
              <CardDescription>Catat vendor untuk mempermudah restock dan negosiasi harga.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="supplierName">Nama Supplier</Label>
                  <Input
                    id="supplierName"
                    placeholder="PT Nusantara Beans"
                    value={supplierDraft.name}
                    onChange={(event) =>
                      setSupplierDraft((draft) => ({ ...draft, name: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplierEmail">Email (opsional)</Label>
                  <Input
                    id="supplierEmail"
                    type="email"
                    placeholder="sales@supplier.com"
                    value={supplierDraft.email}
                    onChange={(event) =>
                      setSupplierDraft((draft) => ({ ...draft, email: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplierPhone">Telepon (opsional)</Label>
                  <Input
                    id="supplierPhone"
                    placeholder="+62-21-8890-1111"
                    value={supplierDraft.phone}
                    onChange={(event) =>
                      setSupplierDraft((draft) => ({ ...draft, phone: event.target.value }))
                    }
                  />
                </div>
              </div>
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
              <div className="space-y-2">
                <MotionList as="div" className="space-y-2">
                  {suppliersQuery.data?.map((supplier) => (
                    <MotionItem key={supplier.id} as="div" className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2">
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
        </div>
      )}

      {activeTab === "tax" && (
        <div className="space-y-6">
          {/* PPN content */}
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
              <div className="flex gap-2">
                <Button onClick={() => void handleTaxSubmit()} disabled={upsertTaxSetting.isPending}>
                  {upsertTaxSetting.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    taxDraft.id ? "Perbarui" : "Tambah"
                  )}
                </Button>
                {taxDraft.id && (
                  <Button
                    variant="outline"
                    onClick={() => setTaxDraft(emptyTaxDraft)}
                  >
                    Batal
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <MotionList as="div" className="space-y-2">
                  {taxSettingsQuery.data?.map((setting) => (
                    <MotionItem key={setting.id} as="div" className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{setting.name}</p>
                        <p className="text-xs text-muted-foreground">{setting.rate}% {setting.isActive ? "(Aktif)" : ""}</p>
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
      )}

      {activeTab === "movements" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Penyesuaian Stok Manual</CardTitle>
              <CardDescription>
                Catat pergerakan stok masuk/keluar dengan alasan yang jelas untuk audit harian.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="movement-product">Produk</Label>
                  <select
                    id="movement-product"
                    value={movementProductId}
                    onChange={(event) => setMovementProductId(event.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                    {productOptions.length === 0 && <option value="">Belum ada produk</option>}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="movement-outlet">Outlet</Label>
                  <select
                    id="movement-outlet"
                    value={movementOutletId}
                    onChange={(event) => setMovementOutletId(event.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {(outletsQuery.data ?? []).map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </option>
                    ))}
                    {(!outletsQuery.data || outletsQuery.data.length === 0) && (
                      <option value="">Belum ada outlet</option>
                    )}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="movement-type">Tipe Penyesuaian</Label>
                  <select
                    id="movement-type"
                    value={movementType}
                    onChange={(event) => setMovementType(event.target.value as "IN" | "OUT")}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="IN">IN · Tambah stok</option>
                    <option value="OUT">OUT · Kurangi stok</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="movement-qty">Jumlah</Label>
                  <Input
                    id="movement-qty"
                    type="number"
                    min={1}
                    value={movementQuantity}
                    onChange={(event) => setMovementQuantity(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="movement-note">Alasan / Catatan</Label>
                <Input
                  id="movement-note"
                  value={movementNote}
                  onChange={(event) => setMovementNote(event.target.value)}
                  placeholder="Opsional, contoh: Penyesuaian stok fisik"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void handleSubmitStockAdjustment()}
                  disabled={
                    isPostingAdjustment ||
                    !movementProductId ||
                    !movementOutletId ||
                    productOptions.length === 0 ||
                    (outletsQuery.data?.length ?? 0) === 0
                  }
                >
                  {isPostingAdjustment ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Tambah Penyesuaian
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Stok</CardTitle>
                <CardDescription>
                  {selectedMovementProduct
                    ? `Stok per outlet untuk ${selectedMovementProduct.name}.`
                    : "Pilih produk untuk melihat stok."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inventoryQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memuat data stok…
                  </div>
                ) : inventoryRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada stok tercatat untuk produk ini.</p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Outlet</TableHead>
                          <TableHead className="w-24 text-right">Stok</TableHead>
                          <TableHead className="w-48">Terakhir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <MotionTableBody>
                        {inventoryRecords.map((record) => (
                          <MotionTableRow key={record.outletId} className="border-b">
                            <TableCell className="font-medium">{record.outletName}</TableCell>
                            <TableCell className="text-right">{record.quantity}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(record.updatedAt), "dd MMM yyyy HH:mm")}
                            </TableCell>
                          </MotionTableRow>
                        ))}
                      </MotionTableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Riwayat Pergerakan</CardTitle>
                  <CardDescription>25 aktivitas stok terbaru untuk produk terpilih.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => stockMovementsQuery.refetch()}
                  disabled={stockMovementsQuery.isFetching}
                >
                  {stockMovementsQuery.isFetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {stockMovementsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memuat pergerakan stok…
                  </div>
                ) : movementRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada pergerakan stok untuk produk ini.</p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <Table className="[&_tbody]:block [&_tbody]:max-h-[360px] [&_tbody]:overflow-auto">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-44">Waktu</TableHead>
                          <TableHead>Outlet</TableHead>
                          <TableHead className="w-24 text-center">Tipe</TableHead>
                          <TableHead className="w-24 text-right">Qty</TableHead>
                          <TableHead>Catatan</TableHead>
                          <TableHead className="w-36">Petugas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <MotionTableBody>
                        {movementRecords.map((movement) => {
                          const quantity = movement.quantity;
                          const quantityLabel = `${quantity > 0 ? "+" : ""}${quantity}`;
                          return (
                            <MotionTableRow key={movement.id} className="border-b">
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(movement.occurredAt), "dd MMM yyyy HH:mm")}
                              </TableCell>
                              <TableCell>{movement.outletName}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs uppercase">
                                  {movement.type}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-right font-medium ${quantity >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                                {quantityLabel}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {movement.note ?? "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {movement.createdBy ?? "Sistem"}
                              </TableCell>
                            </MotionTableRow>
                          );
                        })}
                      </MotionTableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
