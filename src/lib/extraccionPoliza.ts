import { supabase } from "./supabase";
import { TIPOS_SEGURO } from "./types";
import type { TipoSeguro } from "./types";

const ERROR_GENERICO =
  "No se pudo analizar el documento. Intente de nuevo o cargue los datos manualmente.";

export interface ResultadoExtraccion {
  cliente: {
    nombre: string;
    cedula: string;
    telefono: string;
    email: string;
  };
  poliza: {
    aseguradora: string;
    tipoSeguro: string;
    detalleBien: string;
    numeroPoliza: string;
    vigenciaInicio: string;
    vigenciaFin: string;
    prima: number;
    observaciones: string;
    beneficios: string;
    coberturaAuto: string;
    frecuenciaPago: string;
    conductoPago: string;
    diaPago: string;
    numeroCuotas: number;
  };
  avisos: string[];
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string";
}

function normalizarTexto(valor: unknown): string {
  return esTexto(valor) ? valor.trim() : "";
}

function normalizarNumero(valor: unknown): number {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (esTexto(valor)) {
    const parsed = Number(valor.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizarTipoSeguro(valor: unknown): string {
  const str = normalizarTexto(valor);
  const match = TIPOS_SEGURO.find(
    (t) => t.toLowerCase() === str.toLowerCase(),
  );
  if (match) return match;
  if (/auto|veh[ií]culo|autom[oó]vil/i.test(str)) return "Auto";
  if (/viajer[ao]|viaje/i.test(str)) return "Asistencia Viajera";
  return TIPOS_SEGURO.includes(str as TipoSeguro) ? str : "Otro";
}

function normalizarCoberturaAuto(valor: unknown): string {
  if (!esTexto(valor)) return "";
  const v = valor.trim().toLowerCase();
  if (v.includes("tercero") || v.includes("responsabilidad civil") || v.includes("rc")) {
    return "Solo a terceros";
  }
  if (v.includes("completa") || v.includes("amplia") || v.includes("comprensiv") || v.includes("colisi")) {
    return "Cobertura completa";
  }
  if (valor === "Cobertura completa" || valor === "Solo a terceros") {
    return valor;
  }
  return "";
}

function normalizarFrecuenciaPago(valor: unknown): string {
  if (!esTexto(valor)) return "";
  const v = valor.trim().toLowerCase();
  if (v.includes("mensual")) return "Mensual";
  if (v.includes("semestral")) return "Semestral";
  if (v.includes("trimestral")) return "Trimestral";
  if (v.includes("anual") || v.includes("contado") || v.includes("único") || v.includes("unico")) return "Anual";
  if (["Anual", "Semestral", "Trimestral", "Mensual"].includes(valor.trim())) {
    return valor.trim();
  }
  return "";
}

function normalizarConductoPago(valor: unknown): string {
  if (!esTexto(valor)) return "";
  const v = valor.trim().toLowerCase();
  if (
    v.includes("tarjeta") ||
    v.includes("tcr") ||
    v.includes("t.c.") ||
    v.includes("crédito") ||
    v.includes("credito")
  ) {
    return "TCR";
  }
  if (
    v.includes("ach") ||
    v.includes("banco") ||
    v.includes("cuenta") ||
    v.includes("débito") ||
    v.includes("debito")
  ) {
    return "ACH";
  }
  if (
    v.includes("voluntari") ||
    v.includes("directo") ||
    v.includes("ventanilla") ||
    v.includes("cobrador")
  ) {
    return "Voluntaria";
  }
  if (["Voluntaria", "TCR", "ACH"].includes(valor.trim())) {
    return valor.trim();
  }
  return "";
}

function normalizarNumeroCuotas(valor: unknown): number {
  const num = normalizarNumero(valor);
  if (num >= 1) return Math.floor(num);
  return 1;
}

function validarResultado(datos: unknown): datos is ResultadoExtraccion {
  if (typeof datos !== "object" || datos === null) return false;
  const d = datos as Record<string, unknown>;
  if (typeof d.cliente !== "object" || d.cliente === null) return false;
  if (typeof d.poliza !== "object" || d.poliza === null) return false;
  if (!Array.isArray(d.avisos)) return false;
  return true;
}

/**
 * Renderiza el PDF a imágenes y lo envía a la Edge Function
 * "extraer-poliza" para su análisis con DeepSeek.
 */
export async function extraerPolizaDesdeArchivo(
  archivo: File,
): Promise<ResultadoExtraccion> {
  let imagenes: string[];
  try {
    const { renderizarPaginasComoImagenes } = await import("./renderizarPdf");
    imagenes = await renderizarPaginasComoImagenes(archivo);
  } catch {
    throw new Error(ERROR_GENERICO);
  }

  if (imagenes.length === 0) {
    throw new Error(ERROR_GENERICO);
  }

  let respuesta: ResultadoExtraccion;
  try {
    const { data, error } = await supabase.functions.invoke(
      "extraer-poliza",
      { body: { imagenes } },
    );
    if (error) throw error;
    if (!validarResultado(data)) throw new Error(ERROR_GENERICO);
    respuesta = data;
  } catch {
    throw new Error(ERROR_GENERICO);
  }

  const rawPoliza = (respuesta.poliza ?? {}) as Record<string, unknown>;

  const tipoSeguro = normalizarTipoSeguro(rawPoliza.tipoSeguro);
  const coberturaAuto = normalizarCoberturaAuto(rawPoliza.coberturaAuto);
  const frecuenciaPago = normalizarFrecuenciaPago(rawPoliza.frecuenciaPago);
  const conductoPago = normalizarConductoPago(rawPoliza.conductoPago);
  const diaPago = normalizarTexto(rawPoliza.diaPago);
  const numeroCuotas = normalizarNumeroCuotas(rawPoliza.numeroCuotas);

  const avisos: string[] = Array.isArray(respuesta.avisos)
    ? respuesta.avisos.filter(esTexto)
    : [];

  if (tipoSeguro === "Auto" && !coberturaAuto && !avisos.some((a) => a.toLowerCase().includes("cobertura"))) {
    avisos.push("No se encontró la cobertura de auto.");
  }
  if (!frecuenciaPago && !avisos.some((a) => a.toLowerCase().includes("frecuencia"))) {
    avisos.push("No se encontró la frecuencia de pago.");
  }
  if (!conductoPago && !avisos.some((a) => a.toLowerCase().includes("conducto"))) {
    avisos.push("No se encontró el conducto de pago.");
  }
  if (!diaPago && !avisos.some((a) => a.toLowerCase().includes("día") || a.toLowerCase().includes("dia"))) {
    avisos.push("No se encontró el día de pago.");
  }
  if (!rawPoliza.numeroCuotas && !avisos.some((a) => a.toLowerCase().includes("cuota"))) {
    avisos.push("No se encontró el número de cuotas (se asignó 1 por defecto).");
  }

  return {
    cliente: {
      nombre: normalizarTexto(respuesta.cliente.nombre),
      cedula: normalizarTexto(respuesta.cliente.cedula),
      telefono: normalizarTexto(respuesta.cliente.telefono),
      email: normalizarTexto(respuesta.cliente.email),
    },
    poliza: {
      aseguradora: normalizarTexto(rawPoliza.aseguradora),
      tipoSeguro,
      detalleBien: normalizarTexto(rawPoliza.detalleBien),
      numeroPoliza: normalizarTexto(rawPoliza.numeroPoliza),
      vigenciaInicio: normalizarTexto(rawPoliza.vigenciaInicio),
      vigenciaFin: normalizarTexto(rawPoliza.vigenciaFin),
      prima: normalizarNumero(rawPoliza.prima),
      observaciones: normalizarTexto(rawPoliza.observaciones),
      beneficios: normalizarTexto(rawPoliza.beneficios),
      coberturaAuto,
      frecuenciaPago,
      conductoPago,
      diaPago,
      numeroCuotas,
    },
    avisos,
  };
}
