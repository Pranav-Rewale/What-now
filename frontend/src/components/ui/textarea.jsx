import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex w-full rounded-[8px] border border-[#E6E6E6] bg-[#FAFAFA] px-4 py-3 text-sm font-medium text-[#1A1A1A] placeholder:text-[#A0A0A0] transition-all focus:outline-none focus:ring-2 focus:ring-[#FFE100] focus:border-[#FFE100] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
