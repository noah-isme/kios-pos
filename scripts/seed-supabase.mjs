#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_OUTLET_CODE = process.env.SEED_OUTLET_CODE ?? "MAIN";
const DEFAULT_OUTLET_NAME = process.env.SEED_OUTLET_NAME ?? "Outlet Utama";

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const toDecimal = (value) =>
  typeof value === "number" && !Number.isNaN(value)
    ? new Prisma.Decimal(value.toFixed(2))
    : undefined;

const parseCsv = (raw) => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
};

const coerceBoolean = (value) =>
  typeof value === "string" ? ["true", "1", "yes"].includes(value.toLowerCase()) : Boolean(value);

const loadDataset = async () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const csvPath = resolve(__dirname, "../data/initial-products.csv");
  const csvContent = await readFile(csvPath, "utf8");
  const rawRows = parseCsv(csvContent);

  return rawRows.map((row) => {
    const parseNumber = (key) => {
      const raw = row[key];
      if (!raw) return undefined;
      const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
      return Number.isNaN(numeric) ? undefined : numeric;
    };

    return {
      name: row.name,
      sku: row.sku,
      barcode: row.barcode || undefined,
      category: row.category || undefined,
      supplier: row.supplier || undefined,
      price: parseNumber("price") ?? 0,
      costPrice: parseNumber("costPrice"),
      stock: Math.round(parseNumber("stock") ?? 0),
      defaultDiscountPercent: parseNumber("defaultDiscountPercent"),
      promoName: row.promoName || undefined,
      promoPrice: parseNumber("promoPrice"),
      promoStart: row.promoStart ? new Date(`${row.promoStart}T00:00:00.000Z`) : undefined,
      promoEnd: row.promoEnd ? new Date(`${row.promoEnd}T23:59:59.999Z`) : undefined,
      isTaxable: coerceBoolean(row.isTaxable),
      taxRate: parseNumber("taxRate"),
    };
  });
};

const ensureDefaultOutlet = async () =>
  prisma.outlet.upsert({
    where: {
      code: DEFAULT_OUTLET_CODE,
    },
    update: {
      name: DEFAULT_OUTLET_NAME,
    },
    create: {
      code: DEFAULT_OUTLET_CODE,
      name: DEFAULT_OUTLET_NAME,
    },
  });

const ensureDefaultTaxSetting = async (dataset) => {
  const requiresTax = dataset.some((item) => item.isTaxable && item.taxRate);
  if (!requiresTax) return;

  const existing = await prisma.taxSetting.findMany();
  if (existing.length > 0) return;

  const dominantRate = dataset.find((item) => item.taxRate)?.taxRate ?? 11;
  await prisma.taxSetting.create({
    data: {
      name: `PPN ${dominantRate}%`,
      rate: new Prisma.Decimal((dominantRate ?? 11).toFixed(2)),
      isActive: true,
    },
  });
};

const upsertCategory = async (tx, cache, name) => {
  if (!name) return undefined;
  if (cache.has(name)) return cache.get(name);

  const slug = slugify(name);
  const category = await tx.category.upsert({
    where: {
      slug,
    },
    update: {
      name,
    },
    create: {
      name,
      slug,
    },
  });

  cache.set(name, category.id);
  return category.id;
};

const upsertSupplier = async (tx, cache, name) => {
  if (!name) return undefined;
  if (cache.has(name)) return cache.get(name);

  const existing = await tx.supplier.findFirst({
    where: {
      name,
    },
  });

  const supplier =
    existing ??
    (await tx.supplier.create({
      data: {
        name,
      },
    }));

  cache.set(name, supplier.id);
  return supplier.id;
};

const seedProducts = async (dataset) => {
  const outlet = await ensureDefaultOutlet();
  const categoriesCache = new Map();
  const suppliersCache = new Map();

  let created = 0;
  let updated = 0;

  for (const item of dataset) {
    if (!item.sku || !item.name) {
      // biome-ignore lint/suspicious/noConsole: seeding utility warning
      console.warn("Lewati baris tanpa SKU atau nama", item);
      continue;
    }
    // biome-ignore lint/suspicious/noConsole: seeding utility
    console.log(`→ Sync ${item.sku} - ${item.name}`);

    await prisma.$transaction(async (tx) => {
      const categoryId = await upsertCategory(tx, categoriesCache, item.category);
      const supplierId = await upsertSupplier(tx, suppliersCache, item.supplier);

      const product = await tx.product.upsert({
        where: {
          sku: item.sku,
        },
        update: {
          name: item.name,
          barcode: item.barcode,
          price: new Prisma.Decimal(item.price.toFixed(2)),
          costPrice: toDecimal(item.costPrice),
          categoryId,
          supplierId,
          defaultDiscountPercent: toDecimal(item.defaultDiscountPercent),
          promoName: item.promoName,
          promoPrice: toDecimal(item.promoPrice),
          promoStart: item.promoStart,
          promoEnd: item.promoEnd,
          isTaxable: item.isTaxable,
          taxRate: toDecimal(item.taxRate),
        },
        create: {
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          price: new Prisma.Decimal(item.price.toFixed(2)),
          costPrice: toDecimal(item.costPrice),
          categoryId,
          supplierId,
          defaultDiscountPercent: toDecimal(item.defaultDiscountPercent),
          promoName: item.promoName,
          promoPrice: toDecimal(item.promoPrice),
          promoStart: item.promoStart,
          promoEnd: item.promoEnd,
          isTaxable: item.isTaxable,
          taxRate: toDecimal(item.taxRate),
        },
      });

      const inventoryBefore = await tx.inventory.findUnique({
        where: {
          productId_outletId: {
            productId: product.id,
            outletId: outlet.id,
          },
        },
      });

      const inventory = inventoryBefore
        ? await tx.inventory.update({
            where: {
              productId_outletId: {
                productId: product.id,
                outletId: outlet.id,
              },
            },
            data: {
              quantity: item.stock,
              costPrice: toDecimal(item.costPrice),
            },
          })
        : await tx.inventory.create({
            data: {
              productId: product.id,
              outletId: outlet.id,
              quantity: item.stock,
              costPrice: toDecimal(item.costPrice),
            },
          });

      const stockDelta = inventory.quantity - (inventoryBefore?.quantity ?? 0);
      if (stockDelta !== 0) {
        await tx.stockMovement.create({
          data: {
            inventoryId: inventory.id,
            type: stockDelta > 0 ? "INITIAL" : "ADJUSTMENT",
            quantity: stockDelta,
            note: "Seed import",
          },
        });
      }

      if (inventoryBefore) {
        updated += 1;
      } else {
        created += 1;
      }
    });
  }

  return { created, updated };
};

const main = async () => {
  const dataset = await loadDataset();
  if (dataset.length === 0) {
    throw new Error("Dataset kosong. Pastikan data/initial-products.csv terisi.");
  }

  await ensureDefaultTaxSetting(dataset);
  const { created, updated } = await seedProducts(dataset);

  // biome-ignore lint/suspicious/noConsole: seeding utility output
  console.log(`✅ Selesai. Produk baru: ${created}, diperbarui: ${updated}.`);
};

main()
  .catch((error) => {
    // biome-ignore lint/suspicious/noConsole: seeding utility output
    console.error("Gagal menjalankan seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
