"use client";

import React from "react";
import Link from "next/link";
import { api } from "@/trpc/client";

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function LowStockWidget() {
  const outletsQ = api.outlets.list.useQuery();
  const firstOutlet = outletsQ.data?.[0];
  const stockQ = api.outlets.getStockSnapshot.useQuery(
    { outletId: firstOutlet?.id ?? "" },
    { enabled: Boolean(firstOutlet?.id) }
  );

  const items = (stockQ.data ?? []).filter((r) => r.quantity <= 5).slice(0, 10);

  return (
    <div className="p-4 bg-card border border-border rounded-md">
      <h3 className="text-sm font-medium mb-2">Produk Hampir Habis</h3>
      <div className="text-sm text-muted-foreground mb-3">Periksa produk dengan stok rendah pada outlet pertama.</div>
      {stockQ.isLoading && <div className="text-sm">Memuat …</div>}
      {items.length === 0 && !stockQ.isLoading && <div className="text-sm text-muted-foreground">Semua stok aman.</div>}
      <div className="space-y-2">
        {items.map((it) => (
          <Link key={it.productId} href="/management/products" className="block">
            <div className="flex items-center justify-between p-2 rounded hover:bg-muted transition">
              <div className="text-sm">{it.productName}</div>
              <div className="text-sm font-medium">{fmt(it.quantity)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
