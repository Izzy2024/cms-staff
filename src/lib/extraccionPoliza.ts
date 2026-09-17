import { supabase } from "./supabase";
import { renderizarPaginasComoImagenes } from "./renderizarPdf";

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
  };
  avisos: string[];
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string";
}

function normalizarTexto(valor: unknown): string {
  return esTexto(valor) ? valor : "";
}

function normalizarNumero(valor: unknown): number {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (esTexto(valor)) {
    const parsed = Number(valor.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
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

  return {
    cliente: {
      nombre: normalizarTexto(respuesta.cliente.nombre),
      cedula: normalizarTexto(respuesta.cliente.cedula),
      telefono: normalizarTexto(respuesta.cliente.telefono),
      email: normalizarTexto(respuesta.cliente.email),
    },
    poliza: {
      aseguradora: normalizarTexto(respuesta.poliza.aseguradora),
      tipoSeguro: normalizarTexto(respuesta.poliza.tipoSeguro),
      detalleBien: normalizarTexto(respuesta.poliza.detalleBien),
      numeroPoliza: normalizarTexto(respuesta.poliza.numeroPoliza),
      vigenciaInicio: normalizarTexto(respuesta.poliza.vigenciaInicio),
      vigenciaFin: normalizarTexto(respuesta.poliza.vigenciaFin),
      prima: normalizarNumero(respuesta.poliza.prima),
      observaciones: normalizarTexto(respuesta.poliza.observaciones),
      beneficios: normalizarTexto(respuesta.poliza.beneficios),
    },
    avisos: Array.isArray(respuesta.avisos)
      ? respuesta.avisos.filter(esTexto)
      : [],
  };
}
