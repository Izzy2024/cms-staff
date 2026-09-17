import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils.ts";

export interface EmptyStateProps {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
  className?: string;
}

export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center shadow-2xs",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-8 ring-muted/30">
        <Icono className="size-7" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {titulo}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground sm:text-base">
        {descripcion}
      </p>
      {accion ? <div className="mt-6 flex flex-wrap justify-center gap-3">{accion}</div> : null}
    </div>
  );
}
