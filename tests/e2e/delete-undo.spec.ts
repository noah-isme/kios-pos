// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
});

test("delete category and undo prevents server delete", async ({ page }) => {
  const categories = [
    { id: "cat-1", name: "Minuman", slug: "minuman" },
  ];

  let deleteCalls = 0;

  await setupTrpcMock(page, {
    "products.categories": () => categories,
    "products.deleteCategory": async ({ input }) => {
      deleteCalls += 1;
      return { success: true };
    },
  });

  await page.goto("/management/products");
  await expect(page.getByRole("heading", { name: "Manajemen Produk" })).toBeVisible();

  // Ensure category is visible
  await expect(page.getByText("Minuman")).toBeVisible();

  // Click Hapus on the category
  await page.getByRole("button", { name: "Hapus" }).click();

  // Click Undo in the toast
  await page.getByRole("button", { name: "Undo" }).click();

  // Wait a short while to allow any scheduled delete to run if it were going to
  await page.waitForTimeout(1500);

  expect(deleteCalls).toBe(0);
});

test("delete supplier without undo triggers server delete", async ({ page }) => {
  const suppliers = [
    { id: "sup-1", name: "PT Supplier", email: "a@example.com", phone: "0812" },
  ];

  let deleteCalls = 0;

  await setupTrpcMock(page, {
    "products.suppliers": () => suppliers,
    "products.deleteSupplier": async ({ input }) => {
      deleteCalls += 1;
      return { success: true };
    },
  });

  await page.goto("/management/products");

  // Ensure supplier visible
  await expect(page.getByText("PT Supplier")).toBeVisible();

  // Click Hapus on supplier
  await page.getByRole("button", { name: "Hapus" }).click();

  // Do not click undo — wait for scheduled delete (delete-queue default 6s)
  await page.waitForTimeout(7000);

  expect(deleteCalls).toBeGreaterThanOrEqual(1);
});
