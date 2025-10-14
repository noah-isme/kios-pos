"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { listVariants, rowVariant } from "@/components/ui/motion-variants";

const MotionDiv = motion.div;

type MotionListProps = React.PropsWithChildren<{
  as?: React.ElementType;
  className?: string;
  variants?: Record<string, unknown> | unknown;
}>;

export function MotionList({ as: As = "div", children, className, variants = listVariants }: MotionListProps) {
  const Comp = MotionDiv as unknown as React.ElementType;
  return (
    <AnimatePresence>
      <Comp
        as={As}
        initial="hidden"
        animate="show"
        exit="hidden"
        variants={variants}
        className={className}
      >
        {children}
      </Comp>
    </AnimatePresence>
  );
}

type MotionItemProps = React.PropsWithChildren<{
  as?: React.ElementType;
  className?: string;
  variants?: Record<string, unknown> | unknown;
}>;

export function MotionItem({ children, className, variants = rowVariant, as: As = "div" }: MotionItemProps) {
  const Comp = MotionDiv as unknown as React.ElementType;
  return (
    <Comp as={As} variants={variants} initial="hidden" animate="show" exit="exit" className={className}>
      {children}
    </Comp>
  );
}

export default MotionList;
