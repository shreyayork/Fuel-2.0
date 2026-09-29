"use client";

import type { ComponentPropsWithoutRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Theme } from "@/lib/theme";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
  t,
  align = "start",
  sideOffset = 6,
  style,
  ...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { t: Theme }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          boxShadow: `0 8px 24px ${t.ink}14`,
          color: t.ink,
          fontFamily: t.sans,
          outline: "none",
          padding: 0,
          zIndex: 2050,
          ...style,
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
