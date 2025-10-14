// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
});

test("menampilkan ringkasan laporan harian dengan metode bayar campuran", async ({ page }) => {
  const summaryDate = new Date("2024-11-20T08:00:00.000Z");

  await setupTrpcMock(page, {
    "sales.getDailySummary": () => ({
      date: summaryDate.toISOString(),
      totals: {
        totalGross: 200000,
        totalDiscount: 50000,
        totalNet: 150000,
        totalItems: 8,
        totalCash: 50000,
        totalTax: 0,
      },
      sales: [
        {
          id: "sale-001",
          outletId: "outlet-1",
          receiptNumber: "POS-0001",
          totalNet: 150000,
          soldAt: summaryDate.toISOString(),
          paymentMethods: ["CASH", "QRIS"],
        },
      ],
    }),
    "sales.forecastNextDay": () => ({
      suggestedFloat: 75000,
    }),
  });

  await page.goto("/reports/daily");

  await expect(page.getByRole("heading", { name: "Laporan Penjualan Harian" })).toBeVisible();

  const totalTransaksiValue = page
    .getByRole("heading", { name: "Total Transaksi" })
    .locator("xpath=../..//div[contains(@class,'font-semibold')]");
  await expect(totalTransaksiValue).toHaveText("1");

  const totalPenjualanValue = page
    .getByRole("heading", { name: "Total Penjualan" })
    .locator("xpath=../..//div[contains(@class,'font-semibold')]");
  await expect(totalPenjualanValue).toContainText("Rp150.000");
  await expect(page.getByRole("cell", { name: "POS-0001" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "CASH, QRIS" })).toBeVisible();
  await expect(page.getByText(/Sarankan setoran kas awal sebesar/)).toContainText("Rp75.000");
});
