import * as React from "react";
import { cn } from "../../lib/utils";

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-sm font-bold text-[#1A1A1A] font-heading mb-2",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
