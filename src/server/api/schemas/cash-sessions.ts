import { z } from "zod";

export const cashSessionUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

export const cashSessionSchema = z.object({
  id: z.string(),
  outletId: z.string(),
  userId: z.string(),
  openingCash: z.number(),
  closingCash: z.number().nullable(),
  expectedCash: z.number().nullable(),
  difference: z.number().nullable(),
  openTime: z.string(),
  closeTime: z.string().nullable(),
  user: cashSessionUserSchema.optional(),
});

export const openCashSessionInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
  openingCash: z.number().min(0, { message: "Kas awal tidak boleh negatif" }),
});

export const closeCashSessionInputSchema = z.object({
  sessionId: z.string().min(1, { message: "Sesi tidak valid" }),
  closingCash: z.number().min(0, { message: "Kas akhir tidak boleh negatif" }),
});

export const cashSessionSummarySchema = cashSessionSchema.extend({
  cashSalesTotal: z.number(),
});

export const cashSessionStatusSchema = z
  .object({
    activeSession: cashSessionSchema.nullable(),
  })
  .optional();

