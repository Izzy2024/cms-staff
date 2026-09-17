import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { ClienteConPolizas } from "./clientesRepo.ts";
import type { Cliente, Poliza } from "./types.ts";

export interface ItemRenovacion {
  clienteId: string;
  clienteNombre: string;
  poliza: Poliza;
  diasRestantes: number;
}

/**
 * Parsea la fecha de vigencia asegurando que formatos "YYYY-MM-DD" o cadenas ISO
 * se interpreten sin desfases de zona horaria sobre la fecha del calendario.
 */
export function parseVigenciaFecha(vigenciaFin: string): Date | null {
  if (!vigenciaFin || typeof vigenciaFin !== "string") return null;
  const trimmed = vigenciaFin.trim();
  if (!trimmed) return null;
  const dateOnly = trimmed.split("T")[0];
  const fecha = parseISO(dateOnly);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha;
}

/**
 * Calcula los días restantes para el vencimiento respecto a una fecha dada.
 * Retorna:
 * - número negativo si ya venció (ej. -1 si venció ayer).
 * - 0 si vence hoy.
 * - número positivo si vencerá en el futuro (ej. 29 si faltan 29 días).
 * - null si la fecha es inválida o vacía.
 */
export function calcularDiasRestantes(
  vigenciaFin: string,
  fechaReferencia: Date = new Date(),
): number | null {
  const fecha = parseVigenciaFecha(vigenciaFin);
  if (!fecha) return null;
  return differenceInCalendarDays(fecha, startOfDay(fechaReferencia));
}

/**
 * Determina si una póliza entra en el rango de renovación próxima (<= 30 días, incluyendo vencidas).
 */
export function esRenovacionProxima(
  vigenciaFinOrDias: string | number | null,
  fechaReferencia: Date = new Date(),
): boolean {
  const dias =
    typeof vigenciaFinOrDias === "number"
      ? vigenciaFinOrDias
      : typeof vigenciaFinOrDias === "string"
      ? calcularDiasRestantes(vigenciaFinOrDias, fechaReferencia)
      : null;

  if (dias === null) return false;
  return dias <= 30;
}

/**
 * Retorna la etiqueta según los días restantes:
 * - dias < 0: "Vencida"
 * - dias === 0: "Vence hoy"
 * - dias === 1: "Vence en 1 día"
 * - dias > 1: "Vence en X días"
 */
export function textoDiasRestantes(dias: number): string {
  if (dias < 0) {
    return "Vencida";
  }
  if (dias === 0) {
    return "Vence hoy";
  }
  if (dias === 1) {
    return "Vence en 1 día";
  }
  return `Vence en ${dias} días`;
}

/**
 * A partir de la lista de clientes con sus pólizas, extrae las pólizas cuya vigencia
 * esté en los próximos 30 días o menos (incluyendo ya vencidas) y las ordena por fecha de
 * vencimiento más próxima primero.
 */
export function obtenerRenovacionesProximas(
  clientes: ClienteConPolizas[],
  fechaReferencia: Date = new Date(),
): ItemRenovacion[] {
  const items: ItemRenovacion[] = [];

  for (const { cliente, polizas } of clientes) {
    for (const poliza of polizas) {
      const dias = calcularDiasRestantes(poliza.vigenciaFin, fechaReferencia);
      if (dias !== null && dias <= 30) {
        items.push({
          clienteId: cliente.id,
          clienteNombre: cliente.nombre,
          poliza,
          diasRestantes: dias,
        });
      }
    }
  }

  // Ordenar por fecha de vencimiento más próxima primero (menor diasRestantes primero)
  items.sort((a, b) => {
    if (a.diasRestantes !== b.diasRestantes) {
      return a.diasRestantes - b.diasRestantes;
    }
    const cmpCliente = a.clienteNombre.localeCompare(b.clienteNombre);
    if (cmpCliente !== 0) return cmpCliente;
    return a.poliza.numeroPoliza.localeCompare(b.poliza.numeroPoliza);
  });

  return items;
}

/**
 * Determina el estado activo/inactivo de un cliente según las fechas de sus pólizas.
 * Si tiene al menos una póliza vigente (diasRestantes >= 0), está activo y diasRelevante
 * es la vigencia más próxima a vencer. Si ninguna está vigente, no está activo y
 * diasRelevante es la más recientemente vencida. null si no hay fechas válidas.
 */
export function estadoClientePorFechas(polizas: Poliza[]): { activo: boolean; diasRelevante: number | null } {
  let mejorActiva: number | null = null;
  let mejorVencida: number | null = null;
  for (const p of polizas) {
    const dias = calcularDiasRestantes(p.vigenciaFin);
    if (dias === null) continue;
    if (dias >= 0) {
      if (mejorActiva === null || dias < mejorActiva) mejorActiva = dias;
    } else {
      if (mejorVencida === null || dias > mejorVencida) mejorVencida = dias;
    }
  }
  if (mejorActiva !== null) return { activo: true, diasRelevante: mejorActiva };
  return { activo: false, diasRelevante: mejorVencida };
}

/**
 * Estado efectivo del cliente: si tiene un estado manual forzado (activoManual),
 * ese manda; si está en automático (null/undefined), se calcula por fechas.
 */
export function esClienteActivo(cliente: Cliente, polizas: Poliza[]): boolean {
  if (cliente.activoManual !== null && cliente.activoManual !== undefined) return cliente.activoManual;
  return estadoClientePorFechas(polizas).activo;
}
