import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { addDays, endOfDay, startOfDay } from "date-fns";

import { PaymentMethod, Prisma } from "@/server/db/enums";
import { env } from "@/env";
import { generateReceiptPdf } from "@/lib/pdf";
import {
  dailySummaryInputSchema,
  dailySummaryOutputSchema,
  forecastInputSchema,
  forecastOutputSchema,
  listRecentInputSchema,
  recentSalesOutputSchema,
  recordSaleInputSchema,
  recordSaleOutputSchema,
  printReceiptInputSchema,
  printReceiptOutputSchema,
  refundSaleInputSchema,
  refundSaleOutputSchema,
  saleActionOutputSchema,
  voidSaleInputSchema,
} from "@/server/api/schemas/sales";
import {
  SaleValidationError,
  calculateFinancials,
  ensurePaymentsCoverTotal,
  enforceDiscountLimit,
  normalizePaperSize,
} from "@/server/api/services/sales-validation";
import { db } from "@/server/db";
import { protectedProcedure, router } from "@/server/api/trpc";

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const salesRouter = router({
  getDailySummary: protectedProcedure
    .input(dailySummaryInputSchema)
    .output(dailySummaryOutputSchema)
    .query(async ({ input, ctx }) => {
      const baseDate = input.date ? new Date(input.date) : new Date();
      const rangeStart = startOfDay(baseDate);
      const rangeEnd = endOfDay(baseDate);

      const sales = await db.sale.findMany({
        where: {
          soldAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
          outletId: input.outletId ?? undefined,
          cashierId: ctx.session?.user.id,
        },
        include: {
          items: true,
          payments: true,
        },
        orderBy: {
          soldAt: "desc",
        },
      });

      const totals = sales.reduce(
        (acc, sale) => {
          const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
          const cashPaid = sale.payments
            .filter((payment) => payment.method === PaymentMethod.CASH)
            .reduce((sum, payment) => sum + Number(payment.amount), 0);

          acc.totalGross += Number(sale.totalGross);
          acc.totalDiscount += Number(sale.discountTotal);
          acc.totalNet += Number(sale.totalNet);
          acc.totalItems += totalItems;
          acc.totalCash += cashPaid;
          acc.totalTax += sale.taxAmount ? Number(sale.taxAmount) : 0;

          return acc;
        },
        {
          totalGross: 0,
          totalDiscount: 0,
          totalNet: 0,
          totalItems: 0,
          totalCash: 0,
          totalTax: 0,
        },
      );

      return dailySummaryOutputSchema.parse({
        date: rangeStart.toISOString(),
        totals,
        sales: sales.map((sale) => ({
          id: sale.id,
          outletId: sale.outletId,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          soldAt: sale.soldAt.toISOString(),
          paymentMethods: sale.payments.map((payment) => payment.method),
        })),
      });
    }),
  listRecent: protectedProcedure
    .input(listRecentInputSchema)
    .output(recentSalesOutputSchema)
    .query(async ({ input, ctx }) => {
      // Get user's current outlet from database (first active outlet)
      const userOutlet = await db.userOutlet.findFirst({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
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

      if (!userOutlet) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User tidak memiliki akses ke outlet manapun",
        });
      }

      const sales = await db.sale.findMany({
        where: {
          outletId: userOutlet.outletId,
        },
        take: input.limit,
        orderBy: {
          soldAt: "desc",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return recentSalesOutputSchema.parse(
        sales.map((sale) => ({
          id: sale.id,
          outletId: sale.outletId,
          receiptNumber: sale.receiptNumber,
          soldAt: sale.soldAt.toISOString(),
          totalNet: Number(sale.totalNet),
          totalItems: sale.items.reduce((sum, item) => sum + item.quantity, 0),
          status: sale.status,
          items: sale.items.map((item) => ({
            productName: item.product?.name ?? "Produk",
            quantity: item.quantity,
          })),
        })),
      );
    }),
  recordSale: protectedProcedure
    .input(recordSaleInputSchema)
    .output(recordSaleOutputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const financials = calculateFinancials({
          items: input.items,
          discountTotal: input.discountTotal,
          applyTax: input.applyTax,
          taxRate: input.taxRate,
          taxMode: input.taxMode,
        });

        enforceDiscountLimit(
          financials.totalGross,
          financials.totalDiscount,
          env.DISCOUNT_LIMIT_PERCENT,
        );

        ensurePaymentsCoverTotal(input.payments, financials.totalNet);

        const sale = await db.$transaction(async (tx) => {
          const createdSale = await tx.sale.create({
            data: {
              receiptNumber: input.receiptNumber,
              outletId: input.outletId,
              cashierId: ctx.session?.user.id,
              soldAt: input.soldAt ? new Date(input.soldAt) : new Date(),
            totalGross: toDecimal(financials.totalGross),
            discountTotal: toDecimal(financials.totalDiscount),
            totalNet: toDecimal(financials.totalNet),
            taxRate:
              input.applyTax && input.taxRate
                ? toDecimal(input.taxRate)
                : undefined,
            taxAmount: financials.taxAmount
              ? toDecimal(financials.taxAmount)
              : undefined,
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: toDecimal(item.unitPrice),
                discount: toDecimal(item.discount),
                total: toDecimal(item.unitPrice * item.quantity - item.discount),
                taxAmount:
                  input.applyTax && (item.taxable ?? true) && financials.taxableBase > 0
                    ? toDecimal(
                        ((item.unitPrice * item.quantity - item.discount) /
                          financials.taxableBase) *
                          financials.taxAmount,
                      )
                    : undefined,
              })),
            },
            payments: {
              create: input.payments.map((payment) => ({
                method: payment.method,
                amount: toDecimal(payment.amount),
                reference: payment.reference,
              })),
            },
          },
          include: {
            items: true,
            payments: true,
          },
        });

        await Promise.all(
          input.items.map(async (item) => {
            const inventory = await tx.inventory.upsert({
              where: {
                productId_outletId: {
                  productId: item.productId,
                  outletId: input.outletId,
                },
              },
              create: {
                productId: item.productId,
                outletId: input.outletId,
                quantity: -item.quantity,
                costPrice: toDecimal(item.unitPrice),
              },
              update: {
                quantity: {
                  decrement: item.quantity,
                },
              },
            });

            await tx.stockMovement.create({
              data: {
                inventoryId: inventory.id,
                type: "SALE",
                quantity: -item.quantity,
                reference: createdSale.id,
                note: `Penjualan ${createdSale.receiptNumber}`,
              },
            });
          }),
        );

        return createdSale;
        });

        return recordSaleOutputSchema.parse({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          soldAt: sale.soldAt.toISOString(),
          taxAmount: sale.taxAmount ? Number(sale.taxAmount) : null,
        });
      } catch (error) {
        if (error instanceof SaleValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        throw error;
      }
    }),
  printReceipt: protectedProcedure
    .input(printReceiptInputSchema)
    .output(printReceiptOutputSchema)
    .mutation(async ({ input }) => {
      const sale = await db.sale.findUnique({
        where: {
          id: input.saleId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
          outlet: true,
          cashier: true,
        },
      });

      if (!sale) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan" });
      }

      const paperSize = normalizePaperSize(input.paperSize);
      const pdf = await generateReceiptPdf({
        sale,
        items: sale.items,
        payments: sale.payments,
        paperSize,
      });

      return printReceiptOutputSchema.parse({
        filename: `${sale.receiptNumber}.pdf`,
        base64: Buffer.from(pdf).toString("base64"),
      });
    }),
  voidSale: protectedProcedure
    .input(voidSaleInputSchema)
    .output(saleActionOutputSchema)
    .mutation(async ({ input }) => {
      return await db.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({
          where: {
            id: input.saleId,
          },
          include: {
            items: true,
          },
        });

        if (!sale) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan" });
        }

        if (sale.status !== "COMPLETED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Transaksi sudah diproses sebelumnya" });
        }

        let restockedQuantity = 0;

        for (const item of sale.items) {
          restockedQuantity += item.quantity;
          const inventory = await tx.inventory.upsert({
            where: {
              productId_outletId: {
                productId: item.productId,
                outletId: sale.outletId,
              },
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
            create: {
              productId: item.productId,
              outletId: sale.outletId,
              quantity: item.quantity,
              costPrice: toDecimal(Number(item.unitPrice)),
            },
          });

          await tx.stockMovement.create({
            data: {
              inventoryId: inventory.id,
              type: "ADJUSTMENT",
              quantity: item.quantity,
              reference: sale.id,
              note: `Void struk ${sale.receiptNumber}`,
            },
          });
        }

        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: "VOIDED",
            updatedAt: new Date(),
          },
        });

        return saleActionOutputSchema.parse({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          totalItems,
          restockedQuantity,
          status: "VOIDED",
        });
      });
    }),
  refundSale: protectedProcedure
    .input(refundSaleInputSchema)
    .output(refundSaleOutputSchema)
    .mutation(async ({ input, ctx }) => {
      return await db.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({
          where: {
            id: input.saleId,
          },
          include: {
            items: true,
            refunds: true,
          },
        });

        if (!sale) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan" });
        }

        if (sale.status !== "COMPLETED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Transaksi tidak dapat direfund" });
        }

        if (sale.refunds.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Refund sudah diproses" });
        }

        const refundAmount = input.amount ?? Number(sale.totalNet);
        let restockedQuantity = 0;

        for (const item of sale.items) {
          restockedQuantity += item.quantity;
          const inventory = await tx.inventory.upsert({
            where: {
              productId_outletId: {
                productId: item.productId,
                outletId: sale.outletId,
              },
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
            create: {
              productId: item.productId,
              outletId: sale.outletId,
              quantity: item.quantity,
              costPrice: toDecimal(Number(item.unitPrice)),
            },
          });

          await tx.stockMovement.create({
            data: {
              inventoryId: inventory.id,
              type: "ADJUSTMENT",
              quantity: item.quantity,
              reference: sale.id,
              note: `Refund struk ${sale.receiptNumber}`,
            },
          });
        }

        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: "REFUNDED",
            updatedAt: new Date(),
          },
        });

        await tx.refund.create({
          data: {
            saleId: sale.id,
            amount: toDecimal(refundAmount),
            reason: input.reason,
            approvedById: ctx.session?.user.id,
          },
        });

        return refundSaleOutputSchema.parse({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          totalItems,
          restockedQuantity,
          status: "REFUNDED",
          refundAmount,
        });
      });
    }),
  forecastNextDay: protectedProcedure
    .input(forecastInputSchema)
    .output(forecastOutputSchema)
    .query(async ({ input }) => {
      const today = startOfDay(new Date());
      const weekAgo = addDays(today, -7);

      const aggregates = await db.sale.groupBy({
        by: ["outletId"],
        where: {
          soldAt: {
            gte: weekAgo,
            lt: today,
          },
          outletId: input.outletId,
        },
        _sum: {
          totalNet: true,
        },
        _count: {
          _all: true,
        },
      });

      const summary = aggregates[0];

      if (!summary || !summary._sum.totalNet) {
        return {
          suggestedFloat: 0,
        };
      }

      const averageDailySales = Number(summary._sum.totalNet) / 7;

      return forecastOutputSchema.parse({
        suggestedFloat: Number(averageDailySales.toFixed(2)),
      });
    }),
  getLastNDays: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(30).default(7),
      }),
    )
    .query(async ({ input }) => {
      const days = input.days;
      const results: Array<{ date: string; totalNet: number; count: number }> = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = addDays(startOfDay(new Date()), -i);
        const rangeStart = startOfDay(date);
        const rangeEnd = endOfDay(date);

        const sales = await db.sale.findMany({
          where: {
            soldAt: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
          include: { items: true },
        });

        const totalNet = sales.reduce((acc, s) => acc + Number(s.totalNet), 0);

        results.push({ date: rangeStart.toISOString(), totalNet, count: sales.length });
      }

      return results;
    }),
});
