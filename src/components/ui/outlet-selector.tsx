"use client";

import { Building2 } from "lucide-react";

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
    <div className="flex items-center gap-3 px-3 py-2 border rounded-md">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{currentOutlet.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{currentOutlet.code}</span>
          <Badge variant="secondary" className="text-xs">
            {userOutlets.find((uo) => uo.outletId === currentOutlet.id)?.role || "CASHIER"}
          </Badge>
        </div>
      </div>
      <select
        value={currentOutlet.id}
        onChange={(e) => {
          const selectedOutlet = userOutlets.find((uo) => uo.outletId === e.target.value)?.outlet;
          if (selectedOutlet) {
            setCurrentOutlet(selectedOutlet);
          }
        }}
        className="ml-2 text-sm border-none bg-transparent focus:outline-none cursor-pointer"
      >
        {userOutlets.map((userOutlet) => (
          <option key={userOutlet.id} value={userOutlet.outletId}>
            {userOutlet.outlet.name} ({userOutlet.outlet.code})
          </option>
        ))}
      </select>
    </div>
  );
}