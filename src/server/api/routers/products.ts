import { TRPCError } from "@trpc/server";

import { Prisma, StockMovementType } from "@prisma/client";
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
  productInventoryInputSchema,
  productInventoryListSchema,
  stockMovementListInputSchema,
  stockMovementListOutputSchema,
  stockAdjustmentInputSchema,
  stockAdjustmentOutputSchema,
} from "@/server/api/schemas/products";
import { db } from "@/server/db";
import { protectedProcedure, publicProcedure, router } from "@/server/api/trpc";

const toDecimal = (value?: number | null) =>
  typeof value === "number" ? new Prisma.Decimal(value.toFixed(2)) : undefined;

const mapMovement = (movement: {
  id: string;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  reference: string | null;
  occurredAt: Date;
  inventory: { outlet: { name: string } };
  createdBy: { name: string | null } | null;
}) => ({
  id: movement.id,
  type: movement.type,
  quantity: movement.quantity,
  note: movement.note,
  reference: movement.reference,
  occurredAt: movement.occurredAt.toISOString(),
  outletName: movement.inventory.outlet.name,
  createdBy: movement.createdBy?.name ?? null,
});

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
  getInventoryByProduct: protectedProcedure
    .input(productInventoryInputSchema)
    .output(productInventoryListSchema)
    .query(async ({ input }) => {
      const inventories = await db.inventory.findMany({
        where: {
          productId: input.productId,
        },
        include: {
          outlet: true,
        },
        orderBy: {
          outlet: {
            name: "asc",
          },
        },
      });

      return productInventoryListSchema.parse(
        inventories.map((inventory) => ({
          outletId: inventory.outletId,
          outletName: inventory.outlet.name,
          quantity: inventory.quantity,
          updatedAt: inventory.updatedAt.toISOString(),
        })),
      );
    }),
  getStockMovements: protectedProcedure
    .input(stockMovementListInputSchema)
    .output(stockMovementListOutputSchema)
    .query(async ({ input }) => {
      const movements = await db.stockMovement.findMany({
        where: {
          inventory: {
            productId: input.productId,
          },
        },
        include: {
          inventory: {
            include: {
              outlet: true,
            },
          },
          createdBy: {
            select: { name: true },
          },
        },
        orderBy: {
          occurredAt: "desc",
        },
        take: input.limit,
      });

      return stockMovementListOutputSchema.parse(movements.map(mapMovement));
    }),
  createStockAdjustment: protectedProcedure
    .input(stockAdjustmentInputSchema)
    .output(stockAdjustmentOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const delta = input.type === "OUT" ? -input.quantity : input.quantity;
      const movementType =
        input.type === "IN"
          ? StockMovementType.IN
          : input.type === "OUT"
            ? StockMovementType.OUT
            : StockMovementType.ADJUSTMENT;

      return await db.$transaction(async (tx) => {
        const existing = await tx.inventory.findUnique({
          where: {
            productId_outletId: {
              productId: input.productId,
              outletId: input.outletId,
            },
          },
        });

        if (!existing && delta < 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stok belum tersedia untuk dikurangi",
          });
        }

        const inventory = existing
          ? await tx.inventory.update({
              where: { id: existing.id },
              data: {
                quantity: (() => {
                  const nextQuantity = existing.quantity + delta;
                  if (nextQuantity < 0) {
                    throw new TRPCError({
                      code: "BAD_REQUEST",
                      message: "Stok tidak mencukupi untuk pengurangan",
                    });
                  }
                  return nextQuantity;
                })(),
              },
            })
          : await tx.inventory.create({
              data: {
                productId: input.productId,
                outletId: input.outletId,
                quantity: delta,
              },
            });

        const movement = await tx.stockMovement.create({
          data: {
            inventoryId: inventory.id,
            type: movementType,
            quantity: delta,
            note: input.note,
            createdById: userId,
          },
          include: {
            inventory: {
              include: {
                outlet: true,
              },
            },
            createdBy: {
              select: { name: true },
            },
          },
        });

        return stockAdjustmentOutputSchema.parse({
          inventoryId: inventory.id,
          quantity: inventory.quantity,
          movement: mapMovement(movement),
        });
      });
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
