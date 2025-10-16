#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
// Load .env if present
const dotenvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(dotenvPath)) {
  const content = fs.readFileSync(dotenvPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

// Use Prisma directly
try {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const res = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('DB connection OK:', res);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('DB query error:', err?.message ?? err);
    await prisma.$disconnect();
    process.exit(2);
  }
} catch (err) {
  console.error('Prisma client not installed or failed to load. Run: pnpm install');
  console.error(err?.stack ?? err);
  process.exit(3);
}
