#!/usr/bin/env node

/**
 * Comprehensive seed script that populates every Prisma model with a realistic storyline.
 * The script wipes existing records (respecting FK order) and rebuilds the catalogue,
 * outlets, inventory movements, authentication fixtures, sales, payments, refunds,
 * and daily summaries so the app starts with production-like data.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const toDecimal = (value) => new Prisma.Decimal(Number(value).toFixed(2));
const toDate = (iso) => new Date(iso);
const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const outletsData = [
  {
    code: "MAIN",
    name: "Outlet Utama",
    address: "Jl. Merdeka No. 123, Jakarta Pusat",
  },
  {
    code: "BR2",
    name: "Outlet Cabang BSD",
    address: "Ruko Ruby Blok B2 No. 5, BSD City",
  },
];

const taxSettingsData = [
  { name: "PPN 11%", rate: 11, isActive: true },
  { name: "Non PPN", rate: 0, isActive: false },
];

const categoriesData = [
  { slug: "beverages", name: "Minuman" },
  { slug: "bakery", name: "Roti & Patiseri" },
  { slug: "fresh-produce", name: "Produk Segar" },
  { slug: "household", name: "Kebutuhan Rumah Tangga" },
];

const suppliersData = [
  { name: "PT Nusantara Beans", email: "sales@nusantarabeans.id", phone: "+62-21-8890-1111" },
  { name: "PT Daun Sejahtera", email: "halo@daunsejahtera.id", phone: "+62-21-7654-8888" },
  { name: "PT Roti Sentosa", email: "order@rotisentosa.com", phone: "+62-21-3344-6677" },
  { name: "Harvest Farm Co", email: "hello@harvestfarm.co", phone: "+62-812-9090-4433" },
  { name: "Clean Home Supply", email: "support@cleanhomesupply.id", phone: "+62-813-2200-7788" },
];

const productsData = [
  {
    sku: "SKU-COFFEE-ARABICA-250",
    name: "Kopi Arabica Aceh Gayo 250g",
    barcode: "8991234700012",
    categorySlug: "beverages",
    supplierName: "PT Nusantara Beans",
    price: 85000,
    costPrice: 53000,
    defaultDiscountPercent: 0,
    promoName: "Morning Brew Week",
    promoPrice: 82000,
    promoStart: "2025-10-10T00:00:00.000Z",
    promoEnd: "2025-10-20T23:59:59.000Z",
    isTaxable: true,
    taxRate: 11,
  },
  {
    sku: "SKU-TEA-PREMIUM-50",
    name: "Teh Premium Melati 50g",
    barcode: "8991234700456",
    categorySlug: "beverages",
    supplierName: "PT Daun Sejahtera",
    price: 45000,
    costPrice: 28000,
    defaultDiscountPercent: 0,
    isTaxable: true,
    taxRate: 11,
  },
  {
    sku: "SKU-BREAD-WHOLEGRAIN",
    name: "Roti Tawar Wholegrain",
    barcode: "8991234700981",
    categorySlug: "bakery",
    supplierName: "PT Roti Sentosa",
    price: 28000,
    costPrice: 18000,
    defaultDiscountPercent: 10,
    isTaxable: false,
  },
  {
    sku: "SKU-MILK-FRESH-1L",
    name: "Susu Segar 1L",
    barcode: "8991234701506",
    categorySlug: "fresh-produce",
    supplierName: "Harvest Farm Co",
    price: 32000,
    costPrice: 21000,
    defaultDiscountPercent: 0,
    isTaxable: false,
  },
  {
    sku: "SKU-APPLE-FUJI-4P",
    name: "Apel Fuji Pack isi 4",
    barcode: "8991234702008",
    categorySlug: "fresh-produce",
    supplierName: "Harvest Farm Co",
    price: 48000,
    costPrice: 30000,
    defaultDiscountPercent: 0,
    promoName: "Panen Oktober",
    promoPrice: 45000,
    promoStart: "2025-10-01T00:00:00.000Z",
    promoEnd: "2025-10-15T23:59:59.000Z",
    isTaxable: false,
  },
  {
    sku: "SKU-FLOOR-LEMON-1L",
    name: "Pembersih Lantai Lemon 1L",
    barcode: "8991234702503",
    categorySlug: "household",
    supplierName: "Clean Home Supply",
    price: 39000,
    costPrice: 22000,
    defaultDiscountPercent: 0,
    isTaxable: true,
    taxRate: 11,
  },
];

const inventoryData = [
  {
    sku: "SKU-COFFEE-ARABICA-250",
    outletCode: "MAIN",
    quantity: 58,
    costPrice: 54000,
    movements: [
      {
        type: "INITIAL",
        quantity: 60,
        reference: "GRN-COFFEE-001",
        note: "Initial delivery from warehouse",
        occurredAt: "2025-10-08T02:00:00.000Z",
      },
      {
        type: "SALE",
        quantity: -2,
        reference: "POS-2025-1001",
        note: "Sold via POS-2025-1001",
        occurredAt: "2025-10-12T03:20:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-COFFEE-ARABICA-250",
    outletCode: "BR2",
    quantity: 51,
    costPrice: 54000,
    movements: [
      {
        type: "INITIAL",
        quantity: 40,
        reference: "GRN-COFFEE-002",
        note: "Opening balance",
        occurredAt: "2025-10-08T04:00:00.000Z",
      },
      {
        type: "PURCHASE",
        quantity: 12,
        reference: "GRN-COFFEE-005",
        note: "Restock from warehouse",
        occurredAt: "2025-10-11T01:00:00.000Z",
      },
      {
        type: "SALE",
        quantity: -1,
        reference: "POS-2025-2020",
        note: "Sold via POS-2025-2020",
        occurredAt: "2025-10-13T05:10:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-TEA-PREMIUM-50",
    outletCode: "MAIN",
    quantity: 39,
    costPrice: 28500,
    movements: [
      {
        type: "INITIAL",
        quantity: 40,
        reference: "GRN-TEA-001",
        note: "Initial delivery from supplier",
        occurredAt: "2025-10-08T02:30:00.000Z",
      },
      {
        type: "SALE",
        quantity: -1,
        reference: "POS-2025-1010",
        note: "Sold via POS-2025-1010",
        occurredAt: "2025-10-13T02:45:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-TEA-PREMIUM-50",
    outletCode: "BR2",
    quantity: 25,
    costPrice: 28500,
    movements: [
      {
        type: "INITIAL",
        quantity: 25,
        reference: "GRN-TEA-002",
        note: "Opening stock transfer",
        occurredAt: "2025-10-08T05:15:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-BREAD-WHOLEGRAIN",
    outletCode: "MAIN",
    quantity: 46,
    costPrice: 18500,
    movements: [
      {
        type: "INITIAL",
        quantity: 50,
        reference: "BAKERY-LOAD-01",
        note: "Daily baking output",
        occurredAt: "2025-10-12T00:30:00.000Z",
      },
      {
        type: "SALE",
        quantity: -3,
        reference: "POS-2025-1001",
        note: "Sold via POS-2025-1001 and POS-2025-1010",
        occurredAt: "2025-10-12T03:30:00.000Z",
      },
      {
        type: "ADJUSTMENT",
        quantity: -1,
        reference: "ADJ-BAKERY-001",
        note: "Damaged packaging during display",
        occurredAt: "2025-10-12T09:00:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-BREAD-WHOLEGRAIN",
    outletCode: "BR2",
    quantity: 30,
    costPrice: 18500,
    movements: [
      {
        type: "INITIAL",
        quantity: 30,
        reference: "BAKERY-LOAD-02",
        note: "Overnight delivery from central kitchen",
        occurredAt: "2025-10-12T01:00:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-MILK-FRESH-1L",
    outletCode: "MAIN",
    quantity: 39,
    costPrice: 21500,
    movements: [
      {
        type: "INITIAL",
        quantity: 30,
        reference: "MILK-REFILL-01",
        note: "Morning delivery",
        occurredAt: "2025-10-12T01:15:00.000Z",
      },
      {
        type: "PURCHASE",
        quantity: 10,
        reference: "MILK-RESTOCK-02",
        note: "Top-up before weekend",
        occurredAt: "2025-10-13T00:40:00.000Z",
      },
      {
        type: "SALE",
        quantity: -1,
        reference: "POS-2025-1010",
        note: "Sold via POS-2025-1010",
        occurredAt: "2025-10-13T02:46:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-MILK-FRESH-1L",
    outletCode: "BR2",
    quantity: 42,
    costPrice: 21500,
    movements: [
      {
        type: "INITIAL",
        quantity: 45,
        reference: "MILK-REFILL-03",
        note: "Opening stock",
        occurredAt: "2025-10-12T01:20:00.000Z",
      },
      {
        type: "SALE",
        quantity: -3,
        reference: "POS-2025-2015",
        note: "Sold via POS-2025-2015",
        occurredAt: "2025-10-12T06:00:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-APPLE-FUJI-4P",
    outletCode: "MAIN",
    quantity: 20,
    costPrice: 30500,
    movements: [
      {
        type: "INITIAL",
        quantity: 20,
        reference: "FRUIT-LOAD-01",
        note: "Morning harvest delivery",
        occurredAt: "2025-10-12T01:45:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-APPLE-FUJI-4P",
    outletCode: "BR2",
    quantity: 33,
    costPrice: 30500,
    movements: [
      {
        type: "INITIAL",
        quantity: 35,
        reference: "FRUIT-LOAD-02",
        note: "Opening stock",
        occurredAt: "2025-10-12T02:00:00.000Z",
      },
      {
        type: "SALE",
        quantity: -2,
        reference: "POS-2025-2015",
        note: "Sold via POS-2025-2015",
        occurredAt: "2025-10-12T06:05:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-FLOOR-LEMON-1L",
    outletCode: "MAIN",
    quantity: 29,
    costPrice: 22500,
    movements: [
      {
        type: "INITIAL",
        quantity: 30,
        reference: "HOUSEHOLD-LOAD-01",
        note: "Opening stock",
        occurredAt: "2025-10-12T02:15:00.000Z",
      },
      {
        type: "SALE",
        quantity: -1,
        reference: "POS-2025-1010",
        note: "Sold via POS-2025-1010",
        occurredAt: "2025-10-13T02:50:00.000Z",
      },
    ],
  },
  {
    sku: "SKU-FLOOR-LEMON-1L",
    outletCode: "BR2",
    quantity: 47,
    costPrice: 22500,
    movements: [
      {
        type: "INITIAL",
        quantity: 50,
        reference: "HOUSEHOLD-LOAD-02",
        note: "Opening stock",
        occurredAt: "2025-10-12T02:30:00.000Z",
      },
      {
        type: "SALE",
        quantity: -3,
        reference: "POS-2025-2015",
        note: "Sold via POS-2025-2015 and POS-2025-2020",
        occurredAt: "2025-10-13T05:15:00.000Z",
      },
    ],
  },
];

const usersData = [
  {
    name: "Owner Demo",
    email: "owner@example.com",
    role: "OWNER",
    password: "password",
    emailVerified: "2025-10-10T01:00:00.000Z",
  },
  {
    name: "Admin Demo",
    email: "admin@example.com",
    role: "ADMIN",
    password: "password",
    emailVerified: "2025-10-10T01:00:00.000Z",
  },
  {
    name: "Kasir Demo",
    email: "cashier@example.com",
    role: "CASHIER",
    password: "password",
    emailVerified: null,
  },
];

const userOutletsData = [
  // Owner has access to all outlets
  { userEmail: "owner@example.com", outletCode: "MAIN", role: "OWNER" },
  { userEmail: "owner@example.com", outletCode: "BR2", role: "OWNER" },
  // Admin has access to all outlets as manager
  { userEmail: "admin@example.com", outletCode: "MAIN", role: "MANAGER" },
  { userEmail: "admin@example.com", outletCode: "BR2", role: "MANAGER" },
  // Cashier only has access to main outlet
  { userEmail: "cashier@example.com", outletCode: "MAIN", role: "CASHIER" },
];

const accountSeeds = [
  {
    email: "owner@example.com",
    type: "oauth",
    provider: "google",
    providerAccountId: "owner-google-123",
    access_token: "mock-access-token-owner",
    token_type: "Bearer",
    scope: "profile email openid",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  },
  {
    email: "admin@example.com",
    type: "email",
    provider: "email",
    providerAccountId: "admin@example.com",
  },
];

const sessionSeeds = [
  {
    email: "owner@example.com",
    sessionToken: "seed-session-owner",
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  {
    email: "admin@example.com",
    sessionToken: "seed-session-admin",
    expires: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
  },
];

const verificationTokenSeeds = [
  {
    identifier: "admin@example.com",
    token: "seed-token-admin",
    expires: new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    identifier: "cashier@example.com",
    token: "seed-token-cashier",
    expires: new Date(Date.now() + 2 * 60 * 60 * 1000),
  },
];

const saleSeeds = [
  {
    receiptNumber: "POS-2025-1001",
    outletCode: "MAIN",
    cashierEmail: "cashier@example.com",
    soldAt: "2025-10-12T03:15:00.000Z",
    notes: "Shift pagi - promo roti wholegrain",
    items: [
      { sku: "SKU-COFFEE-ARABICA-250", quantity: 2, discount: 10000 },
      { sku: "SKU-BREAD-WHOLEGRAIN", quantity: 1, discount: 0 },
    ],
    payments: [
      { method: "CASH", amount: 60000, reference: "CASH-1001" },
      { method: "QRIS", amount: null, reference: "QR-1001" },
    ],
  },
  {
    receiptNumber: "POS-2025-2015",
    outletCode: "BR2",
    cashierEmail: "admin@example.com",
    soldAt: "2025-10-12T06:45:00.000Z",
    notes: "Shift siang - bundling dairy & household",
    items: [
      { sku: "SKU-MILK-FRESH-1L", quantity: 3, discount: 0 },
      { sku: "SKU-APPLE-FUJI-4P", quantity: 2, discount: 8000 },
      { sku: "SKU-FLOOR-LEMON-1L", quantity: 1, discount: 0 },
    ],
    payments: [
      { method: "CASH", amount: 100000, reference: "CASH-2015" },
      { method: "CARD", amount: null, reference: "CARD-2015" },
    ],
  },
  {
    receiptNumber: "POS-2025-1010",
    outletCode: "MAIN",
    cashierEmail: "cashier@example.com",
    soldAt: "2025-10-13T02:40:00.000Z",
    notes: "Shift pagi - isi ulang rumah tangga",
    items: [
      { sku: "SKU-TEA-PREMIUM-50", quantity: 1, discount: 0 },
      { sku: "SKU-BREAD-WHOLEGRAIN", quantity: 2, discount: 5600 },
      { sku: "SKU-MILK-FRESH-1L", quantity: 1, discount: 0 },
      { sku: "SKU-FLOOR-LEMON-1L", quantity: 1, discount: 0 },
    ],
    payments: [
      { method: "QRIS", amount: 90000, reference: "QR-1010" },
      { method: "EWALLET", amount: null, reference: "EWALLET-1010" },
    ],
  },
  {
    receiptNumber: "POS-2025-2020",
    outletCode: "BR2",
    cashierEmail: "admin@example.com",
    soldAt: "2025-10-13T05:05:00.000Z",
    notes: "Shift siang - repeat customer membership",
    items: [
      { sku: "SKU-COFFEE-ARABICA-250", quantity: 1, discount: 3000 },
      { sku: "SKU-FLOOR-LEMON-1L", quantity: 2, discount: 3900 },
    ],
    payments: [
      { method: "EWALLET", amount: 50000, reference: "EWALLET-2020" },
      { method: "QRIS", amount: null, reference: "QR-2020" },
    ],
  },
];

const refundSeeds = [
  {
    receiptNumber: "POS-2025-2015",
    amount: 45000,
    reason: "Retur 1 pack apel karena memar",
    approvedByEmail: "owner@example.com",
    processedAt: "2025-10-12T09:30:00.000Z",
    method: "CASH",
  },
];

async function clearAllTables() {
  console.log("🧹 Clearing existing records…");
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.refund.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.dailyCashSummary.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.taxSetting.deleteMany(),
    prisma.outlet.deleteMany(),
  ]);
}

async function seedOutlets() {
  const map = new Map();
  for (const outlet of outletsData) {
    const record = await prisma.outlet.create({
      data: {
        code: outlet.code,
        name: outlet.name,
        address: outlet.address,
      },
    });
    map.set(outlet.code, record);
  }
  console.log(`🏬 Seeded ${map.size} outlets`);
  return map;
}

async function seedTaxSettings() {
  for (const tax of taxSettingsData) {
    await prisma.taxSetting.create({
      data: {
        name: tax.name,
        rate: toDecimal(tax.rate),
        isActive: tax.isActive,
      },
    });
  }
  console.log(`🧾 Seeded ${taxSettingsData.length} tax settings`);
}

async function seedCategories() {
  const map = new Map();
  for (const category of categoriesData) {
    const record = await prisma.category.create({
      data: {
        slug: category.slug,
        name: category.name,
      },
    });
    map.set(category.slug, record);
  }
  console.log(`🏷️  Seeded ${map.size} categories`);
  return map;
}

async function seedSuppliers() {
  const map = new Map();
  for (const supplier of suppliersData) {
    const record = await prisma.supplier.create({ data: supplier });
    map.set(supplier.name, record);
  }
  console.log(`🚚 Seeded ${map.size} suppliers`);
  return map;
}

async function seedProducts(categoryMap, supplierMap) {
  const map = new Map();
  for (const product of productsData) {
    const record = await prisma.product.create({
      data: {
        sku: product.sku,
        name: product.name,
        barcode: product.barcode,
        description: product.description ?? null,
        price: toDecimal(product.price),
        costPrice: toDecimal(product.costPrice),
        defaultDiscountPercent:
          product.defaultDiscountPercent !== undefined
            ? toDecimal(product.defaultDiscountPercent)
            : null,
        promoName: product.promoName ?? null,
        promoPrice: product.promoPrice ? toDecimal(product.promoPrice) : null,
        promoStart: product.promoStart ? toDate(product.promoStart) : null,
        promoEnd: product.promoEnd ? toDate(product.promoEnd) : null,
        isTaxable: product.isTaxable ?? false,
        taxRate: product.taxRate !== undefined ? toDecimal(product.taxRate) : null,
        categoryId: categoryMap.get(product.categorySlug)?.id ?? null,
        supplierId: supplierMap.get(product.supplierName)?.id ?? null,
      },
    });
    map.set(product.sku, { ...record, seed: product });
  }
  console.log(`📦 Seeded ${map.size} products`);
  return map;
}

async function seedInventory(productsMap, outletsMap) {
  const map = new Map();
  for (const entry of inventoryData) {
    const product = productsMap.get(entry.sku);
    const outlet = outletsMap.get(entry.outletCode);
    if (!product || !outlet) continue;

    const record = await prisma.inventory.create({
      data: {
        productId: product.id,
        outletId: outlet.id,
        quantity: entry.quantity,
        costPrice: entry.costPrice ? toDecimal(entry.costPrice) : null,
      },
    });
    map.set(`${entry.sku}:${entry.outletCode}`, record);

    for (const movement of entry.movements ?? []) {
      await prisma.stockMovement.create({
        data: {
          inventoryId: record.id,
          type: movement.type,
          quantity: movement.quantity,
          reference: movement.reference ?? null,
          note: movement.note ?? null,
          occurredAt: movement.occurredAt ? toDate(movement.occurredAt) : new Date(),
        },
      });
    }
  }
  console.log(`📊 Seeded ${map.size} inventory rows with stock movements`);
  return map;
}

async function seedUsers() {
  const map = new Map();
  for (const user of usersData) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const record = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        emailVerified: user.emailVerified ? toDate(user.emailVerified) : null,
      },
    });
    map.set(user.email, record);
  }
  console.log(`👤 Seeded ${map.size} users`);
  return map;
}

async function seedUserOutlets(userMap, outletMap) {
  for (const userOutlet of userOutletsData) {
    const user = userMap.get(userOutlet.userEmail);
    const outlet = outletMap.get(userOutlet.outletCode);
    if (!user || !outlet) continue;

    await prisma.userOutlet.create({
      data: {
        userId: user.id,
        outletId: outlet.id,
        role: userOutlet.role,
        isActive: true,
      },
    });
  }
  console.log(`🏪 Seeded ${userOutletsData.length} user-outlet relationships`);
}

async function seedAccounts(userMap) {
  for (const account of accountSeeds) {
    const user = userMap.get(account.email);
    if (!user) continue;
    await prisma.account.create({
      data: {
        userId: user.id,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        access_token: account.access_token ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        expires_at: account.expires_at ?? null,
      },
    });
  }
  console.log(`🔐 Seeded ${accountSeeds.length} linked accounts`);
}

async function seedSessions(userMap) {
  for (const session of sessionSeeds) {
    const user = userMap.get(session.email);
    if (!user) continue;
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: session.sessionToken,
        expires: session.expires,
      },
    });
  }
  console.log(`🍪 Seeded ${sessionSeeds.length} active sessions`);
}

async function seedVerificationTokens() {
  for (const token of verificationTokenSeeds) {
    await prisma.verificationToken.create({
      data: {
        identifier: token.identifier,
        token: token.token,
        expires: token.expires,
      },
    });
  }
  console.log(`✉️  Seeded ${verificationTokenSeeds.length} verification tokens`);
}

async function seedSales(productsMap, outletsMap, userMap) {
  const saleMap = new Map();
  const metrics = [];

  for (const sale of saleSeeds) {
    const outlet = outletsMap.get(sale.outletCode);
    const cashier = userMap.get(sale.cashierEmail);
    if (!outlet) {
      console.warn(`⚠️  Skip sale ${sale.receiptNumber}: outlet ${sale.outletCode} missing`);
      continue;
    }

    let totalGross = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalNet = 0;
    let taxableRateUsed = null;
    let totalItems = 0;

    const saleItemsPayload = [];

    for (const item of sale.items) {
      const product = productsMap.get(item.sku);
      if (!product) {
        console.warn(`⚠️  Skip sale item for ${item.sku}: product not found`);
        continue;
      }
      const unitPrice = Number(product.seed.price);
      const quantity = item.quantity;
      const gross = unitPrice * quantity;
      const discount = item.discount ?? 0;
      const base = gross - discount;
      const taxRate = product.isTaxable ? Number(product.seed.taxRate ?? 11) : 0;
      const taxAmount = product.isTaxable ? Number(((base * taxRate) / 100).toFixed(2)) : 0;
      const lineTotal = base + taxAmount;

      totalGross += gross;
      totalDiscount += discount;
      totalTax += taxAmount;
      totalNet += lineTotal;
      totalItems += quantity;
      if (taxRate > 0) {
        taxableRateUsed = taxRate;
      }

      saleItemsPayload.push({
        productId: product.id,
        quantity,
        unitPrice: toDecimal(unitPrice),
        discount: toDecimal(discount),
        taxAmount: taxAmount ? toDecimal(taxAmount) : null,
        total: toDecimal(lineTotal),
      });
    }

    if (!saleItemsPayload.length) {
      console.warn(`⚠️  No items for sale ${sale.receiptNumber}, skipping creation`);
      continue;
    }

    const recordedPayments = sale.payments.map((p) => ({ ...p }));
    const declared = recordedPayments
      .filter((p) => typeof p.amount === "number")
      .reduce((acc, curr) => acc + Number(curr.amount ?? 0), 0);
    const missingAmount = Number(totalNet) - declared;
    const autoPay = recordedPayments.find((p) => p.amount === null);
    if (autoPay) {
      autoPay.amount = Number(missingAmount.toFixed(2));
    }

    const paymentSum = recordedPayments.reduce((acc, curr) => acc + Number(curr.amount ?? 0), 0);
    if (Math.abs(paymentSum - Number(totalNet)) > 0.5) {
      throw new Error(
        `Payments for sale ${sale.receiptNumber} do not reconcile with total. Total ${totalNet}, payments ${paymentSum}`,
      );
    }

    const saleRecord = await prisma.sale.create({
      data: {
        receiptNumber: sale.receiptNumber,
        outletId: outlet.id,
        cashierId: cashier?.id ?? null,
        totalGross: toDecimal(totalGross),
        discountTotal: toDecimal(totalDiscount),
        taxRate: taxableRateUsed ? toDecimal(taxableRateUsed) : null,
        taxAmount: totalTax ? toDecimal(totalTax) : null,
        totalNet: toDecimal(totalNet),
        soldAt: toDate(sale.soldAt),
        status: "COMPLETED",
      },
    });

    await prisma.saleItem.createMany({
      data: saleItemsPayload.map((item) => ({
        ...item,
        saleId: saleRecord.id,
      })),
    });

    await prisma.payment.createMany({
      data: recordedPayments.map((payment) => ({
        saleId: saleRecord.id,
        method: payment.method,
        amount: toDecimal(payment.amount ?? 0),
        paidAt: toDate(sale.soldAt),
        reference: payment.reference ?? null,
      })),
    });

    saleMap.set(sale.receiptNumber, { record: saleRecord, totalNet, totalItems });

    const cashAmount = recordedPayments
      .filter((payment) => payment.method === "CASH")
      .reduce((acc, curr) => acc + Number(curr.amount ?? 0), 0);

    metrics.push({
      saleId: saleRecord.id,
      outletId: outlet.id,
      soldAt: toDate(sale.soldAt),
      totalNet,
      totalItems,
      cashAmount,
      notes: sale.notes,
    });
  }

  console.log(`🧾 Seeded ${saleMap.size} sales with payments & items`);
  return { saleMap, metrics };
}

async function seedRefunds(saleMap, userMap) {
  const refundMetrics = [];
  for (const refund of refundSeeds) {
    const sale = saleMap.get(refund.receiptNumber)?.record;
    if (!sale) {
      console.warn(`⚠️  Skip refund for ${refund.receiptNumber}: sale missing`);
      continue;
    }
    const approver = refund.approvedByEmail ? userMap.get(refund.approvedByEmail) : null;
    const record = await prisma.refund.create({
      data: {
        saleId: sale.id,
        amount: toDecimal(refund.amount),
        reason: refund.reason ?? null,
        approvedById: approver?.id ?? null,
        processedAt: toDate(refund.processedAt),
      },
    });
    refundMetrics.push({
      saleId: sale.id,
      outletId: sale.outletId,
      processedAt: record.processedAt,
      amount: refund.amount,
      method: refund.method ?? null,
      reason: refund.reason ?? "",
    });
  }
  console.log(`↩️  Seeded ${refundMetrics.length} refunds`);
  return refundMetrics;
}

function buildDailySummaries(saleMetrics, refundMetrics) {
  const summary = new Map();
  for (const metric of saleMetrics) {
    const day = startOfUtcDay(metric.soldAt).toISOString();
    const key = `${metric.outletId}-${day}`;
    if (!summary.has(key)) {
      summary.set(key, {
        outletId: metric.outletId,
        businessDay: startOfUtcDay(metric.soldAt),
        totalSales: 0,
        totalItems: 0,
        totalCash: 0,
        notes: new Set(),
      });
    }
    const entry = summary.get(key);
    entry.totalSales += Number(metric.totalNet);
    entry.totalItems += metric.totalItems;
    entry.totalCash += metric.cashAmount;
    if (metric.notes) entry.notes.add(metric.notes);
  }

  for (const refund of refundMetrics) {
    const day = startOfUtcDay(refund.processedAt).toISOString();
    const key = `${refund.outletId}-${day}`;
    if (!summary.has(key)) {
      summary.set(key, {
        outletId: refund.outletId,
        businessDay: startOfUtcDay(refund.processedAt),
        totalSales: 0,
        totalItems: 0,
        totalCash: 0,
        notes: new Set(),
      });
    }
    const entry = summary.get(key);
    entry.totalSales -= Number(refund.amount);
    if (refund.method === "CASH") {
      entry.totalCash -= Number(refund.amount);
    }
    if (refund.reason) {
      entry.notes.add(`Refund: ${refund.reason} (-Rp${Number(refund.amount).toLocaleString("id-ID")})`);
    }
  }

  return summary;
}

async function seedDailyCashSummary(summaryMap) {
  let count = 0;
  for (const entry of summaryMap.values()) {
    await prisma.dailyCashSummary.create({
      data: {
        outletId: entry.outletId,
        businessDay: entry.businessDay,
        totalSales: toDecimal(entry.totalSales),
        totalItems: entry.totalItems,
        totalCash: toDecimal(entry.totalCash),
        notes: Array.from(entry.notes).join(" • ") || null,
      },
    });
    count += 1;
  }
  console.log(`📈 Seeded ${count} daily cash summaries`);
}

async function main() {
  const start = Date.now();
  await clearAllTables();

  const outletsMap = await seedOutlets();
  await seedTaxSettings();
  const categoriesMap = await seedCategories();
  const suppliersMap = await seedSuppliers();
  const productsMap = await seedProducts(categoriesMap, suppliersMap);
  await seedInventory(productsMap, outletsMap);
  const userMap = await seedUsers();
  await seedUserOutlets(userMap, outletsMap);
  await seedAccounts(userMap);
  await seedSessions(userMap);
  await seedVerificationTokens();

  const { saleMap, metrics: saleMetrics } = await seedSales(productsMap, outletsMap, userMap);
  const refundMetrics = await seedRefunds(saleMap, userMap);
  const summaryMap = buildDailySummaries(saleMetrics, refundMetrics);
  await seedDailyCashSummary(summaryMap);

  await prisma.$disconnect();
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`✅ Full seed completed in ${elapsed}s`);
}

main().catch((err) => {
  console.error("❌ Full seed failed:", err);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
