import { describe, it, expect, vi } from "vitest";
import { optimisticOnMutate, optimisticOnError, optimisticOnSettled } from "@/lib/optimistic";

describe("optimistic helpers", () => {
  it("removes item optimistically and restores on error", async () => {
    // mock ctx
    const items = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
    const data = [...items];

    const setData = vi.fn((key: any, fn: any) => {
      const res = fn(data);
      // mutate the array in place for test
      data.length = 0;
      res.forEach((r: any) => data.push(r));
    });

    const getData = vi.fn(() => [...items]);
    const cancel = vi.fn(async () => {});
    const invalidate = vi.fn(async () => {});

    const ctx: any = { products: { categories: { cancel, getData, setData, invalidate } } };

    const context = await optimisticOnMutate(ctx, "categories", "a");
    // after mutate, 'a' should be removed
    expect(data.find((d: any) => d.id === "a")).toBeUndefined();

    // simulate error
    optimisticOnError(ctx, "categories", new Error("boom"), { id: "a" }, context);
    // setData should be called to restore
    expect(setData).toHaveBeenCalled();

    // finally call settled
    await optimisticOnSettled(ctx, "categories");
    expect(invalidate).toHaveBeenCalled();
  });
});
