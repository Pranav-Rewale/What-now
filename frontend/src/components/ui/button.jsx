import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold font-heading transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[#FFE100] text-[#000000] hover:bg-[#FFD000] active:scale-[0.98]",
        secondary:
          "bg-white text-[#1A1A1A] border border-[#E6E6E6] hover:bg-[#F0F0F0] active:scale-[0.98]",
        dark: "bg-[#1A1A1A] text-[#FFE100] hover:bg-[#000000] active:scale-[0.98]",
        outline:
          "border border-[#E6E6E6] bg-transparent text-[#1A1A1A] hover:bg-[#F0F0F0]",
        ghost: "bg-transparent text-[#3C3C3C] hover:bg-[#E6E6E6] hover:text-[#1A1A1A]",
        "ghost-white":
          "bg-transparent text-white/80 hover:bg-white/10 hover:text-white",
        destructive:
          "bg-[#FF4757] text-white hover:bg-[#E53E4D] active:scale-[0.98]",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[8px]",
        default: "h-10 px-5 text-sm rounded-[8px]",
        lg: "h-12 px-8 text-base rounded-[8px]",
        xl: "h-14 px-10 text-lg rounded-[8px]",
        icon: "h-9 w-9 rounded-[8px]",
        "icon-sm": "h-8 w-8 rounded-[8px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
