import { TRPCError } from "@trpc/server";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { z } from "zod";

import { PaymentMethod, Prisma } from "@/generated/prisma";
import { generateReceiptPdf } from "@/lib/pdf";
import { db } from "@/server/db";
import { protectedProcedure, router } from "@/server/api/trpc";

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const salesRouter = router({
  getDailySummary: protectedProcedure
    .input(
      z.object({
        date: z.string().optional(),
        outletId: z.string().optional(),
      }),
    )
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

          return acc;
        },
        {
          totalGross: 0,
          totalDiscount: 0,
          totalNet: 0,
          totalItems: 0,
          totalCash: 0,
        },
      );

      return {
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
      };
    }),
  listRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ input }) => {
      const sales = await db.sale.findMany({
        take: input.limit,
        orderBy: {
          soldAt: "desc",
        },
        include: {
          items: true,
        },
      });

      return sales.map((sale) => ({
        id: sale.id,
        outletId: sale.outletId,
        receiptNumber: sale.receiptNumber,
        soldAt: sale.soldAt.toISOString(),
        totalNet: Number(sale.totalNet),
        totalItems: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      }));
    }),
  recordSale: protectedProcedure
    .input(
      z.object({
        outletId: z.string(),
        receiptNumber: z.string(),
        soldAt: z.string().datetime().optional(),
        discountTotal: z.number().min(0).default(0),
        items: z
          .array(
            z.object({
              productId: z.string(),
              quantity: z.number().int().positive(),
              unitPrice: z.number().min(0),
              discount: z.number().min(0).default(0),
            }),
          )
          .min(1),
        payments: z
          .array(
            z.object({
              method: z.nativeEnum(PaymentMethod),
              amount: z.number().min(0),
              reference: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const totalGross = input.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      const totalDiscount = input.items.reduce(
        (sum, item) => sum + item.discount,
        0,
      );
      const netAfterDiscount = totalGross - totalDiscount - input.discountTotal;

      const sale = await db.$transaction(async (tx) => {
        const createdSale = await tx.sale.create({
          data: {
            receiptNumber: input.receiptNumber,
            outletId: input.outletId,
            cashierId: ctx.session?.user.id,
            soldAt: input.soldAt ? new Date(input.soldAt) : new Date(),
            totalGross: toDecimal(totalGross),
            discountTotal: toDecimal(totalDiscount + input.discountTotal),
            totalNet: toDecimal(netAfterDiscount),
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: toDecimal(item.unitPrice),
                discount: toDecimal(item.discount),
                total: toDecimal(item.unitPrice * item.quantity - item.discount),
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

      return {
        id: sale.id,
        receiptNumber: sale.receiptNumber,
        totalNet: Number(sale.totalNet),
        soldAt: sale.soldAt.toISOString(),
      };
    }),
  printReceipt: protectedProcedure
    .input(
      z.object({
        saleId: z.string(),
      }),
    )
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

      const pdf = await generateReceiptPdf({
        sale,
        items: sale.items,
        payments: sale.payments,
      });

      return {
        filename: `${sale.receiptNumber}.pdf`,
        base64: pdf.toString("base64"),
      };
    }),
  forecastNextDay: protectedProcedure
    .input(
      z.object({
        outletId: z.string(),
      }),
    )
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

      return {
        suggestedFloat: Number(averageDailySales.toFixed(2)),
      };
    }),
});
