import * as React from "react";

// Provide a small declaration merging file to align framer-motion element types with React 19
// This keeps typing stricter than the previous any-shim while avoiding deep version conflicts.
declare module "framer-motion" {
  // Minimal MotionProps used in our components
  export interface MotionProps extends React.HTMLAttributes<HTMLElement> {
    initial?: any;
    animate?: any;
    exit?: any;
    variants?: any;
    whileHover?: any;
    whileTap?: any;
  }

  type MotionComponent<P> = React.ForwardRefExoticComponent<P & React.RefAttributes<any>>;

  export const motion: {
    div: MotionComponent<React.HTMLAttributes<HTMLDivElement> & MotionProps>;
    tr: MotionComponent<React.HTMLAttributes<HTMLTableRowElement> & MotionProps>;
    tbody: MotionComponent<React.HTMLAttributes<HTMLTableSectionElement> & MotionProps>;
    thead: MotionComponent<React.HTMLAttributes<HTMLTableSectionElement> & MotionProps>;
    td: MotionComponent<React.TdHTMLAttributes<HTMLTableCellElement> & MotionProps>;
    th: MotionComponent<React.ThHTMLAttributes<HTMLTableHeaderCellElement> & MotionProps>;
    span: MotionComponent<React.HTMLAttributes<HTMLSpanElement> & MotionProps>;
    button: MotionComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & MotionProps>;
    [key: string]: MotionComponent<any>;
  };

  export const AnimatePresence: React.ComponentType<any>;
  export function useAnimation(): any;
  export default motion;
}
