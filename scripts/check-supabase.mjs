#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import https from 'https';

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

let url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (!url) {
  console.error('No SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL found in env');
  process.exit(2);
}

// Expand simple $VAR references (e.g. NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL")
const match = url.match(/^\$(\w+)$/);
if (match) {
  const ref = match[1];
  if (process.env[ref]) {
    url = process.env[ref];
  } else {
    console.error(`Referenced env var ${ref} is not set`);
    process.exit(2);
  }
}

try {
  console.log('Testing Supabase public URL reachability:', url);
  const parsed = new URL(url);
  const lib = parsed.protocol === 'http:' ? (await import('http')) : (await import('https'));
  lib.get(url, (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers['content-type'] || 'n/a');
    res.on('data', () => {});
    res.on('end', () => process.exit(res.statusCode && res.statusCode < 400 ? 0 : 3));
  }).on('error', (e) => {
    console.error('Request failed:', e.message);
    process.exit(3);
  });
} catch (e) {
  console.error('Invalid URL:', url);
  process.exit(2);
}
