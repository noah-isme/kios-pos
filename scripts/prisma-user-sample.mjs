#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function loadDotenv(file = '.env') {
  if (!fs.existsSync(file)) return;
  const src = fs.readFileSync(file, 'utf8');
  for (const line of src.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadDotenv(path.resolve(process.cwd(), '.env'));

(async () => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    console.log('Querying `User` table (id, email, createdAt) — limit 5');
    const rows = await prisma.user.findMany({ take: 5, select: { id: true, email: true, createdAt: true } });
    console.log('Rows returned:', Array.isArray(rows) ? rows.length : 0);
    for (const r of rows) {
      console.log(JSON.stringify(r));
    }
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Prisma query failed:');
    console.error(err && err.message ? err.message : err);
    process.exit(2);
  }
})();
