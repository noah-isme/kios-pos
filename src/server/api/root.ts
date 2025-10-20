import { router } from "@/server/api/trpc";
import { outletsRouter } from "@/server/api/routers/outlets";
import { productsRouter } from "@/server/api/routers/products";
import { salesRouter } from "@/server/api/routers/sales";
import { settingsRouter } from "@/server/api/routers/settings";
import { cashSessionsRouter } from "@/server/api/routers/cash-sessions";

export const appRouter = router({
  sales: salesRouter,
  products: productsRouter,
  outlets: outletsRouter,
  settings: settingsRouter,
  cashSessions: cashSessionsRouter,
});

export type AppRouter = typeof appRouter;
