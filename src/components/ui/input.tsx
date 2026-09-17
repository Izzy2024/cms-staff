import * as React from "react";
import { cn } from "../../lib/utils.ts";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-input/90 bg-background px-3.5 py-2 text-base text-foreground shadow-2xs transition-all duration-150 outline-none",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-foreground/40 focus-visible:ring-3 focus-visible:ring-foreground/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
