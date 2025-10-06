// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const pdfBase64 =
  "JVBERi0xLjQKMSAwIG9iago8PD4+CmVuZG9iagp4cmVmCjAgMQowMDAwMDAwMDAwIDY1NTM1IGYgCnRyYWlsZXIKPDw+PgpzdGFydHhyZWYKMAolJUVPRgo=";

const outlets = [
  { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
];

const product = {
  id: "product-1",
  name: "Kopi Botol 250ml",
  sku: "SKU-01",
  price: 15000,
};

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
  await page.addInitScript(() => {
    window.open = (url: string | URL | undefined | null) => {
      (window as typeof window & { __lastReceiptUrl?: string }).__lastReceiptUrl =
        typeof url === "string" ? url : url?.toString();
      return null;
    };
  });
});

test.describe("Kasir", () => {
  test("dapat menyelesaikan transaksi tunai dan mencetak struk", async ({ page }) => {
    const recordSaleCalls: unknown[] = [];
    const printReceiptCalls: unknown[] = [];

    await setupTrpcMock(page, {
      "outlets.list": () => outlets,
      "products.getByBarcode": ({ input }) => {
        const barcode = (input as { barcode?: string } | undefined)?.barcode;
        if (!barcode) {
          return null;
        }
        if (barcode === "8999991234567") {
          return product;
        }
        return null;
      },
      "sales.recordSale": ({ input }) => {
        recordSaleCalls.push(input);
        return {
          id: "sale-123",
          receiptNumber: "POS-0001",
          totalNet: product.price,
          soldAt: new Date().toISOString(),
          taxAmount: null,
        };
      },
      "sales.printReceipt": ({ input }) => {
        printReceiptCalls.push(input);
        return {
          filename: "POS-0001.pdf",
          base64: pdfBase64,
        };
      },
    });

    await page.goto("/cashier");
    await expect(page.getByRole("heading", { name: "Modul Kasir" })).toBeVisible();

    await page.getByLabel("Barcode").fill("8999991234567");
    await page.getByRole("button", { name: "Tambah" }).click();

    await expect(page.getByRole("cell", { name: product.name })).toBeVisible();

    await page.getByRole("button", { name: "Selesaikan & Cetak Struk" }).click();

    await expect(page.getByText("Transaksi tersimpan")).toBeVisible();
    await expect(page.getByText("Pembayaran: Tunai")).toBeVisible();

    expect(recordSaleCalls).toHaveLength(1);
    const salePayload = recordSaleCalls[0] as {
      payments: Array<{ method: string; reference?: string; amount: number }>;
      items: Array<{ productId: string; quantity: number }>;
    };
    expect(salePayload.items[0]?.productId).toBe(product.id);
    expect(salePayload.payments[0]?.method).toBe("CASH");
    expect(salePayload.payments[0]?.reference).toBeUndefined();

    expect(printReceiptCalls).toHaveLength(1);
    const receiptPayload = printReceiptCalls[0] as { saleId: string };
    expect(receiptPayload.saleId).toBe("sale-123");

    const receiptUrl = await page.evaluate<string | undefined>(
      () => (window as typeof window & { __lastReceiptUrl?: string }).__lastReceiptUrl,
    );
    expect(receiptUrl).toBeTruthy();
  });

  test("memvalidasi referensi non-tunai dan mengirim metode pembayaran dummy", async ({ page }) => {
    const recordSaleCalls: unknown[] = [];
    const printReceiptCalls: unknown[] = [];

    await setupTrpcMock(page, {
      "outlets.list": () => outlets,
      "products.getByBarcode": ({ input }) => {
        const barcode = (input as { barcode?: string } | undefined)?.barcode;
        if (barcode === "8999991234567") {
          return product;
        }
        return null;
      },
      "sales.recordSale": ({ input }) => {
        recordSaleCalls.push(input);
        return {
          id: "sale-456",
          receiptNumber: "POS-0002",
          totalNet: product.price,
          soldAt: new Date().toISOString(),
          taxAmount: null,
        };
      },
      "sales.printReceipt": ({ input }) => {
        printReceiptCalls.push(input);
        return {
          filename: "POS-0002.pdf",
          base64: pdfBase64,
        };
      },
    });

    await page.goto("/cashier");
    await page.getByRole("button", { name: "Non-Tunai Dummy" }).click();
    await page.getByRole("button", { name: "Selesaikan & Cetak Struk" }).click();

    await expect(page.getByText("Masukkan referensi pembayaran non-tunai")).toBeVisible();
    expect(recordSaleCalls).toHaveLength(0);

    await page.getByLabel("Barcode").fill("8999991234567");
    await page.getByPlaceholder("Masukkan referensi pembayaran").fill("INV-123");
    await page.getByRole("button", { name: "Tambah" }).click();

    await expect(page.getByRole("cell", { name: product.name })).toBeVisible();

    await page.getByRole("button", { name: "Selesaikan & Cetak Struk" }).click();

    await expect(page.getByText("Transaksi tersimpan")).toBeVisible();
    await expect(page.getByText(/Pembayaran: Non-Tunai Dummy/)).toBeVisible();

    expect(recordSaleCalls).toHaveLength(1);
    const nonCashPayload = recordSaleCalls[0] as {
      payments: Array<{ method: string; reference?: string }>;
    };
    expect(nonCashPayload.payments[0]?.method).toBe("QRIS");
    expect(nonCashPayload.payments[0]?.reference).toBe("INV-123");

    expect(printReceiptCalls).toHaveLength(1);
    const receiptPayload = printReceiptCalls[0] as { saleId: string };
    expect(receiptPayload.saleId).toBe("sale-456");
  });
});
