import { test, expect } from '@playwright/test';

// UI-level test: open the login page, submit credentials, assert redirect to / and presence of sign-out or user name

test.describe('UI sign-in', () => {
  test('signs in via /auth/login and redirects to /', async ({ page, baseURL }) => {
    const base = baseURL || 'http://localhost:3000';
    await page.goto(`${base}/auth/login`);

    // Fill the form fields using reliable selectors from the UI Input component
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Click the submit button and wait for navigation to /
    await Promise.all([
      page.waitForNavigation({ url: `${base}/` }),
      page.click('button[type="submit"]'),
    ]);

    // After redirect to /, assert that some authenticated UI appears.
    // We'll check for a sign out link or user's email in the UI. Adjust selector as needed.
    const text = await page.textContent('body');
    expect(text).toContain('owner@example.com');
  });
});
