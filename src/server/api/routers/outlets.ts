import { z } from "zod";

import { db } from "@/server/db";
import { protectedProcedure, router } from "@/server/api/trpc";

export const outletsRouter = router({
  list: protectedProcedure.query(async () => {
    const outlets = await db.outlet.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return outlets;
  }),
  upsert: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        code: z.string().min(1),
        address: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const outlet = await db.outlet.upsert({
        where: {
          id: input.id ?? "",
        },
        update: {
          name: input.name,
          code: input.code,
          address: input.address,
        },
        create: {
          name: input.name,
          code: input.code,
          address: input.address,
        },
      });

      return outlet;
    }),
  getStockSnapshot: protectedProcedure
    .input(
      z.object({
        outletId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const inventory = await db.inventory.findMany({
        where: {
          outletId: input.outletId,
        },
        include: {
          product: true,
        },
      });

      return inventory.map((row) => ({
        productId: row.productId,
        productName: row.product.name,
        sku: row.product.sku,
        quantity: row.quantity,
        costPrice: row.costPrice ? Number(row.costPrice) : null,
      }));
    }),
  adjustStock: protectedProcedure
    .input(
      z.object({
        outletId: z.string(),
        productId: z.string(),
        quantity: z.number().int(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.$transaction(async (tx) => {
        const inventory = await tx.inventory.upsert({
          where: {
            productId_outletId: {
              productId: input.productId,
              outletId: input.outletId,
            },
          },
          update: {
            quantity: {
              increment: input.quantity,
            },
          },
          create: {
            productId: input.productId,
            outletId: input.outletId,
            quantity: input.quantity,
          },
        });

        await tx.stockMovement.create({
          data: {
            inventoryId: inventory.id,
            type: input.quantity >= 0 ? "ADJUSTMENT" : "ADJUSTMENT",
            quantity: input.quantity,
            note: input.note,
          },
        });

        return inventory;
      });
    }),
});
