"use client";

import React from "react";
import { motion } from "framer-motion";
import { listVariants, rowVariant } from "@/components/ui/motion-variants";

type TableBodyProps = React.PropsWithChildren<{ className?: string; } & { variants?: Record<string, unknown> | unknown }>;

export function MotionTableBody({ children, className, variants = listVariants }: TableBodyProps) {
  return (
    <motion.tbody initial="hidden" animate="show" variants={variants} className={className}>
      {children}
    </motion.tbody>
  );
}

type TableRowProps = React.PropsWithChildren<{ className?: string } & Record<string, unknown>>;

export function MotionTableRow({ children, className, ...rest }: TableRowProps) {
  return (
    <motion.tr variants={rowVariant} className={className} {...(rest as Record<string, unknown>)}>
      {children}
    </motion.tr>
  );
}

export default MotionTableBody;
