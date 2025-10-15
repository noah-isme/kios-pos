// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const pdfBase64 =
  "JVBERi0xLjQKMSAwIG9iago8PD4+CmVuZG9iagp4cmVmCjAgMQowMDAwMDAwMDAwIDY1NTM1IGYgCnRyYWlsZXIKPDw+PgpzdGFydHhyZWYKMAolJUVPRgo=";

test.describe("Demo routes", () => {
  test("render cashier, products, and reports demo pages", async ({ page }) => {
    await page.goto("/demo/cashier");
    await expect(page.locator("main h1")).toContainText("Kasir");
    await expect(
      page.getByText("Coba alur kasir tanpa login. Data bersifat mock"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Kopi Botol 250ml" })).toBeVisible();

    await page.goto("/demo/products");
    await expect(page.locator("main h1")).toContainText("Manajemen Produk");
    await expect(
      page.getByRole("cell", { name: "Almond Milk 1L" }),
    ).toBeVisible();

    await page.goto("/demo/reports");
    await expect(page.locator("main h1")).toContainText("Laporan Harian");
    await expect(page.getByText("Total Transaksi")).toBeVisible();
    await expect(page.getByText("Forecast Float Kasir")).toBeVisible();
  });
});

test.describe("Payment dialog flow", () => {
  const outlets = [
    { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
  ];

  const product = {
    id: "product-1",
    name: "Kopi Botol 250ml",
    sku: "SKU-01",
    price: 18000,
    barcode: "8999991234567",
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

  test("shows receipt preview, allows download & print actions", async ({ page }) => {
    const recordSaleCalls: unknown[] = [];
    const printReceiptCalls: unknown[] = [];

    await setupTrpcMock(page, {
      "outlets.list": () => outlets,
      "products.list": () => [
        {
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
          promoName: null,
          promoPrice: null,
          promoStart: null,
          promoEnd: null,
          isTaxable: false,
          taxRate: null,
        },
      ],
      "products.getByBarcode": ({ input }) => {
        const barcode = (input as { barcode?: string } | undefined)?.barcode;
        if (barcode === product.barcode) {
          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
          };
        }
        return null;
      },
      "sales.recordSale": ({ input }) => {
        recordSaleCalls.push(input);
        return {
          id: "sale-789",
          receiptNumber: "POS-0003",
          totalNet: product.price,
          soldAt: new Date().toISOString(),
          taxAmount: null,
        };
      },
      "sales.printReceipt": ({ input }) => {
        printReceiptCalls.push(input);
        return {
          filename: "POS-0003.pdf",
          base64: pdfBase64,
        };
      },
    });

    await page.goto("/cashier");
    await expect(page.locator("main h1")).toContainText("Outlet");

    await page.fill("#barcode", product.barcode);
    await page.getByRole("button", { name: "Tambah (F1)" }).click();

    await expect(
      page.getByRole("cell", { name: product.name }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Tinjau Pembayaran (F2)" }).click();

    await expect(
      page.getByRole("heading", { name: "Konfirmasi Pembayaran" }),
    ).toBeVisible();
    await expect(
      page.getByText("Preview Struk"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Proses Pembayaran" }).click();

    await expect(
      page.getByText("Pembayaran berhasil. Pilih tindakan untuk struk."),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Unduh PDF" }),
    ).toBeEnabled();

    expect(recordSaleCalls).toHaveLength(1);
    expect(printReceiptCalls).toHaveLength(1);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Unduh PDF" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().startsWith("POS-")).toBe(true);

    await page.getByRole("button", { name: "Cetak langsung" }).click();
    const receiptUrl = await page.evaluate<string | undefined>(
      () => (window as typeof window & { __lastReceiptUrl?: string }).__lastReceiptUrl,
    );
    expect(receiptUrl).toBeTruthy();
  });
});
