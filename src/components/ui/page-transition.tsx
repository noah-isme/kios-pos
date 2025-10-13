"use client";

import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

export function PageTransition({ children, keyProp }: { children: React.ReactNode; keyProp?: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={keyProp}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
