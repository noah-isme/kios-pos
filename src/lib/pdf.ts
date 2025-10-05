import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type {
  Outlet,
  Payment,
  Product,
  Sale,
  SaleItem,
  User,
} from "@/generated/prisma";

type ReceiptInput = {
  sale: Sale & {
    outlet: Outlet;
    cashier: User | null;
  };
  items: Array<
    SaleItem & {
      product: Product;
    }
  >;
  payments: Payment[];
};

export const generateReceiptPdf = async ({ sale, items, payments }: ReceiptInput) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([270, 480]);
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

  let cursorY = 460;
  const lineHeight = 14;

  drawText(sale.outlet.name, 20, cursorY, 12);
  cursorY -= lineHeight;
  if (sale.outlet.address) {
    drawText(sale.outlet.address, 20, cursorY);
    cursorY -= lineHeight;
  }

  drawText(`Nomor Struk: ${sale.receiptNumber}`, 20, cursorY);
  cursorY -= lineHeight;
  drawText(`Tanggal: ${sale.soldAt.toISOString()}`, 20, cursorY);
  cursorY -= lineHeight;
  drawText(`Kasir: ${sale.cashier?.name ?? "-"}`, 20, cursorY);
  cursorY -= lineHeight * 1.2;
  drawText("---------------------------------------", 20, cursorY);
  cursorY -= lineHeight;

  items.forEach((item) => {
    const line = `${item.product.name.substring(0, 24)} x${item.quantity}`;
    const amount = (Number(item.total)).toFixed(2);
    drawText(line, 20, cursorY);
    drawText(amount, 200, cursorY);
    cursorY -= lineHeight;
  });

  cursorY -= lineHeight * 0.5;
  drawText("---------------------------------------", 20, cursorY);
  cursorY -= lineHeight;

  drawText(`Subtotal`, 20, cursorY);
  drawText(Number(sale.totalGross).toFixed(2), 200, cursorY);
  cursorY -= lineHeight;

  drawText(`Diskon`, 20, cursorY);
  drawText(`- ${Number(sale.discountTotal).toFixed(2)}`, 200, cursorY);
  cursorY -= lineHeight;

  drawText(`Total`, 20, cursorY, 12);
  drawText(Number(sale.totalNet).toFixed(2), 200, cursorY, 12);
  cursorY -= lineHeight * 1.5;

  drawText("Pembayaran:", 20, cursorY);
  cursorY -= lineHeight;
  payments.forEach((payment) => {
    drawText(payment.method, 20, cursorY);
    drawText(Number(payment.amount).toFixed(2), 200, cursorY);
    cursorY -= lineHeight;
  });

  cursorY -= lineHeight;
  drawText("Terima kasih telah berbelanja!", 20, cursorY);

  const bytes = await pdfDoc.save();
  return bytes;
};
