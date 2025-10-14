#!/usr/bin/env node
// Try to fetch up to 5 rows (id,email,created_at) from a set of likely table names via Supabase REST API
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

const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!base) {
  console.error('Supabase URL not found in env');
  process.exit(2);
}
if (!anon) {
  console.error('Supabase anon key not found in env');
  process.exit(2);
}

const candidates = ['User', 'users', 'user', 'account', 'accounts'];

async function fetchTable(table) {
  return new Promise((resolve) => {
    const url = new URL(`/rest/v1/${table}?select=id,email,created_at&limit=5`, base);
    const req = https.get(url, { headers: { apikey: anon, Authorization: `Bearer ${anon}`, Accept: 'application/json' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body: raw });
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
  });
}

(async () => {
  for (const t of candidates) {
    console.log('\nTrying table:', t);
    const out = await fetchTable(t);
    if ((out && out.status) || out.error) {
      if (out.error) {
        console.log('Request error:', out.error);
      } else {
        console.log('status:', out.status);
        try {
          const parsed = JSON.parse(out.body);
          console.log('Parsed rows count:', Array.isArray(parsed) ? parsed.length : 0);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.slice(0, 5).forEach((r) => console.log(JSON.stringify(r)));
          } else {
            console.log('Body:', out.body.slice(0, 500));
          }
        } catch (e) {
          console.log('Non-JSON body (first 200 chars):', out.body.slice(0, 200));
        }
      }
    } else {
      console.log('No response');
    }
  }
})();
