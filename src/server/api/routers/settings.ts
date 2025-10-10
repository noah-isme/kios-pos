import { Prisma } from "@/server/db/enums";
import {
  activateTaxSettingInputSchema,
  activeTaxSettingOutputSchema,
  listTaxSettingsOutputSchema,
  simpleSuccessSchema,
  taxSettingSchema,
  upsertTaxSettingInputSchema,
} from "@/server/api/schemas/settings";
import { db } from "@/server/db";
import { protectedProcedure, publicProcedure, router } from "@/server/api/trpc";

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const settingsRouter = router({
  listTaxSettings: protectedProcedure
    .output(listTaxSettingsOutputSchema)
    .query(async () => {
      const settings = await db.taxSetting.findMany({
        orderBy: {
          createdAt: "asc",
        },
      });

      return listTaxSettingsOutputSchema.parse(
        settings.map((setting) => ({
          id: setting.id,
          name: setting.name,
          rate: Number(setting.rate),
          isActive: setting.isActive,
          createdAt: setting.createdAt.toISOString(),
          updatedAt: setting.updatedAt.toISOString(),
        })),
      );
    }),
  upsertTaxSetting: protectedProcedure
    .input(upsertTaxSettingInputSchema)
    .output(taxSettingSchema.pick({ id: true }))
    .mutation(async ({ input }) => {
      return await db.$transaction(async (tx) => {
        const setting = await tx.taxSetting.upsert({
          where: {
            id: input.id ?? "",
          },
          update: {
            name: input.name,
            rate: toDecimal(input.rate),
            isActive: input.isActive ?? false,
          },
          create: {
            name: input.name,
            rate: toDecimal(input.rate),
            isActive: input.isActive ?? false,
          },
        });

        if (input.isActive) {
          await tx.taxSetting.updateMany({
            where: {
              id: {
                not: setting.id,
              },
            },
            data: {
              isActive: false,
            },
          });
        }

        return taxSettingSchema.pick({ id: true }).parse({
          id: setting.id,
        });
      });
    }),
  activateTaxSetting: protectedProcedure
    .input(activateTaxSettingInputSchema)
    .output(simpleSuccessSchema)
    .mutation(async ({ input }) => {
      await db.$transaction(async (tx) => {
        await tx.taxSetting.updateMany({
          data: {
            isActive: false,
          },
        });

        await tx.taxSetting.update({
          where: {
            id: input.id,
          },
          data: {
            isActive: true,
          },
        });
      });

      return simpleSuccessSchema.parse({ success: true });
    }),
  getActiveTaxSetting: publicProcedure
    .output(activeTaxSettingOutputSchema)
    .query(async () => {
      const setting = await db.taxSetting.findFirst({
        where: {
          isActive: true,
        },
      });

      if (!setting) {
        return activeTaxSettingOutputSchema.parse(null);
      }

      return activeTaxSettingOutputSchema.parse({
        id: setting.id,
        name: setting.name,
        rate: Number(setting.rate),
      });
    }),
});
