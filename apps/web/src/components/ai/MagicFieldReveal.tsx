"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps any block and reveals it with a small stagger-friendly fade-up.
 * Drop it around form fields, cards, or list items in a parent that
 * provides `delay` index so children land sequentially. Identical
 * easing to the marketing surfaces, so reveals feel consistent.
 */
export function MagicFieldReveal({
  index = 0,
  delayStep = 0.06,
  children,
  style,
}: {
  index?: number;
  delayStep?: number;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * delayStep,
        duration: 0.45,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
