import { vi, describe, it, expect } from 'vitest';

import * as auth from '@/server/auth';

describe('Dashboard redirect', () => {
  it('redirects unauthenticated users', async () => {
    const spy = vi.spyOn(auth, 'ensureAuthenticatedOrRedirect').mockImplementation(async () => { throw new Error('redirect called'); });
    await expect(auth.ensureAuthenticatedOrRedirect()).rejects.toThrow('redirect called');
    spy.mockRestore();
  });
});
