"use client";

import React, { useMemo } from "react";
import { format } from "date-fns";
import { api } from "@/trpc/client";

type Props = { days?: number };

function generateSparkPath(values: number[], width = 300, height = 60) {
  if (!values.length) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const stepX = width / Math.max(1, values.length - 1);

  return values
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const y = Math.round(((max - v) / range) * (height - 6) + 3);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export default function SalesChart({ days = 7 }: Props) {
  // Fetch recent sales and aggregate per day
  const recent = api.sales.listRecent.useQuery({ limit: days * 5 });

  const points = useMemo(() => {
    const vals = new Array(days).fill(0);
    if (!recent.data) return vals;
    const now = new Date();
    // aggregate totalNet per day
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1 - i));
      const key = format(d, "yyyy-MM-dd");
      const total = recent.data
        .filter((s) => s.soldAt.startsWith(key))
        .reduce((acc, s) => acc + (s.totalNet ?? 0), 0);
      vals[i] = Math.round(total / 1000); // scale down for sparkline
    }
    return vals;
  }, [recent.data, days]);

  const path = useMemo(() => generateSparkPath(points, 300, 60), [points]);

  const totalSum = points.reduce((a, b) => a + b, 0) * 1000;

  return (
    <div className="p-4 bg-card border border-border rounded-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Penjualan (sparkline)</h3>
        <span className="text-xs text-muted-foreground">{days} hari</span>
      </div>
      <div className="w-full">
        {recent.isLoading ? (
          <div>Memuat …</div>
        ) : (
          <>
            <svg viewBox={`0 0 300 60`} width="100%" height={60} preserveAspectRatio="none">
              <path d={path} fill="none" stroke="url(#g)" strokeWidth={2} strokeLinecap="round" />
              <defs>
                <linearGradient id="g" x1="0" x2="1">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-xs text-muted-foreground mt-2">Total: Rp {new Intl.NumberFormat("id-ID").format(totalSum)}</div>
          </>
        )}
      </div>
    </div>
  );
}

