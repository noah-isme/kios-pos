import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { db } from "@/server/db";
import { protectedProcedure, publicProcedure, router } from "@/server/api/trpc";

const toDecimal = (value?: number | null) =>
  typeof value === "number" ? new Prisma.Decimal(value.toFixed(2)) : undefined;

export const productsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        onlyActive: z.boolean().default(true),
        take: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      const products = await db.product.findMany({
        where: {
          isActive: input.onlyActive ? true : undefined,
          OR: input.search
            ? [
                { name: { contains: input.search, mode: "insensitive" } },
                { sku: { contains: input.search, mode: "insensitive" } },
                { barcode: { contains: input.search, mode: "insensitive" } },
              ]
            : undefined,
        },
        include: {
          category: true,
        },
        take: input.take,
        orderBy: {
          name: "asc",
        },
      });

      return products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: Number(product.price),
        categoryId: product.categoryId,
        category: product.category?.name,
        costPrice: product.costPrice ? Number(product.costPrice) : null,
        isActive: product.isActive,
      }));
    }),
  getByBarcode: publicProcedure
    .input(
      z.object({
        barcode: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const product = await db.product.findFirst({
        where: {
          barcode: input.barcode,
          isActive: true,
        },
      });

      if (!product) {
        return null;
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
      };
    }),
  upsert: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        sku: z.string().min(1),
        barcode: z.string().optional(),
        description: z.string().optional(),
        price: z.number().min(0),
        costPrice: z.number().min(0).optional(),
        categoryId: z.string().optional(),
        supplierId: z.string().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      const product = await db.product.upsert({
        where: {
          id: input.id ?? "",
        },
        update: {
          name: input.name,
          sku: input.sku,
          barcode: input.barcode,
          description: input.description,
          price: toDecimal(input.price)!,
          costPrice: toDecimal(input.costPrice ?? undefined),
          categoryId: input.categoryId,
          supplierId: input.supplierId,
          isActive: input.isActive,
        },
        create: {
          name: input.name,
          sku: input.sku,
          barcode: input.barcode,
          description: input.description,
          price: toDecimal(input.price)!,
          costPrice: toDecimal(input.costPrice ?? undefined),
          categoryId: input.categoryId,
          supplierId: input.supplierId,
          isActive: input.isActive,
        },
      });

      return {
        id: product.id,
      };
    }),
  categories: protectedProcedure.query(async () => {
    const categories = await db.category.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return categories;
  }),
});
