"use client";

import * as React from "react";
import { motion } from 'framer-motion';

import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string };

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "peer flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          {...props}
        />
        {label ? (
          (() => {
                const MotionLabel = motion.label;
            return (
              <MotionLabel
                htmlFor={props.id}
                initial={false}
                animate={props.value ? { y: -22, scale: 0.85 } : undefined}
                className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground transition-all"
              >
                {label}
              </MotionLabel>
            );
          })()
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
