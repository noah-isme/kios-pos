import {
  SaleValidationError,
  calculateFinancials,
  enforceDiscountLimit,
  ensurePaymentsCoverTotal,
  normalizePaperSize,
} from "@/server/api/services/sales-validation";

import { PaymentMethod } from "@/generated/prisma";

describe("sales validation", () => {
  it("calculates totals for exclusive tax", () => {
    const result = calculateFinancials({
      items: [
        { productId: "p1", quantity: 2, unitPrice: 10000, discount: 0 },
        { productId: "p2", quantity: 1, unitPrice: 5000, discount: 1000 },
      ],
      discountTotal: 1000,
      applyTax: true,
      taxRate: 11,
      taxMode: "EXCLUSIVE",
    });

    expect(result.totalGross).toBe(25000);
    expect(result.itemDiscountTotal).toBe(1000);
    expect(result.totalDiscount).toBe(2000);
    expect(result.taxAmount).toBeCloseTo(2530, 0);
    expect(result.totalNet).toBeCloseTo(25530, 0);
  });

  it("respects inclusive tax mode", () => {
    const result = calculateFinancials({
      items: [{ productId: "p1", quantity: 1, unitPrice: 11000, discount: 0 }],
      discountTotal: 0,
      applyTax: true,
      taxRate: 10,
      taxMode: "INCLUSIVE",
    });

    expect(result.taxAmount).toBeCloseTo(1000, 0);
    expect(result.totalNet).toBe(11000);
  });

  it("throws when manual discount is too high", () => {
    expect(() =>
      calculateFinancials({
        items: [{ productId: "p1", quantity: 1, unitPrice: 10000, discount: 0 }],
        discountTotal: 12000,
        applyTax: false,
        taxMode: "EXCLUSIVE",
      }),
    ).toThrow(SaleValidationError);
  });

  it("guards discount limit", () => {
    expect(() => enforceDiscountLimit(100000, 60000, 50)).toThrow(
      /batas toko/i,
    );
  });

  it("ensures payments cover total", () => {
    expect(() =>
      ensurePaymentsCoverTotal(
        [
          { method: PaymentMethod.CASH, amount: 10000 },
          { method: PaymentMethod.QRIS, amount: 2000 },
        ],
        15000,
      ),
    ).toThrow(SaleValidationError);
  });

  it("normalizes paper size", () => {
    expect(normalizePaperSize("58MM")).toBe("58MM");
    expect(normalizePaperSize("80MM")).toBe("80MM");
    expect(normalizePaperSize("OTHER" as any)).toBe("80MM");
  });
});
