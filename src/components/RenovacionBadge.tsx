import { AlertCircle, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "./ui/badge.tsx";
import {
  calcularDiasRestantes,
  esRenovacionProxima,
  textoDiasRestantes,
} from "../lib/renovaciones.ts";

export interface RenovacionBadgeProps {
  vigenciaFin?: string;
  diasRestantes?: number | null;
  fechaReferencia?: Date;
  className?: string;
}

export function RenovacionBadge({
  vigenciaFin,
  diasRestantes: diasProp,
  fechaReferencia,
  className,
}: RenovacionBadgeProps) {
  const dias =
    typeof diasProp === "number"
      ? diasProp
      : vigenciaFin
      ? calcularDiasRestantes(vigenciaFin, fechaReferencia)
      : null;

  if (!esRenovacionProxima(dias)) {
    return null;
  }

  // Si llega aquí, dias es number y <= 30
  const diasNum = dias as number;
  const texto = textoDiasRestantes(diasNum);

  if (diasNum < 0) {
    return (
      <Badge
        variant="destructive"
        className={className}
        title={`Póliza vencida hace ${Math.abs(diasNum)} días`}
        data-testid="badge-renovacion"
      >
        <AlertCircle aria-hidden="true" />
        <span>{texto}</span>
      </Badge>
    );
  }

  if (diasNum === 0) {
    return (
      <Badge
        variant="destructive"
        className={className}
        title="La póliza vence hoy"
        data-testid="badge-renovacion"
      >
        <AlertTriangle aria-hidden="true" />
        <span>{texto}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="warning"
      className={className}
      title={`Vence en ${diasNum} días`}
      data-testid="badge-renovacion"
    >
      {diasNum <= 7 ? (
        <AlertTriangle aria-hidden="true" />
      ) : (
        <Clock aria-hidden="true" />
      )}
      <span>{texto}</span>
    </Badge>
  );
}
