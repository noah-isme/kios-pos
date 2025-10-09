import { http, HttpResponse } from "msw";
import superjson from "superjson";

import { PaymentMethod } from "@/generated/prisma";
import { generateReceiptPdf } from "@/lib/pdf";
import {
  MockDatabase,
  MockPayment,
  MockSale,
  MockSaleItem,
  ensureSeeded,
  readMockDb,
  writeMockDb,
} from "@/mocks/storage";

const wrapData = (id: number | string, data: unknown) => ({
  id,
  result: {
    data: superjson.serialize(data),
  },
});

const wrapError = (id: number | string, message: string) => ({
  id,
  error: {
    json: {
      message,
      code: "BAD_REQUEST",
    },
  },
});

const sumPayments = (payments: MockPayment[]) =>
  payments.reduce((sum, payment) => sum + payment.amount, 0);

const toBase64 = (bytes: Uint8Array) => {
  const binary = Array.from(bytes)
    .map((value) => String.fromCharCode(value))
    .join("");

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(binary, "binary").toString("base64");
  }

  return binary;
};

const buildSale = (
  db: MockDatabase,
  payload: {
    outletId: string;
    receiptNumber: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
    }>;
    payments: Array<{
      method: PaymentMethod;
      amount: number;
      reference?: string;
    }>;
    discountTotal: number;
  },
): MockSale => {
  const saleItems: MockSaleItem[] = payload.items.map((item, index) => {
    const product = db.products.find((product) => product.id === item.productId);
    return {
      id: `sale-item-${Date.now()}-${index}`,
      productId: item.productId,
      productName: product?.name ?? "Produk",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: item.unitPrice * item.quantity - item.discount,
      taxable: product?.isTaxable,
    };
  });

  const totalGross = saleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalItemDiscount = saleItems.reduce((sum, item) => sum + item.discount, 0);
  const totalDiscount = totalItemDiscount + payload.discountTotal;
  const totalNet = Math.max(totalGross - totalDiscount, 0);

  return {
    id: `sale-${Date.now()}`,
    receiptNumber: payload.receiptNumber,
    outletId: payload.outletId,
    soldAt: new Date().toISOString(),
    totalGross,
    discountTotal: totalDiscount,
    taxAmount: 0,
    totalNet,
    items: saleItems,
    payments: payload.payments,
  };
};

