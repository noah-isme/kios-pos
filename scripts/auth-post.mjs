#!/usr/bin/env node
/*
  Repro script: performs CSRF GET and credentials POST against local Next dev server.
  Usage: node scripts/auth-post.mjs [--url http://localhost:3000] [--email owner@example.com] [--password password123]

  This script prints the CSRF token, the POST response headers, and whether a session cookie was returned.
*/
import http from 'http';
import { stringify } from 'querystring';

const argv = process.argv.slice(2);
const opts = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--url') opts.url = argv[++i];
  if (argv[i] === '--email') opts.email = argv[++i];
  if (argv[i] === '--password') opts.password = argv[++i];
}
const BASE = new URL(opts.url || 'http://localhost:3000');

function request(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: BASE.hostname, port: BASE.port, path, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode, headers: res.headers, rawHeaders: res.rawHeaders, body });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async function main() {
  try {
    console.log('GET /api/auth/csrf');
    const get = await request('/api/auth/csrf');
    console.log('status', get.statusCode);
    // extract cookies from rawHeaders
    const raw = get.rawHeaders || [];
    const setCookies = [];
    for (let i = 0; i < raw.length; i += 2) {
      if ((raw[i] || '').toLowerCase() === 'set-cookie' && raw[i+1]) setCookies.push(raw[i+1]);
    }
    console.log('set-cookie count:', setCookies.length);
    setCookies.forEach((c) => console.log('  ', c));

    let csrfToken = '';
    try { csrfToken = JSON.parse(get.body).csrfToken || ''; } catch (e) { /* ignore */ }
    console.log('csrfToken:', csrfToken);

    const cookieHeader = setCookies.map((c) => c.split(';')[0].trim()).join('; ');
    console.log('Cookie header for POST:', cookieHeader);

    const email = opts.email || 'owner@example.com';
    const password = opts.password || 'password123';
    const postBody = stringify({ csrfToken, email, password, callbackUrl: BASE.href });

    console.log('\nPOST /api/auth/callback/credentials');
    const post = await request('/api/auth/callback/credentials', 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postBody), Cookie: cookieHeader }, postBody);
    console.log('POST status', post.statusCode);
    console.log('POST headers:', post.headers);
    if (post.headers['set-cookie']) {
      console.log('POST set-cookie:', post.headers['set-cookie']);
    }

    if (post.headers['set-cookie'] && post.headers['set-cookie'].some((s) => s.includes('next-auth.session-token') || s.includes('next-auth.callback-url'))) {
      console.log('Session cookie likely set.');
    } else {
      console.log('No session cookie in response.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
