import { Prisma } from "@/generated/prisma";
import { db } from "@/server/db";
import { protectedProcedure, publicProcedure, router } from "@/server/api/trpc";
import { z } from "zod";

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const settingsRouter = router({
  listTaxSettings: protectedProcedure.query(async () => {
    const settings = await db.taxSetting.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return settings.map((setting) => ({
      id: setting.id,
      name: setting.name,
      rate: Number(setting.rate),
      isActive: setting.isActive,
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString(),
    }));
  }),
  upsertTaxSetting: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        rate: z.number().min(0).max(100),
        isActive: z.boolean().optional(),
      }),
    )
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

        return {
          id: setting.id,
        };
      });
    }),
  activateTaxSetting: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
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

      return { success: true } as const;
    }),
  getActiveTaxSetting: publicProcedure.query(async () => {
    const setting = await db.taxSetting.findFirst({
      where: {
        isActive: true,
      },
    });

    if (!setting) {
      return null;
    }

    return {
      id: setting.id,
      name: setting.name,
      rate: Number(setting.rate),
    };
  }),
});
