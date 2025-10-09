import { PaymentMethod } from "@/generated/prisma";
import { SalePaperSize } from "@/server/api/schemas/sales";

export class SaleValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "SaleValidationError";
  }
}

export type SaleItemCalculation = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxable?: boolean;
};

export type SalePaymentInput = {
  method: PaymentMethod;
  amount: number;
};

export type SaleCalculationParams = {
  items: SaleItemCalculation[];
  discountTotal: number;
  applyTax: boolean;
  taxRate?: number;
  taxMode: "INCLUSIVE" | "EXCLUSIVE";
};

export type SaleFinancials = {
  totalGross: number;
  itemDiscountTotal: number;
  manualDiscount: number;
  totalDiscount: number;
  netAfterDiscount: number;
  taxableBase: number;
  taxAmount: number;
  totalNet: number;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const validateItems = (items: SaleItemCalculation[]): {
  totalGross: number;
  itemDiscountTotal: number;
} => {
  if (!items.length) {
    throw new SaleValidationError("Minimal satu produk di keranjang", "items");
  }

  let totalGross = 0;
  let itemDiscountTotal = 0;

  for (const item of items) {
    const lineTotal = item.unitPrice * item.quantity;

    if (item.unitPrice < 0) {
      throw new SaleValidationError("Harga tidak boleh negatif", "items");
    }

    if (item.quantity <= 0) {
      throw new SaleValidationError("Jumlah minimal 1", "items");
    }

    if (item.discount < 0) {
      throw new SaleValidationError("Diskon minimal 0", "items");
    }

    if (item.discount > lineTotal) {
      throw new SaleValidationError(
        "Diskon item melebihi harga",
        "items",
      );
    }

    totalGross += lineTotal;
    itemDiscountTotal += item.discount;
  }

  return {
    totalGross: roundCurrency(totalGross),
    itemDiscountTotal: roundCurrency(itemDiscountTotal),
  };
};

export const enforceManualDiscount = (netAfterItem: number, manualDiscount: number) => {
  if (manualDiscount < 0) {
    throw new SaleValidationError("Diskon tambahan minimal 0", "discountTotal");
  }

  if (manualDiscount > netAfterItem) {
    throw new SaleValidationError(
      "Diskon tambahan melebihi total",
      "discountTotal",
    );
  }
};

export const enforceDiscountLimit = (
  totalGross: number,
  totalDiscount: number,
  limitPercent: number,
) => {
  const maxDiscount = roundCurrency(totalGross * (limitPercent / 100));
  if (totalDiscount > maxDiscount) {
    throw new SaleValidationError(
      `Diskon melewati batas toko (${limitPercent}% dari penjualan)`,
      "discountTotal",
    );
  }
};

const calculateTaxableBase = (
  items: SaleItemCalculation[],
  applyTax: boolean,
): number => {
  if (!applyTax) {
    return 0;
  }

  const total = items.reduce((sum, item) => {
    if (item.taxable === false) {
      return sum;
    }

    const line = item.unitPrice * item.quantity - item.discount;
    return sum + Math.max(line, 0);
  }, 0);

  return roundCurrency(total);
};

export const calculateTaxAmount = (
  taxableBase: number,
  manualDiscount: number,
  applyTax: boolean,
  taxRate: number | undefined,
  taxMode: "INCLUSIVE" | "EXCLUSIVE",
): number => {
  if (!applyTax || !taxRate) {
    return 0;
  }

  const rate = taxRate / 100;
  const adjustedBase = Math.max(taxableBase - manualDiscount, 0);

  if (adjustedBase === 0) {
    return 0;
  }

  if (taxMode === "INCLUSIVE") {
    const preTax = adjustedBase / (1 + rate);
    return roundCurrency(adjustedBase - preTax);
  }

  return roundCurrency(adjustedBase * rate);
};

export const calculateFinancials = (
  params: SaleCalculationParams,
): SaleFinancials => {
  const { totalGross, itemDiscountTotal } = validateItems(params.items);
  const manualDiscount = roundCurrency(params.discountTotal);

  const netAfterItem = roundCurrency(totalGross - itemDiscountTotal);
  enforceManualDiscount(netAfterItem, manualDiscount);

  const netAfterDiscount = roundCurrency(netAfterItem - manualDiscount);
  const taxableBase = calculateTaxableBase(params.items, params.applyTax);
  const taxAmount = calculateTaxAmount(
    taxableBase,
    manualDiscount,
    params.applyTax,
    params.taxRate,
    params.taxMode,
  );

  const totalNet = params.applyTax && params.taxMode === "INCLUSIVE"
    ? netAfterDiscount
    : roundCurrency(netAfterDiscount + taxAmount);

  if (totalNet < 0) {
    throw new SaleValidationError("Total transaksi tidak boleh negatif");
  }

  return {
    totalGross,
    itemDiscountTotal,
    manualDiscount,
    totalDiscount: roundCurrency(itemDiscountTotal + manualDiscount),
    netAfterDiscount,
    taxableBase,
    taxAmount,
    totalNet,
  };
};

export const ensurePaymentsCoverTotal = (
  payments: SalePaymentInput[],
  totalNet: number,
) => {
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (paid < totalNet) {
    throw new SaleValidationError(
      "Nominal pembayaran kurang dari total",
      "payments",
    );
  }
};

export type NormalizedPaperSize = "58MM" | "80MM";

export const normalizePaperSize = (
  paperSize?: SalePaperSize,
): NormalizedPaperSize => {
  return paperSize === "58MM" ? "58MM" : "80MM";
};
