export async function optimisticOnMutate(ctx: any, key: string, id: string) {
  // cancel any outgoing refetches
  await ctx.products[key].cancel();
  const previous = ctx.products[key].getData();
  ctx.products[key].setData(undefined, (old: any) => (old ? old.filter((x: any) => x.id !== id) : old));
  return { previous };
}

export function optimisticOnError(ctx: any, key: string, error: any, variables: any, context: any) {
  if (context?.previous) {
    ctx.products[key].setData(undefined, () => context.previous);
  }
}

export async function optimisticOnSettled(ctx: any, key: string) {
  await ctx.products[key].invalidate();
}

export default {};
