import { z } from "zod";

import { TRPCError } from "@trpc/server";

import { Prisma } from "@/generated/prisma";
import { slugify } from "@/lib/utils";
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
          supplier: true,
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
        supplierId: product.supplierId,
        supplier: product.supplier?.name ?? null,
        costPrice: product.costPrice ? Number(product.costPrice) : null,
        isActive: product.isActive,
        defaultDiscountPercent: product.defaultDiscountPercent
          ? Number(product.defaultDiscountPercent)
          : null,
        promoName: product.promoName,
        promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
        promoStart: product.promoStart?.toISOString() ?? null,
        promoEnd: product.promoEnd?.toISOString() ?? null,
        isTaxable: product.isTaxable,
        taxRate: product.taxRate ? Number(product.taxRate) : null,
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
        defaultDiscountPercent: z.number().min(0).max(100).optional(),
        promoName: z.string().max(120).optional(),
        promoPrice: z.number().min(0).optional(),
        promoStart: z.string().datetime().optional(),
        promoEnd: z.string().datetime().optional(),
        isTaxable: z.boolean().optional(),
        taxRate: z.number().min(0).max(100).optional(),
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
          defaultDiscountPercent: toDecimal(input.defaultDiscountPercent ?? undefined),
          promoName: input.promoName,
          promoPrice: toDecimal(input.promoPrice ?? undefined),
          promoStart: input.promoStart ? new Date(input.promoStart) : null,
          promoEnd: input.promoEnd ? new Date(input.promoEnd) : null,
          isTaxable: input.isTaxable ?? false,
          taxRate: toDecimal(input.taxRate ?? undefined),
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
          defaultDiscountPercent: toDecimal(input.defaultDiscountPercent ?? undefined),
          promoName: input.promoName,
          promoPrice: toDecimal(input.promoPrice ?? undefined),
          promoStart: input.promoStart ? new Date(input.promoStart) : undefined,
          promoEnd: input.promoEnd ? new Date(input.promoEnd) : undefined,
          isTaxable: input.isTaxable ?? false,
          taxRate: toDecimal(input.taxRate ?? undefined),
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
  upsertCategory: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const slug = slugify(input.name);

      const category = await db.category.upsert({
        where: {
          id: input.id ?? "",
        },
        update: {
          name: input.name,
          slug,
        },
        create: {
          name: input.name,
          slug,
        },
      });

      return category;
    }),
  deleteCategory: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await db.category.delete({
          where: {
            id: input.id,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Kategori masih digunakan oleh produk lain.",
          });
        }

        throw error;
      }

      return { success: true } as const;
    }),
  suppliers: protectedProcedure.query(async () => {
    const suppliers = await db.supplier.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return suppliers;
  }),
  upsertSupplier: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const supplier = await db.supplier.upsert({
        where: {
          id: input.id ?? "",
        },
        update: {
          name: input.name,
          email: input.email,
          phone: input.phone,
        },
        create: {
          name: input.name,
          email: input.email,
          phone: input.phone,
        },
      });

      return supplier;
    }),
  deleteSupplier: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await db.supplier.delete({
          where: {
            id: input.id,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Supplier masih digunakan oleh produk lain.",
          });
        }

        throw error;
      }

      return { success: true } as const;
    }),
});
