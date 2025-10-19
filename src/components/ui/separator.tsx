import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", role = "separator", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role={role}
        aria-orientation={orientation === "vertical" ? "vertical" : undefined}
        className={cn(
          "bg-border",
          orientation === "vertical"
            ? "mx-2 h-6 w-px shrink-0"
            : "my-2 h-px w-full",
          className,
        )}
        {...props}
      />
    );
  },
);
Separator.displayName = "Separator";
