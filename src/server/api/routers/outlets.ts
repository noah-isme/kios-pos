import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/server/db";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  outletListOutputSchema,
  outletUpsertInputSchema,
} from "@/server/api/schemas/outlets";

export const outletsRouter = router({
  list: protectedProcedure
    .output(outletListOutputSchema)
    .query(async () => {
      const outlets = await db.outlet.findMany({
        orderBy: {
          name: "asc",
        },
      });

      return outletListOutputSchema.parse(
        outlets.map((outlet) => ({
          id: outlet.id,
          name: outlet.name,
          code: outlet.code,
          address: outlet.address ?? null,
          createdAt: outlet.createdAt.toISOString(),
          updatedAt: outlet.updatedAt.toISOString(),
        })),
      );
    }),
  upsert: protectedProcedure
    .input(outletUpsertInputSchema)
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
  transferStock: protectedProcedure
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
          message: "Outlet asal dan tujuan harus berbeda",
        });
      }

      return await db.$transaction(async (tx) => {
        const source = await tx.inventory.findUnique({
          where: {
            productId_outletId: {
              productId: input.productId,
              outletId: input.fromOutletId,
            },
          },
        });

        if (!source || source.quantity < input.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stok di outlet asal tidak mencukupi",
          });
        }

        const updatedSource = await tx.inventory.update({
          where: { id: source.id },
          data: {
            quantity: {
              decrement: input.quantity,
            },
          },
        });

        const target = await tx.inventory.upsert({
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

        await tx.stockMovement.createMany({
          data: [
            {
              inventoryId: updatedSource.id,
              type: "TRANSFER_OUT",
              quantity: -input.quantity,
              note: input.note,
            },
            {
              inventoryId: target.id,
              type: "TRANSFER_IN",
              quantity: input.quantity,
              note: input.note,
            },
          ],
        });

        return {
          from: updatedSource,
          to: target,
        };
      });
    }),
  performOpname: protectedProcedure
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
        const results: Array<{ productId: string; quantity: number; difference: number }> = [];

        for (const entry of input.entries) {
          const existing = await tx.inventory.findUnique({
            where: {
              productId_outletId: {
                productId: entry.productId,
                outletId: input.outletId,
              },
            },
          });

          const previousQuantity = existing?.quantity ?? 0;

          const inventory = existing
            ? await tx.inventory.update({
                where: { id: existing.id },
                data: {
                  quantity: entry.countedQuantity,
                },
              })
            : await tx.inventory.create({
                data: {
                  productId: entry.productId,
                  outletId: input.outletId,
                  quantity: entry.countedQuantity,
                },
              });

          const delta = entry.countedQuantity - previousQuantity;

          if (delta !== 0) {
            await tx.stockMovement.create({
              data: {
                inventoryId: inventory.id,
                type: "ADJUSTMENT",
                quantity: delta,
                note: entry.note,
              },
            });
          }

          results.push({
            productId: inventory.productId,
            quantity: inventory.quantity,
            difference: delta,
          });
        }

        return results;
      });
    }),
});
