import { z } from "zod";

export const productListInputSchema = z.object({
  search: z.string().max(120, { message: "Pencarian maksimal 120 karakter" }).optional(),
  onlyActive: z.boolean().default(true),
  take: z
    .number({ invalid_type_error: "Jumlah ambil harus berupa angka" })
    .int({ message: "Jumlah ambil harus bulat" })
    .min(1, { message: "Minimal 1 data" })
    .max(100, { message: "Maksimal 100 data" })
    .default(50),
});

export const productSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  barcode: z.string().nullable(),
  price: z.number(),
  categoryId: z.string().nullable(),
  category: z.string().nullable(),
  supplierId: z.string().nullable(),
  supplier: z.string().nullable(),
  costPrice: z.number().nullable(),
  isActive: z.boolean(),
  defaultDiscountPercent: z.number().nullable(),
  promoName: z.string().nullable(),
  promoPrice: z.number().nullable(),
  promoStart: z.string().nullable(),
  promoEnd: z.string().nullable(),
  isTaxable: z.boolean(),
  taxRate: z.number().nullable(),
});

export const productListOutputSchema = z.array(productSummarySchema);

export const productByBarcodeInputSchema = z.object({
  barcode: z.string().min(1, { message: "Barcode wajib diisi" }),
});

export const productByBarcodeOutputSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    price: z.number(),
  })
  .nullable();

export const productUpsertInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Nama produk wajib diisi" }),
  sku: z.string().min(1, { message: "SKU wajib diisi" }),
  barcode: z
    .string()
    .min(6, { message: "Barcode minimal 6 karakter" })
    .max(64, { message: "Barcode maksimal 64 karakter" })
    .optional(),
  description: z.string().max(500).optional(),
  price: z.number().min(0, { message: "Harga tidak boleh negatif" }),
  costPrice: z.number().min(0, { message: "Harga modal minimal 0" }).optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  isActive: z.boolean().default(true),
  defaultDiscountPercent: z
    .number()
    .min(0, { message: "Diskon minimal 0%" })
    .max(100, { message: "Diskon maksimal 100%" })
    .optional(),
  promoName: z.string().max(120).optional(),
  promoPrice: z.number().min(0, { message: "Harga promo minimal 0" }).optional(),
  promoStart: z.string().datetime().optional(),
  promoEnd: z.string().datetime().optional(),
  isTaxable: z.boolean().optional(),
  taxRate: z
    .number()
    .min(0, { message: "Tarif PPN minimal 0%" })
    .max(100, { message: "Tarif PPN maksimal 100%" })
    .optional(),
});

export const productUpsertOutputSchema = z.object({
  id: z.string(),
});

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const supplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const upsertCategoryInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Nama kategori wajib diisi" }),
});

export const deleteCategoryInputSchema = z.object({
  id: z.string().min(1, { message: "Kategori tidak valid" }),
});

export const upsertSupplierInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Nama supplier wajib diisi" }),
  email: z.string().email({ message: "Email tidak valid" }).optional(),
  phone: z.string().max(32, { message: "Nomor telepon maksimal 32 karakter" }).optional(),
});

export const deleteSupplierInputSchema = z.object({
  id: z.string().min(1, { message: "Supplier tidak valid" }),
});

export const simpleSuccessSchema = z.object({ success: z.literal(true) });
export const categoryListOutputSchema = z.array(categorySchema);
export const supplierListOutputSchema = z.array(supplierSchema);
