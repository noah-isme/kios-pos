import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';
import type { AppRouter } from '@/server/api/root';

export async function getDailySalesSummary(date?: string) {
  const ctx = await createTRPCContext();
  const caller = appRouter.createCaller(ctx as unknown as Parameters<AppRouter['createCaller']>[0]);
  const res = await caller.sales.getDailySummary({ date: date ?? new Date().toISOString(), outletId: undefined });
  return res;
}

export async function listRecentSales(limit = 5) {
  const ctx = await createTRPCContext();
  const caller = appRouter.createCaller(ctx as unknown as Parameters<AppRouter['createCaller']>[0]);
  const res = await caller.sales.listRecent({ limit });
  return res;
}
