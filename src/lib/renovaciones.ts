import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { ClienteConPolizas } from "./clientesRepo.ts";
import type { Cliente, Poliza } from "./types.ts";

export interface ItemRenovacion {
  clienteId: string;
  clienteNombre: string;
  clienteTelefono?: string;
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
 * Excluye las pólizas que ya fueron renovadas (las que aparecen como
 * polizaAnteriorId de otra póliza de la lista).
 */
export function polizasActuales(polizas: Poliza[]): Poliza[] {
  const idsRenovadas = new Set(
    polizas.map((p) => p.polizaAnteriorId).filter((id): id is string => Boolean(id)),
  );
  return polizas.filter((p) => !idsRenovadas.has(p.id));
}

/**
 * Retorna las vigencias anteriores siguiendo polizaAnteriorId, de la más
 * reciente a la más antigua. Protege contra ciclos cortando si el recorrido
 * supera polizas.length.
 */
export function historialDe(poliza: Poliza, polizas: Poliza[]): Poliza[] {
  const porId = new Map(polizas.map((p) => [p.id, p]));
  const historial: Poliza[] = [];
  const visitados = new Set<string>([poliza.id]);
  let actualId = poliza.polizaAnteriorId;

  while (actualId && historial.length < polizas.length && !visitados.has(actualId)) {
    visitados.add(actualId);
    const anterior = porId.get(actualId);
    if (!anterior) break;
    historial.push(anterior);
    actualId = anterior.polizaAnteriorId;
  }

  return historial;
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
    for (const poliza of polizasActuales(polizas)) {
      const dias = calcularDiasRestantes(poliza.vigenciaFin, fechaReferencia);
      if (dias !== null && dias <= 30) {
        items.push({
          clienteId: cliente.id,
          clienteNombre: cliente.nombre,
          clienteTelefono: cliente.telefono || undefined,
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
  for (const p of polizasActuales(polizas)) {
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

/**
 * Cuenta los clientes activos usando la misma regla que la lista de clientes
 * (el estado manual manda; si no, se calcula por fechas de sus pólizas).
 */
export function contarClientesActivos(clientes: ClienteConPolizas[]): number {
  let activos = 0;
  for (const { cliente, polizas } of clientes) {
    if (esClienteActivo(cliente, polizas)) activos += 1;
  }
  return activos;
}

/**
 * Cuenta el total de pólizas vigentes (vigenciaFin todavía no vencida, es decir
 * diasRestantes >= 0) de todos los clientes.
 */
export function contarPolizasActivas(
  clientes: ClienteConPolizas[],
  fechaReferencia: Date = new Date(),
): number {
  let activas = 0;
  for (const { polizas } of clientes) {
    for (const poliza of polizasActuales(polizas)) {
      const dias = calcularDiasRestantes(poliza.vigenciaFin, fechaReferencia);
      if (dias !== null && dias >= 0) activas += 1;
    }
  }
  return activas;
}

export interface CumpleanosProximo {
  clienteId: string;
  clienteNombre: string;
  clienteTelefono?: string;
  dia: number;
  mes: number;
  diasRestantes: number;
}

/**
 * Extrae día y mes de una fecha de nacimiento "YYYY-MM-DD" (ignorando año y hora).
 * Retorna null si el formato no es válido.
 */
export function parseFechaNacimiento(fecha?: string): { dia: number; mes: number } | null {
  if (!fecha || typeof fecha !== "string") return null;
  const partes = fecha.trim().split("T")[0].split("-");
  if (partes.length !== 3) return null;
  const anio = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || !Number.isInteger(dia)) return null;
  if (anio < 1 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { dia, mes };
}

/**
 * Clientes cuyo cumpleaños cae dentro de los próximos `rangoDias` días, comparando
 * solo mes y día (ignora el año y contempla el cruce de fin de año). Ordena por el
 * cumpleaños más cercano primero. Los clientes sin fechaNacimiento válida se excluyen.
 */
export function obtenerCumpleanosProximos(
  clientes: ClienteConPolizas[],
  fechaReferencia: Date = new Date(),
  rangoDias = 30,
): CumpleanosProximo[] {
  const referencia = startOfDay(fechaReferencia);
  const anio = referencia.getFullYear();
  const items: CumpleanosProximo[] = [];

  for (const { cliente } of clientes) {
    const nacimiento = parseFechaNacimiento(cliente.fechaNacimiento);
    if (!nacimiento) continue;

    let dias = differenceInCalendarDays(new Date(anio, nacimiento.mes - 1, nacimiento.dia), referencia);
    if (dias < 0) {
      // Ya pasó este año: el próximo cumpleaños es el año siguiente.
      dias = differenceInCalendarDays(new Date(anio + 1, nacimiento.mes - 1, nacimiento.dia), referencia);
    }
    if (dias < 0 || dias > rangoDias) continue;

    items.push({
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      clienteTelefono: cliente.telefono || undefined,
      dia: nacimiento.dia,
      mes: nacimiento.mes,
      diasRestantes: dias,
    });
  }

  items.sort((a, b) => {
    if (a.diasRestantes !== b.diasRestantes) return a.diasRestantes - b.diasRestantes;
    return a.clienteNombre.localeCompare(b.clienteNombre);
  });

  return items;
}
