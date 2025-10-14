import { z } from "zod";

export const outletSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  address: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const outletListOutputSchema = z.array(outletSchema);

export const outletUpsertInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Nama outlet wajib diisi" }),
  code: z.string().min(1, { message: "Kode outlet wajib diisi" }),
  address: z.string().optional(),
});

export const stockSnapshotInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib diisi" }),
});

export const stockSnapshotOutputSchema = z.array(
  z.object({
    productId: z.string(),
    productName: z.string(),
    sku: z.string(),
    quantity: z.number(),
    costPrice: z.number().nullable(),
  }),
);

export const adjustStockInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib diisi" }),
  productId: z.string().min(1, { message: "Produk wajib diisi" }),
  quantity: z
    .number("Jumlah harus berupa angka")
    .int({ message: "Jumlah harus bilangan bulat" }),
  note: z.string().max(180).optional(),
});

export const transferStockInputSchema = z.object({
  productId: z.string().min(1, { message: "Produk wajib diisi" }),
  fromOutletId: z.string().min(1, { message: "Outlet asal wajib diisi" }),
  toOutletId: z.string().min(1, { message: "Outlet tujuan wajib diisi" }),
  quantity: z
    .number("Jumlah harus berupa angka")
    .int({ message: "Jumlah harus bulat" })
    .positive({ message: "Jumlah minimal 1" }),
  note: z.string().max(180).optional(),
});

export const performOpnameInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib diisi" }),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number(),
      }),
    )
    .min(1, { message: "Masukkan minimal satu produk" }),
});
