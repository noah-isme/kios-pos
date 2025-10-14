import * as React from "react";

// Provide a small declaration merging file to align framer-motion element types with React 19
// This keeps typing stricter than the previous any-shim while avoiding deep version conflicts.
declare module "framer-motion" {
  // Minimal MotionProps used in our components. Use `unknown` and
  // `Record<string, unknown>` to avoid wide `any` while remaining flexible.
  export interface MotionProps extends React.HTMLAttributes<HTMLElement> {
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    variants?: Record<string, unknown> | unknown;
    whileHover?: unknown;
    whileTap?: unknown;
  }

  type MotionComponent<P> = React.ForwardRefExoticComponent<P & React.RefAttributes<unknown>>;

  export const motion: {
    div: MotionComponent<React.HTMLAttributes<HTMLDivElement> & MotionProps>;
    tr: MotionComponent<React.HTMLAttributes<HTMLTableRowElement> & MotionProps>;
    tbody: MotionComponent<React.HTMLAttributes<HTMLTableSectionElement> & MotionProps>;
    thead: MotionComponent<React.HTMLAttributes<HTMLTableSectionElement> & MotionProps>;
    td: MotionComponent<React.TdHTMLAttributes<HTMLTableCellElement> & MotionProps>;
    th: MotionComponent<React.ThHTMLAttributes<HTMLTableHeaderCellElement> & MotionProps>;
    span: MotionComponent<React.HTMLAttributes<HTMLSpanElement> & MotionProps>;
    button: MotionComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & MotionProps>;
    [key: string]: MotionComponent<React.HTMLAttributes<HTMLElement> & MotionProps>;
  };

  export const AnimatePresence: React.ComponentType<Record<string, unknown>>;
  export function useAnimation(): unknown;
  export default motion as unknown;
}
