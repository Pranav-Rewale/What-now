import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-bold text-xs uppercase tracking-wide rounded-full leading-none",
  {
    variants: {
      variant: {
        default: "bg-[#E6E6E6] text-[#1A1A1A] px-3 py-1",
        primary: "bg-[#FFE100] text-[#000000] px-3 py-1",
        dark: "bg-[#1A1A1A] text-[#FFE100] px-3 py-1",
        outline: "border border-[#E6E6E6] text-[#3C3C3C] px-3 py-1",
        time: "bg-[#E6E6E6] text-[#3C3C3C] px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, style, ...props }) {
  return (
    <div
      className={cn(badgeVariants({ variant, className }))}
      style={style}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
