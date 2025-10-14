declare module "framer-motion" {
  import * as React from "react";

  // Minimal, safe shims to avoid wide `any` usage in the repo's typings.
  // Consumers can refine these types by adding the official `framer-motion`
  // types if they need stronger typing.
  export type MotionProps = Record<string, unknown>;

  export const AnimatePresence: React.ComponentType<MotionProps>;

  export const motion: {
    div: React.ComponentType<MotionProps>;
    tr: React.ComponentType<MotionProps>;
    tbody: React.ComponentType<MotionProps>;
    thead: React.ComponentType<MotionProps>;
    td: React.ComponentType<MotionProps>;
    th: React.ComponentType<MotionProps>;
    span: React.ComponentType<MotionProps>;
    [key: string]: React.ComponentType<MotionProps>;
  };

  export function useAnimation(): unknown;

  const _default: unknown;
  export default _default;
}
