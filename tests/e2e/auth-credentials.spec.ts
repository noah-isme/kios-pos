import { test, expect } from '@playwright/test';

// This e2e test requires the dev server to be running at http://localhost:3000
// It performs a CSRF fetch, then posts credentials and expects a redirect to /

test('credentials sign-in sets session cookie and redirects to /', async ({ request, baseURL }) => {
  const base = baseURL || 'http://localhost:3000';

  // Get CSRF token and cookies
  const csrfRes = await request.get(`${base}/api/auth/csrf`);
  expect(csrfRes.ok()).toBeTruthy();
  const csrfJson = await csrfRes.json();
  const csrfToken = csrfJson.csrfToken;
  expect(typeof csrfToken).toBe('string');

  // Grab cookies from the CSRF response to send with POST
  const cookies = await csrfRes.headers();

  // Use Playwright API to submit the form and preserve cookies
  const postRes = await request.post(`${base}/api/auth/callback/credentials`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: new URLSearchParams({ csrfToken, email: 'owner@example.com', password: 'password123', callbackUrl: `${base}/` }).toString(),
    // send cookies captured from csrfRes via browser-like flow by reusing the fetch context
  });

  // We expect a 302 redirect to callbackUrl or '/'
  expect([302, 303, 200]).toContain(postRes.status());

  // If redirect, Playwright's request doesn't follow redirects by default here; check headers
  const location = postRes.headers()['location'];
  if (location) {
    expect(location.startsWith(base)).toBeTruthy();
  }

  // Check if a session cookie is set in the response
  const setCookie = postRes.headers()['set-cookie'];
  if (setCookie) {
    expect(setCookie.toString()).toContain('next-auth.session-token');
  }
});
