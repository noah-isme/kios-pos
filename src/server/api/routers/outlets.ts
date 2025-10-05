import { z } from "zod";

import { TRPCError } from "@trpc/server";

import { Role, StockMovementType } from "@/generated/prisma";
import { db } from "@/server/db";
import {
  protectedProcedure,
  roleProtectedProcedure,
  router,
} from "@/server/api/trpc";

export const outletsRouter = router({
  list: protectedProcedure.query(async () => {
    const outlets = await db.outlet.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return outlets;
  }),
  upsert: roleProtectedProcedure([Role.ADMIN, Role.OWNER])
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
  adjustStock: roleProtectedProcedure([Role.ADMIN, Role.OWNER])
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
            type: StockMovementType.ADJUSTMENT,
            quantity: input.quantity,
            note: input.note,
          },
        });

        return inventory;
      });
    }),
  transferStock: roleProtectedProcedure([Role.ADMIN, Role.OWNER])
    .input(
      z.object({
        productId: z.string(),
        fromOutletId: z.string(),
        toOutletId: z.string(),
        quantity: z.number().int().positive(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.fromOutletId === input.toOutletId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Outlet asal dan tujuan tidak boleh sama",
        });
      }

      return await db.$transaction(async (tx) => {
        const sourceExisting = await tx.inventory.findUnique({
          where: {
            productId_outletId: {
              productId: input.productId,
              outletId: input.fromOutletId,
            },
          },
        });

        if (!sourceExisting || sourceExisting.quantity < input.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stok tidak mencukupi untuk transfer",
          });
        }

        const source = await tx.inventory.update({
          where: { id: sourceExisting.id },
          data: {
            quantity: {
              decrement: input.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            inventoryId: source.id,
            type: StockMovementType.TRANSFER_OUT,
            quantity: -input.quantity,
            note: input.note,
          },
        });

        const destination = await tx.inventory.upsert({
          where: {
            productId_outletId: {
              productId: input.productId,
              outletId: input.toOutletId,
            },
          },
          update: {
            quantity: {
              increment: input.quantity,
            },
          },
          create: {
            productId: input.productId,
            outletId: input.toOutletId,
            quantity: input.quantity,
          },
        });

        await tx.stockMovement.create({
          data: {
            inventoryId: destination.id,
            type: StockMovementType.TRANSFER_IN,
            quantity: input.quantity,
            note: input.note,
          },
        });

        return { success: true } as const;
      });
    }),
  performOpname: roleProtectedProcedure([Role.ADMIN, Role.OWNER])
    .input(
      z.object({
        outletId: z.string(),
        entries: z
          .array(
            z.object({
              productId: z.string(),
              countedQuantity: z.number().int().min(0),
              note: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.$transaction(async (tx) => {
        const results = [] as Array<{ productId: string; newQuantity: number }>;

        for (const entry of input.entries) {
          const existing = await tx.inventory.findUnique({
            where: {
              productId_outletId: {
                productId: entry.productId,
                outletId: input.outletId,
              },
            },
          });

          const difference = entry.countedQuantity - (existing?.quantity ?? 0);

          let inventoryId: string;
          if (existing) {
            const updated = await tx.inventory.update({
              where: { id: existing.id },
              data: { quantity: entry.countedQuantity },
            });
            inventoryId = updated.id;
          } else {
            const created = await tx.inventory.create({
              data: {
                productId: entry.productId,
                outletId: input.outletId,
                quantity: entry.countedQuantity,
              },
            });
            inventoryId = created.id;
          }

          if (difference !== 0) {
            await tx.stockMovement.create({
              data: {
                inventoryId,
                type: StockMovementType.ADJUSTMENT,
                quantity: difference,
                note: entry.note ?? "Stock opname",
              },
            });
          }

          results.push({ productId: entry.productId, newQuantity: entry.countedQuantity });
        }

        return { success: true, entries: results } as const;
      });
    }),
});
