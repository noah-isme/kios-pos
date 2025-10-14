"use client";

import dynamic from "next/dynamic";
import React from "react";

const RecentSalesWidget = dynamic(() => import("@/components/dashboard/recent-sales"), { ssr: false });
const SalesChart = dynamic(() => import("@/components/dashboard/sales-chart"), { ssr: false });
const LowStockWidget = dynamic(() => import("@/components/dashboard/low-stock"), { ssr: false });

export default function DashboardWidgets({ days = 7 }: { days?: number }) {
  return (
    <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <RecentSalesWidget />
        <div className="mt-4">
          <SalesChart days={days} />
        </div>
      </div>
      <div>
        <LowStockWidget />
      </div>
    </section>
  );
}
