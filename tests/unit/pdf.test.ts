import { PDFDocument } from "pdf-lib";

import { generateReceiptPdf } from "@/lib/pdf";
import { PaymentMethod } from "@/generated/prisma";

describe("generateReceiptPdf", () => {
  const baseSale = {
    id: "sale-1",
    receiptNumber: "POS-123",
    outletId: "outlet-1",
    cashierId: "cashier-1",
    totalGross: 10000 as unknown as any,
    discountTotal: 0 as unknown as any,
    taxRate: null,
    taxAmount: 0 as unknown as any,
    totalNet: 10000 as unknown as any,
    soldAt: new Date("2024-01-01T10:00:00Z") as unknown as any,
    status: "COMPLETED",
    createdAt: new Date("2024-01-01T10:00:00Z") as unknown as any,
    updatedAt: new Date("2024-01-01T10:00:00Z") as unknown as any,
    outlet: {
      id: "outlet-1",
      name: "Kios Pusat",
      code: "MAIN",
      address: "Jl. Raya No. 12",
      createdAt: new Date(),
      updatedAt: new Date(),
      npwp: "12.345.678.9-012.345",
    } as any,
    cashier: { id: "cashier-1", name: "Kasir Uji" } as any,
  };

  const baseItems = [
    {
      id: "item-1",
      saleId: "sale-1",
      productId: "prod-1",
      quantity: 1,
      unitPrice: 10000 as unknown as any,
      discount: 0 as unknown as any,
      total: 10000 as unknown as any,
      product: {
        id: "prod-1",
        name: "Produk A",
        sku: "SKU-1",
        barcode: "123",
        price: 10000 as unknown as any,
      },
    },
  ];

  const basePayments = [
    {
      id: "pay-1",
      saleId: "sale-1",
      method: PaymentMethod.CASH,
      amount: 10000 as unknown as any,
    },
  ];

  it("sets metadata and paper width for 58mm", async () => {
    const pdfBytes = await generateReceiptPdf({
      sale: baseSale,
      items: baseItems,
      payments: basePayments,
      paperSize: "58MM",
    });

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getTitle()).toContain("Kios Pusat");
    expect(doc.getSubject()).toContain("NPWP");

    const [page] = doc.getPages();
    expect(page.getWidth()).toBeGreaterThan(160);
    expect(page.getWidth()).toBeLessThan(170);
  });

  it("supports 80mm width", async () => {
    const pdfBytes = await generateReceiptPdf({
      sale: baseSale,
      items: baseItems,
      payments: basePayments,
      paperSize: "80MM",
    });

    const doc = await PDFDocument.load(pdfBytes);
    const [page] = doc.getPages();
    expect(page.getWidth()).toBeGreaterThan(220);
    expect(page.getWidth()).toBeLessThan(230);
  });
});