const routeCall = async (
  call: {
    id: string | number;
    path: string;
    input?: unknown;
    method: string;
  },
) => {
  await ensureSeeded();
  const db = await readMockDb();

  switch (call.path) {
    case "outlets.list": {
      return wrapData(
        call.id,
        db.outlets.map((outlet) => ({
          ...outlet,
          address: outlet.address ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      );
    }
    case "products.list": {
      const input = (call.input ?? {}) as { search?: string };
      const result = db.products
        .filter((product) =>
          input.search
            ? product.name.toLowerCase().includes(input.search.toLowerCase())
              || product.sku.toLowerCase().includes(input.search.toLowerCase())
              || product.barcode.includes(input.search)
            : true,
        )
        .map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
          categoryId: null,
          category: null,
          supplierId: null,
          supplier: null,
          costPrice: null,
          isActive: true,
          defaultDiscountPercent: null,
          promoName: product.promoName ?? null,
          promoPrice: product.promoPrice ?? null,
          promoStart: null,
          promoEnd: null,
          isTaxable: product.isTaxable ?? false,
          taxRate: product.taxRate ?? null,
        }));
      return wrapData(call.id, result);
    }
    case "products.getByBarcode": {
      const input = call.input as { barcode: string };
      const product = db.products.find((item) => item.barcode === input.barcode);
      if (!product) {
        return wrapData(call.id, null);
      }
      return wrapData(call.id, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
      });
    }
    case "sales.recordSale": {
      const input = call.input as Parameters<typeof buildSale>[1];
      const sale = buildSale(db, input);
      if (sumPayments(sale.payments) < sale.totalNet) {
        return wrapError(call.id, "Nominal pembayaran kurang dari total");
      }

      const nextDb: MockDatabase = {
        ...db,
        sales: [sale, ...db.sales].slice(0, 25),
      };
      await writeMockDb(nextDb);

      return wrapData(call.id, {
        id: sale.id,
        receiptNumber: sale.receiptNumber,
        totalNet: sale.totalNet,
        soldAt: sale.soldAt,
        taxAmount: sale.taxAmount,
      });
    }
    case "sales.listRecent": {
      const limit = (call.input as { limit?: number })?.limit ?? 10;
      const recent = db.sales.slice(0, limit).map((sale) => ({
        id: sale.id,
        outletId: sale.outletId,
        receiptNumber: sale.receiptNumber,
        soldAt: sale.soldAt,
        totalNet: sale.totalNet,
        totalItems: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      }));
      return wrapData(call.id, recent);
    }
    case "sales.getDailySummary": {
      const totals = db.sales.reduce(
        (acc, sale) => {
          acc.totalGross += sale.totalGross;
          acc.totalDiscount += sale.discountTotal;
          acc.totalNet += sale.totalNet;
          acc.totalItems += sale.items.reduce((sum, item) => sum + item.quantity, 0);
          acc.totalCash += sale.payments
            .filter((payment) => payment.method === PaymentMethod.CASH)
            .reduce((sum, payment) => sum + payment.amount, 0);
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
      return wrapData(call.id, {
        date: new Date().toISOString(),
        totals,
        sales: db.sales.map((sale) => ({
          id: sale.id,
          outletId: sale.outletId,
          receiptNumber: sale.receiptNumber,
          totalNet: sale.totalNet,
          soldAt: sale.soldAt,
          paymentMethods: sale.payments.map((payment) => payment.method as PaymentMethod),
        })),
      });
    }
    case "sales.printReceipt": {
      const input = call.input as { saleId: string; paperSize?: "58MM" | "80MM" };
      const sale = db.sales.find((item) => item.id === input.saleId);
      const outlet = db.outlets.find((item) => item.id === sale?.outletId);
      if (!sale || !outlet) {
        return wrapError(call.id, "Transaksi tidak ditemukan");
      }

      const pdfBytes = await generateReceiptPdf({
        sale: {
          id: sale.id,
          outletId: sale.outletId,
          cashierId: null,
          totalGross: sale.totalGross as unknown as any,
          discountTotal: sale.discountTotal as unknown as any,
          taxRate: null,
          taxAmount: sale.taxAmount as unknown as any,
          totalNet: sale.totalNet as unknown as any,
          soldAt: new Date(sale.soldAt) as unknown as any,
          receiptNumber: sale.receiptNumber,
          status: "COMPLETED",
          createdAt: new Date(sale.soldAt) as unknown as any,
          updatedAt: new Date(sale.soldAt) as unknown as any,
          outlet: {
            ...outlet,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
          cashier: { id: "mock-user", name: "Kasir Demo" } as any,
        },
        items: sale.items.map((item) => ({
          id: item.id,
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice as unknown as any,
          discount: item.discount as unknown as any,
          total: item.total as unknown as any,
          product: {
            id: item.productId,
            name: item.productName,
            sku: "",
            barcode: "",
            price: item.unitPrice as unknown as any,
          } as any,
        })),
        payments: sale.payments.map((payment) => ({
          id: `${sale.id}-${payment.method}`,
          method: payment.method as PaymentMethod,
          amount: payment.amount as unknown as any,
        })) as any,
        paperSize: input.paperSize,
      });

      return wrapData(call.id, {
        filename: `${sale.receiptNumber}.pdf`,
        base64: toBase64(pdfBytes),
      });
    }
    case "settings.listTaxSettings": {
      return wrapData(
        call.id,
        db.taxSettings.map((setting) => ({
          ...setting,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      );
    }
    case "settings.getActiveTaxSetting": {
      const active = db.taxSettings.find((setting) => setting.isActive);
      return wrapData(call.id, active ?? null);
    }
    default:
      return wrapError(call.id, `Mock belum mendukung ${call.path}`);
  }
};

export const handlers = [
  http.post("/api/trpc", async ({ request }) => {
    try {
      const calls = (await request.json()) as Array<{
        id: string | number;
        path: string;
        input?: unknown;
        method: string;
      }>;

      const responses = await Promise.all(calls.map((call) => routeCall(call)));
      return HttpResponse.json(responses);
    } catch (error) {
      return HttpResponse.json(
        [wrapError("0", error instanceof Error ? error.message : "Mock error")],
        { status: 500 },
      );
    }
  }),
];
