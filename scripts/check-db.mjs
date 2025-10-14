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
    console.log('Attempting database connection via Prisma...');
    const res = await prisma.$queryRawUnsafe('SELECT 1 AS result');
    console.log('DB query result sample: ', res && res[0] ? res[0].result ?? res[0] : res);
    await prisma.$disconnect();
    console.log('Database connection test: SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('Database connection test: FAILED');
    console.error(err && err.message ? err.message : err);
    process.exit(2);
  }
})();
