"use client";

import { Building2, ChevronDown } from "lucide-react";

import { useOutlet } from "@/lib/outlet-context";
import { Badge } from "@/components/ui/badge";

export function OutletSelector() {
  const { currentOutlet, userOutlets, setCurrentOutlet, isLoading } = useOutlet();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!currentOutlet || userOutlets.length === 0) {
    return null;
  }

  return (
    <label className="flex items-center gap-3 rounded-md border bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
      <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {currentOutlet.name}
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{currentOutlet.code}</span>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {userOutlets.find((uo) => uo.outletId === currentOutlet.id)?.role || "CASHIER"}
          </Badge>
        </div>
      </div>
      <div className="relative ml-2 flex items-center">
        <select
          aria-label="Pilih outlet aktif"
          value={currentOutlet.id}
          onChange={(event) => {
            const selectedOutlet = userOutlets.find((uo) => uo.outletId === event.target.value)?.outlet;
            if (selectedOutlet) {
              setCurrentOutlet(selectedOutlet);
            }
          }}
          className="appearance-none rounded-md border border-transparent bg-transparent px-3 py-2 pr-8 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {userOutlets.map((userOutlet) => (
            <option key={userOutlet.id} value={userOutlet.outletId}>
              {userOutlet.outlet.name} ({userOutlet.outlet.code})
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
    </label>
  );
}