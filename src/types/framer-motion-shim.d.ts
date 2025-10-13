declare module "framer-motion" {
  import * as React from "react";

  export const AnimatePresence: React.ComponentType<any>;

  export const motion: {
    div: React.ComponentType<any>;
    tr: React.ComponentType<any>;
    tbody: React.ComponentType<any>;
    thead: React.ComponentType<any>;
    td: React.ComponentType<any>;
    th: React.ComponentType<any>;
    span: React.ComponentType<any>;
    [key: string]: React.ComponentType<any>;
  };

  export function useAnimation(): any;

  const _default: any;
  export default _default;
}
