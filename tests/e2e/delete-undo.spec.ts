// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
  // Auto-accept native confirm dialogs triggered by delete actions
  page.on("dialog", (dialog) => {
    try {
      dialog.accept();
    } catch (e) {
      // ignore
    }
  });
});

test("delete category and undo prevents server delete", async ({ page }) => {
  const categories = [
    { id: "cat-1", name: "Minuman", slug: "minuman" },
  ];

  let deleteCalls = 0;

  await setupTrpcMock(page, {
    "products.list": () => [],
    "products.categories": () => categories,
    "products.deleteCategory": async ({ input }) => {
      deleteCalls += 1;
      return { success: true };
    },
  });

  await page.goto("/management/products");
  await expect(page.getByRole("heading", { name: "Manajemen Produk" })).toBeVisible();

  // Ensure category is visible (target the category item label to avoid matching option elements)
  await expect(page.locator('p.text-sm.font-medium', { hasText: 'Minuman' })).toBeVisible();

  // Click Hapus on the category (confirm dialog is auto-accepted)
  await page.getByRole("button", { name: "Hapus" }).click();

  // Wait for the undo toast/button to appear and click it
  const undoBtn = page.getByRole("button", { name: "Undo" });
  await expect(undoBtn).toBeVisible();
  await undoBtn.click();

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
    "products.list": () => [],
    "products.suppliers": () => suppliers,
    "products.deleteSupplier": async ({ input }) => {
      deleteCalls += 1;
      return { success: true };
    },
  });

  await page.goto("/management/products");

  // Ensure supplier visible (target the supplier item label to avoid matching option elements)
  await expect(page.locator('p.text-sm.font-medium', { hasText: 'PT Supplier' })).toBeVisible();

  // Click Hapus on supplier (confirm dialog is auto-accepted)
  await page.getByRole("button", { name: "Hapus" }).click();

  // Do not click undo — wait for scheduled delete (delete-queue default 6s)
  await page.waitForTimeout(7000);

  expect(deleteCalls).toBeGreaterThanOrEqual(1);
});
