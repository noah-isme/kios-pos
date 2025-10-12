#!/usr/bin/env node

import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

const DEFAULT_OUTLET_CODE = process.env.SEED_OUTLET_CODE ?? "MAIN";
const DEFAULT_OUTLET_NAME = process.env.SEED_OUTLET_NAME ?? "Outlet Utama";

const ensureDefaultOutlet = async () =>
  prisma.outlet.upsert({
    where: { code: DEFAULT_OUTLET_CODE },
    update: { name: DEFAULT_OUTLET_NAME },
    create: { code: DEFAULT_OUTLET_CODE, name: DEFAULT_OUTLET_NAME },
  });

const toDecimal = (value) =>
  typeof value === "number" ? new Prisma.Decimal(value.toFixed(2)) : undefined;

const seedUsers = async () => {
  const users = [
    { name: "Owner Demo", email: "owner@example.com", role: "OWNER" },
    { name: "Admin Demo", email: "admin@example.com", role: "ADMIN" },
    { name: "Kasir Demo", email: "cashier@example.com", role: "CASHIER" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
      },
    });
  }

  console.log(`✅ Seeded ${users.length} users`);
};

const seedDailySummaries = async () => {
  const outlet = await prisma.outlet.findUnique({ where: { code: DEFAULT_OUTLET_CODE } });
  if (!outlet) throw new Error("Outlet tidak ditemukan. Jalankan seed produk terlebih dahulu.");

  // create 3 days of examples
  const today = new Date();
  const entries = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    entries.push({
      outletId: outlet.id,
      businessDay: d,
      totalSales: toDecimal(100000 + i * 50000),
      totalItems: 50 + i * 10,
      totalCash: toDecimal(80000 + i * 30000),
      notes: `Sample daily summary for ${d.toISOString().slice(0, 10)}`,
    });
  }

  for (const e of entries) {
    await prisma.dailyCashSummary.upsert({
      where: { outletId_businessDay: { outletId: e.outletId, businessDay: e.businessDay } },
      update: { totalSales: e.totalSales, totalItems: e.totalItems, totalCash: e.totalCash, notes: e.notes },
      create: e,
    });
  }

  console.log(`✅ Seeded ${entries.length} daily summaries`);
};

const main = async () => {
  await ensureDefaultOutlet();
  await seedUsers();
  await seedDailySummaries();
};

main()
  .catch((err) => {
    console.error("Gagal menjalankan seed-initial:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
