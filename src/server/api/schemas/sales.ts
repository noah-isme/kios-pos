import { z } from "zod";

import { PaymentMethod } from "@/generated/prisma";

export const saleItemInputSchema = z.object({
  productId: z.string().min(1, { message: "Produk wajib diisi" }),
  quantity: z
    .number("Jumlah harus berupa angka")
    .int({ message: "Jumlah harus bilangan bulat" })
    .positive({ message: "Jumlah minimal 1" }),
  unitPrice: z
    .number("Harga harus berupa angka")
    .min(0, { message: "Harga tidak boleh negatif" }),
  discount: z
    .number("Diskon harus berupa angka")
    .min(0, { message: "Diskon minimal 0" })
    .default(0),
  taxable: z.boolean().optional(),
});

export const salePaymentInputSchema = z.object({
  method: z.nativeEnum(PaymentMethod, "Metode bayar tidak dikenal"),
  amount: z
    .number("Nominal bayar harus berupa angka")
    .min(0, { message: "Nominal bayar tidak boleh negatif" }),
  reference: z
    .string("Referensi harus berupa teks")
    .min(1, { message: "Referensi wajib diisi" })
    .optional(),
});

export const recordSaleInputSchema = z
  .object({
    outletId: z.string().min(1, { message: "Pilih outlet kasir" }),
    receiptNumber: z.string().min(1, { message: "Nomor struk wajib diisi" }),
    soldAt: z.string().datetime().optional(),
    discountTotal: z
      .number("Diskon tambahan harus berupa angka")
      .min(0, { message: "Diskon tambahan minimal 0" })
      .default(0),
    applyTax: z.boolean().default(false),
    taxRate: z
      .number("Tarif PPN harus berupa angka")
      .min(0, { message: "Tarif PPN minimal 0%" })
      .max(100, { message: "Tarif PPN maksimal 100%" })
      .optional(),
    taxMode: z.enum(["INCLUSIVE", "EXCLUSIVE"]).default("EXCLUSIVE"),
    items: z
      .array(saleItemInputSchema)
      .min(1, { message: "Minimal satu produk di keranjang" }),
    payments: z
      .array(salePaymentInputSchema)
      .min(1, { message: "Minimal satu metode pembayaran" }),
    paperSize: z.enum(["58MM", "80MM"]).default("80MM"),
  })
  .refine((payload) => payload.applyTax || payload.taxRate === undefined, {
    message: "Tarif PPN hanya diisi saat PPN aktif",
    path: ["taxRate"],
  });

export const saleTotalsSchema = z.object({
  totalGross: z.number(),
  totalDiscount: z.number(),
  totalNet: z.number(),
  totalItems: z.number(),
  totalCash: z.number(),
  totalTax: z.number(),
});

export const saleSummarySchema = z.object({
  id: z.string(),
  outletId: z.string(),
  receiptNumber: z.string(),
  totalNet: z.number(),
  soldAt: z.string(),
  paymentMethods: z.array(z.nativeEnum(PaymentMethod)),
});

export const dailySummaryOutputSchema = z.object({
  date: z.string(),
  totals: saleTotalsSchema,
  sales: z.array(saleSummarySchema),
});

export const recentSalesOutputSchema = z.array(
  z.object({
    id: z.string(),
    outletId: z.string(),
    receiptNumber: z.string(),
    soldAt: z.string(),
    totalNet: z.number(),
    totalItems: z.number(),
  }),
);

export const recordSaleOutputSchema = z.object({
  id: z.string(),
  receiptNumber: z.string(),
  totalNet: z.number(),
  soldAt: z.string(),
  taxAmount: z.number().nullable(),
});

export const printReceiptInputSchema = z.object({
  saleId: z.string().min(1, { message: "Transaksi tidak valid" }),
  paperSize: z.enum(["58MM", "80MM"]).default("80MM").optional(),
});

export const printReceiptOutputSchema = z.object({
  filename: z.string(),
  base64: z.string(),
});

export const forecastOutputSchema = z.object({
  suggestedFloat: z.number(),
});

export const listRecentInputSchema = z.object({
  limit: z
    .number("Batas harus berupa angka")
    .int({ message: "Batas harus bilangan bulat" })
    .min(1, { message: "Minimal 1 transaksi" })
    .max(50, { message: "Maksimal 50 transaksi" })
    .default(10),
});

export const dailySummaryInputSchema = z.object({
  date: z.string().optional(),
  outletId: z.string().optional(),
});

export const forecastInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib diisi" }),
});

export type SalePaperSize = z.infer<typeof recordSaleInputSchema>["paperSize"];
