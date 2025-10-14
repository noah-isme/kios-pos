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
    console.log('Listing tables in public schema (limit 100):');
  const nonce = Date.now();
  const sql = `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename LIMIT 100; -- nonce: ${nonce}`;
  const rows = await prisma.$queryRawUnsafe(sql);
    if (!rows || rows.length === 0) {
      console.log('No tables in public schema or query returned empty result.');
    } else {
      rows.forEach((r) => console.log('-', r.tablename || r));
    }
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to list tables:');
    console.error(err && err.message ? err.message : err);
    process.exit(2);
  }
})();
