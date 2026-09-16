import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils.ts";

export function Cargando({ mensaje = "Cargando…", className }: { mensaje?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center gap-3 py-16 text-muted-foreground", className)}
    >
      <Loader2 className="size-6 shrink-0 animate-spin" aria-hidden="true" />
      <span className="text-lg font-medium">{mensaje}</span>
    </div>
  );
}
