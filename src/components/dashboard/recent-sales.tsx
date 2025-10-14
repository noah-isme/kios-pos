"use client";

import React from 'react';
import { api } from '@/trpc/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RecentSalesWidget() {
  const recent = api.sales.listRecent.useQuery({ limit: 5 });

  if (recent.isLoading) return <Card className="p-4">Loading…</Card>;
  if (recent.isError) return <Card className="p-4">Error: {String(recent.error)}</Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaksi Terbaru</CardTitle>
        <CardDescription>Daftar transaksi beberapa terakhir</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm">
          {(recent.data ?? []).map((s) => (
            <li key={s.id} className="flex justify-between">
              <div>
                <div className="font-medium">{s.receiptNumber}</div>
                <div className="text-muted-foreground text-xs">{new Date(s.soldAt).toLocaleString()}</div>
              </div>
              <div className="font-semibold">Rp {s.totalNet.toFixed(2)}</div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
