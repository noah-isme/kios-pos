#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Try to load .env in the project root if env vars aren't set
import fs from 'fs';
import path from 'path';
const dotenvPath = path.resolve(process.cwd(), '.env');
if ((!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) && fs.existsSync(dotenvPath)) {
  const content = fs.readFileSync(dotenvPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in environment or in .env.');
  process.exit(2);
}

try {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  (async () => {
    try {
      // Try to list buckets (requires anon key to have access)
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        console.error('Supabase storage error:', error.message || error);
        process.exit(3);
      }
      console.log('Supabase storage OK. Buckets:', data?.map(b => b.name));
      process.exit(0);
    } catch (innerErr) {
      console.error('Supabase runtime error:', innerErr?.message ?? innerErr);
      process.exit(4);
    }
  })();
} catch (err) {
  console.error('Supabase client not installed. Run: pnpm add @supabase/supabase-js');
  console.error(err?.stack ?? err);
  process.exit(5);
}
