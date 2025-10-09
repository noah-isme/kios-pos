import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { Prisma } from "@prisma/client";
import { env } from "@/env";

type DecimalLike = number | string | Prisma.Decimal;

type ReceiptSale = {
  id: string;
  receiptNumber: string;
  outletId: string;
  cashierId: string | null;
  totalGross: DecimalLike;
  discountTotal: DecimalLike;
  taxRate: DecimalLike | null;
  taxAmount: DecimalLike | null;
  totalNet: DecimalLike;
  soldAt: Date | string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  outlet: {
    id: string;
    name: string;
    address?: string | null;
    npwp?: string | null;
  } & Record<string, unknown>;
  cashier: ({
    id: string;
    name: string | null;
  } & Record<string, unknown>) | null;
} & Record<string, unknown>;

type ReceiptItem = {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: DecimalLike;
  discount: DecimalLike | null;
  taxAmount?: DecimalLike | null;
  total: DecimalLike;
  product: {
    id: string;
    name: string;
    sku?: string | null;
    barcode?: string | null;
    promoName?: string | null;
    promoPrice?: DecimalLike | null;
  } & Record<string, unknown>;
} & Record<string, unknown>;

type ReceiptPayment = {
  id: string;
  method: string;
  amount: DecimalLike;
  reference?: string | null;
} & Record<string, unknown>;

type ReceiptInput = {
  sale: ReceiptSale;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
  paperSize?: "58MM" | "80MM";
};

const mmToPt = (mm: number) => (mm / 25.4) * 72;

const PAPER_PRESETS: Record<"58MM" | "80MM", { width: number; height: number }> = {
  "58MM": { width: mmToPt(58), height: mmToPt(260) },
  "80MM": { width: mmToPt(80), height: mmToPt(300) },
};

const toNumber = (value: DecimalLike | null | undefined) => {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if ("toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value.toString());
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value: Date) =>
  value.toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  });

