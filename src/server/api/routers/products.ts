import { TRPCError } from "@trpc/server";

import { Prisma } from "@/generated/prisma";
import { slugify } from "@/lib/utils";
import {
  categoryListOutputSchema,
  categorySchema,
  deleteCategoryInputSchema,
  deleteSupplierInputSchema,
  productByBarcodeInputSchema,
  productByBarcodeOutputSchema,
  productListInputSchema,
  productListOutputSchema,
  productUpsertInputSchema,
  productUpsertOutputSchema,
  supplierListOutputSchema,
  supplierSchema,
  upsertCategoryInputSchema,
  upsertSupplierInputSchema,
  simpleSuccessSchema,
} from "@/server/api/schemas/products";
import { db } from "@/server/db";
import { protectedProcedure, publicProcedure, router } from "@/server/api/trpc";

const toDecimal = (value?: number | null) =>
  typeof value === "number" ? new Prisma.Decimal(value.toFixed(2)) : undefined;

export const productsRouter = router({
  list: protectedProcedure
    .input(productListInputSchema)
    .output(productListOutputSchema)
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

      return productListOutputSchema.parse(
        products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: Number(product.price),
          categoryId: product.categoryId,
          category: product.category?.name ?? null,
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
        })),
      );
    }),
  getByBarcode: publicProcedure
    .input(productByBarcodeInputSchema)
    .output(productByBarcodeOutputSchema)
    .query(async ({ input }) => {
      const product = await db.product.findFirst({
        where: {
          barcode: input.barcode,
          isActive: true,
        },
      });

      if (!product) {
      return productByBarcodeOutputSchema.parse(null);
    }

      return productByBarcodeOutputSchema.parse({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
      });
    }),
  upsert: protectedProcedure
    .input(productUpsertInputSchema)
    .output(productUpsertOutputSchema)
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

      return productUpsertOutputSchema.parse({
        id: product.id,
      });
    }),
  categories: protectedProcedure.query(async () => {
    const categories = await db.category.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return categoryListOutputSchema.parse(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      })),
    );
  }),
  upsertCategory: protectedProcedure
    .input(upsertCategoryInputSchema)
    .output(categorySchema)
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

      return categorySchema.parse({
        id: category.id,
        name: category.name,
        slug: category.slug,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      });
    }),
  deleteCategory: protectedProcedure
    .input(deleteCategoryInputSchema)
    .output(simpleSuccessSchema)
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

      return simpleSuccessSchema.parse({ success: true });
    }),
  suppliers: protectedProcedure.query(async () => {
    const suppliers = await db.supplier.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return supplierListOutputSchema.parse(
      suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email ?? null,
        phone: supplier.phone ?? null,
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
      })),
    );
  }),
  upsertSupplier: protectedProcedure
    .input(upsertSupplierInputSchema)
    .output(supplierSchema)
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

      return supplierSchema.parse({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email ?? null,
        phone: supplier.phone ?? null,
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
      });
    }),
  deleteSupplier: protectedProcedure
    .input(deleteSupplierInputSchema)
    .output(simpleSuccessSchema)
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

      return simpleSuccessSchema.parse({ success: true });
    }),
});
