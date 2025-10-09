import {
  dailySummaryInputSchema,
  recordSaleInputSchema,
} from "@/server/api/schemas/sales";
import {
  productListInputSchema,
  productUpsertInputSchema,
} from "@/server/api/schemas/products";

describe("schema validation", () => {
  it("rejects empty sales items", () => {
    const result = recordSaleInputSchema.safeParse({
      outletId: "outlet-1",
      receiptNumber: "R-1",
      items: [],
      payments: [],
      discountTotal: 0,
      applyTax: false,
      taxMode: "EXCLUSIVE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/minimal satu produk/i);
    }
  });

  it("provides default filters for product list", () => {
    const parsed = productListInputSchema.parse({});
    expect(parsed.onlyActive).toBe(true);
    expect(parsed.take).toBe(50);
  });

  it("validates discount and tax range", () => {
    const result = productUpsertInputSchema.safeParse({
      name: "Produk",
      sku: "SKU",
      price: 1000,
      defaultDiscountPercent: 120,
    });
    expect(result.success).toBe(false);
  });

  it("allows optional filters for daily summary", () => {
    const parsed = dailySummaryInputSchema.parse({});
    expect(parsed.date).toBeUndefined();
    expect(parsed.outletId).toBeUndefined();
  });
});
