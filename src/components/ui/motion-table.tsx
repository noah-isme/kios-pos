"use client";

import React from "react";
import { motion } from "framer-motion";
import { listVariants, rowVariant } from "@/components/ui/motion-variants";

export function MotionTableBody({ children, className }: any) {
  return (
    <motion.tbody initial="hidden" animate="show" variants={listVariants} className={className}>
      {children}
    </motion.tbody>
  );
}

export function MotionTableRow({ children, className, ...rest }: any) {
  return (
    <motion.tr variants={rowVariant} className={className} {...rest}>
      {children}
    </motion.tr>
  );
}

export default MotionTableBody;
