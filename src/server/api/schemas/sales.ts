import { z } from "zod";

import { PaymentMethod } from "@/server/db/enums";

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
  items: z.array(
    z.object({
      productName: z.string(),
      quantity: z.number(),
    }),
  ),
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
    status: z.string(),
    items: z.array(
      z.object({
        productName: z.string(),
        quantity: z.number(),
      }),
    ),
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

const saleActionBaseInputSchema = z.object({
  saleId: z.string().min(1, { message: "Transaksi tidak valid" }),
  reason: z
    .string()
    .max(200, { message: "Alasan maksimal 200 karakter" })
    .optional(),
});

export const voidSaleInputSchema = saleActionBaseInputSchema.extend({
  reason: z
    .string()
    .min(3, { message: "Alasan minimal 3 karakter" })
    .max(200, { message: "Alasan maksimal 200 karakter" }),
});

export const refundSaleInputSchema = saleActionBaseInputSchema.extend({
  amount: z
    .number()
    .min(0, { message: "Nominal refund tidak boleh negatif" })
    .optional(),
});

export const saleActionOutputSchema = z.object({
  id: z.string(),
  receiptNumber: z.string(),
  totalNet: z.number(),
  totalItems: z.number(),
  restockedQuantity: z.number(),
  status: z.string(),
});

export const refundSaleOutputSchema = saleActionOutputSchema.extend({
  refundAmount: z.number(),
});

export const dailySummaryInputSchema = z.object({
  date: z.string().optional(),
  outletId: z.string().optional(),
});

export const forecastInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib diisi" }),
});

export type SalePaperSize = z.infer<typeof recordSaleInputSchema>["paperSize"];

export const receiptListInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
  limit: z
    .number()
    .int({ message: "Batas harus bilangan bulat" })
    .min(1, { message: "Minimal 1 transaksi" })
    .max(50, { message: "Maksimal 50 transaksi" })
    .default(10),
});

export const receiptSummarySchema = z.object({
  id: z.string(),
  receiptNumber: z.string(),
  soldAt: z.string(),
  cashierName: z.string().nullable(),
  totalNet: z.number(),
  paymentMethods: z.array(z.nativeEnum(PaymentMethod)),
  status: z.string(),
});

export const receiptListOutputSchema = z.array(receiptSummarySchema);

export const weeklyTrendInputSchema = z.object({
  outletId: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

export const weeklyTrendPointSchema = z.object({
  date: z.string(),
  totalNet: z.number(),
  transactionCount: z.number(),
});

export const weeklyTrendSummarySchema = z.object({
  currentTotalNet: z.number(),
  previousTotalNet: z.number(),
  changePercent: z.number(),
  currentTransactionCount: z.number(),
  previousTransactionCount: z.number(),
});

export const weeklyTrendOutputSchema = z.object({
  series: z.array(weeklyTrendPointSchema),
  summary: weeklyTrendSummarySchema,
});
