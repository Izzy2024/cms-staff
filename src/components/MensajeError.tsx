import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../lib/utils.ts";

export function MensajeError({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <p className="text-base font-medium text-destructive">{children}</p>
    </div>
  );
}