export const generateReceiptPdf = async ({
  sale,
  items,
  payments,
  paperSize = "80MM",
}: ReceiptInput) => {
  const preset = PAPER_PRESETS[paperSize] ?? PAPER_PRESETS["80MM"];
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([preset.width, preset.height]);
  const font = await pdfDoc.embedFont(StandardFonts.Courier);

  const drawText = (text: string, x: number, y: number, size = 10) => {
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  const drawRightAligned = (text: string, x: number, y: number, size = 10) => {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: x - width,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  const now = new Date();
  pdfDoc.setTitle(`${sale.outlet.name} · ${sale.receiptNumber}`);
  pdfDoc.setCreator("Kios POS");
  pdfDoc.setProducer("Kios POS");
  pdfDoc.setCreationDate(now);
  pdfDoc.setModificationDate(now);
  const outletNpwp = sale.outlet.npwp ?? env.STORE_NPWP;
  if (outletNpwp) {
    pdfDoc.setSubject(`NPWP ${outletNpwp}`);
  }
  pdfDoc.setKeywords([sale.receiptNumber, sale.outlet.name]);

  let cursorY = preset.height - 24;
  const lineHeight = 14;
  const leftMargin = 16;
  const rightMargin = preset.width - 16;

  const soldAt = sale.soldAt instanceof Date ? sale.soldAt : new Date(sale.soldAt);
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.unitPrice) * item.quantity, 0);
  const itemDiscountTotal = items.reduce((sum, item) => sum + toNumber(item.discount ?? 0), 0);
  const totalDiscountRecorded = toNumber(sale.discountTotal ?? 0);
  const orderLevelDiscount = Math.max(totalDiscountRecorded - itemDiscountTotal, 0);
  const taxAmount = toNumber(sale.taxAmount ?? 0);
  const totalNet = toNumber(sale.totalNet);

  drawText(sale.outlet.name, leftMargin, cursorY, 12);
  if (outletNpwp) {
    cursorY -= lineHeight;
    drawText(`NPWP: ${outletNpwp}`, leftMargin, cursorY, 9);
  }
  cursorY -= lineHeight;
  if (sale.outlet.address) {
    drawText(sale.outlet.address, leftMargin, cursorY, 9);
    cursorY -= lineHeight;
  }

  const qrSize = paperSize === "58MM" ? 70 : 88;
  const qrDataUrl = await QRCode.toDataURL(sale.receiptNumber, {
    margin: 0,
    scale: 6,
  });
  const qrImage = await pdfDoc.embedPng(qrDataUrl);
  page.drawImage(qrImage, {
    x: rightMargin - qrSize,
    y: cursorY - qrSize + 8,
    width: qrSize,
    height: qrSize,
  });

  drawText(`Nomor Struk: ${sale.receiptNumber}`, leftMargin, cursorY);
  cursorY -= lineHeight;
  drawText(`Tanggal: ${formatDateTime(soldAt)}`, leftMargin, cursorY);
  cursorY -= lineHeight;
  drawText(`Kasir: ${sale.cashier?.name ?? "-"}`, leftMargin, cursorY);
  cursorY -= lineHeight * 1.2;
  drawText("---------------------------------------", leftMargin, cursorY);
  cursorY -= lineHeight;

  items.forEach((item) => {
    const productName = item.product.name.substring(0, 28);
    const lineTotal = toNumber(item.total ?? 0);
    const unitPrice = toNumber(item.unitPrice ?? 0);
    const discount = toNumber(item.discount ?? 0);
    const taxPerItem = toNumber(item.taxAmount ?? 0);

    drawText(productName, leftMargin, cursorY);
    drawRightAligned(formatCurrency(lineTotal), rightMargin, cursorY);
    cursorY -= lineHeight;

    const quantityLine = `${item.quantity} x ${formatCurrency(unitPrice)}`;
    let detailRight = "";
    if (discount > 0) {
      detailRight = `Diskon -${formatCurrency(discount)}`;
    } else if (taxPerItem > 0) {
      detailRight = `PPN ${formatCurrency(taxPerItem)}`;
    }

    drawText(quantityLine, leftMargin + 8, cursorY, 9);
    if (detailRight) {
      drawRightAligned(detailRight, rightMargin, cursorY, 9);
    }
    cursorY -= lineHeight;

    if (item.product.promoName) {
      drawText(`Promo: ${item.product.promoName}`, leftMargin + 8, cursorY, 8);
      cursorY -= lineHeight * 0.9;
    }
  });

  cursorY -= lineHeight * 0.5;
  drawText("---------------------------------------", leftMargin, cursorY);
  cursorY -= lineHeight;

  drawText(`Subtotal`, leftMargin, cursorY);
  drawRightAligned(formatCurrency(subtotal), rightMargin, cursorY);
  cursorY -= lineHeight;

  if (itemDiscountTotal > 0) {
    drawText(`Diskon Item`, leftMargin, cursorY);
    drawRightAligned(`- ${formatCurrency(itemDiscountTotal)}`, rightMargin, cursorY);
    cursorY -= lineHeight;
  }

  if (orderLevelDiscount > 0) {
    drawText(`Diskon Order`, leftMargin, cursorY);
    drawRightAligned(`- ${formatCurrency(orderLevelDiscount)}`, rightMargin, cursorY);
    cursorY -= lineHeight;
  }

  if (taxAmount > 0) {
    const taxLabel = sale.taxRate
      ? `PPN (${Number(sale.taxRate).toFixed(2)}%)`
      : "PPN";
    drawText(taxLabel, leftMargin, cursorY);
    drawRightAligned(formatCurrency(taxAmount), rightMargin, cursorY);
    cursorY -= lineHeight;
  }

  drawText(`Total`, leftMargin, cursorY, 12);
  drawRightAligned(formatCurrency(totalNet), rightMargin, cursorY, 12);
  cursorY -= lineHeight * 1.5;

  drawText("Pembayaran:", leftMargin, cursorY);
  cursorY -= lineHeight;
  payments.forEach((payment) => {
    drawText(payment.method, leftMargin, cursorY);
    drawRightAligned(formatCurrency(Number(payment.amount)), rightMargin, cursorY);
    cursorY -= lineHeight;
  });

  cursorY -= lineHeight;
  drawText("Terima kasih telah berbelanja!", leftMargin, cursorY);

  const bytes = await pdfDoc.save();
  return bytes;
};
