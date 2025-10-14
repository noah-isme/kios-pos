type TRPCContextLike = Record<string, { cancel: () => Promise<void>; getData: () => unknown; setData: (arg: unknown, fn?: (old: unknown) => unknown) => void; invalidate: () => Promise<void> }>;

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function optimisticOnMutate(ctx: any, key: string, id: string) {
  // cancel any outgoing refetches
  await ctx.products[key].cancel();
  const previous = ctx.products[key].getData();
  ctx.products[key].setData(undefined, (old: any) => (old ? old.filter((x: any) => x.id !== id) : old));
  return { previous };
}

export function optimisticOnError(ctx: any, key: string, _error: any, _variables: any, context: any) {
  if (context?.previous) {
    ctx.products[key].setData(undefined, () => context.previous);
  }
}

export async function optimisticOnSettled(ctx: any, key: string) {
  await ctx.products[key].invalidate();
}

export default {};
