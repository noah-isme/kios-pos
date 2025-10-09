import { z } from "zod";

export const taxSettingSchema = z.object({
  id: z.string(),
  name: z.string(),
  rate: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listTaxSettingsOutputSchema = z.array(taxSettingSchema);

export const upsertTaxSettingInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Nama pengaturan PPN wajib diisi" }),
  rate: z
    .number("Tarif harus berupa angka")
    .min(0, { message: "Tarif minimal 0%" })
    .max(100, { message: "Tarif maksimal 100%" }),
  isActive: z.boolean().optional(),
});

export const simpleSuccessSchema = z.object({ success: z.literal(true) });

export const activateTaxSettingInputSchema = z.object({
  id: z.string().min(1, { message: "Pilih pengaturan PPN" }),
});

export const activeTaxSettingOutputSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    rate: z.number(),
  })
  .nullable();
