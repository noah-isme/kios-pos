import { router } from "@/server/api/trpc";
import { outletsRouter } from "@/server/api/routers/outlets";
import { productsRouter } from "@/server/api/routers/products";
import { salesRouter } from "@/server/api/routers/sales";

export const appRouter = router({
  sales: salesRouter,
  products: productsRouter,
  outlets: outletsRouter,
});

export type AppRouter = typeof appRouter;
