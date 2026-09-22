import type { Poliza } from "./types.ts";

// Panamá: cambiar aquí si la cartera es de otro país.
const CODIGO_PAIS = "507";

/**
 * Convierte un número de teléfono a formato E.164 / enlace wa.me.
 * Deja solo dígitos. Si no contiene dígitos, retorna null.
 * Si tiene 8 dígitos o menos (formato local de Panamá), antepone el código de país.
 * Si tiene más de 8 dígitos, se asume que ya incluye código de país.
 */
export function enlaceWhatsApp(telefono: string | undefined, mensaje: string): string | null {
  if (!telefono || typeof telefono !== "string") return null;
  const digitos = telefono.replace(/\D/g, "");
  if (!digitos) return null;

  const numeroFinal = digitos.length <= 8 ? `${CODIGO_PAIS}${digitos}` : digitos;
  return `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Formatea una fecha YYYY-MM-DD a formato dd/mm/aaaa sin desfases de zona horaria.
 */
function formatearFechaDma(fechaStr: string): string {
  if (!fechaStr || typeof fechaStr !== "string") return "";
  const partes = fechaStr.trim().split("T")[0].split("-");
  if (partes.length !== 3) return fechaStr;
  const [anio, mes, dia] = partes;
  if (!anio || !mes || !dia) return fechaStr;
  return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio}`;
}

/**
 * Obtiene el primer nombre a partir del nombre completo.
 * Si el nombre viene vacío, retorna una cadena vacía.
 */
function obtenerPrimerNombre(nombreCompleto: string): string {
  const partes = (nombreCompleto || "").trim().split(/\s+/);
  return partes[0] || "";
}

/**
 * Genera el texto del mensaje de recordatorio de renovación para WhatsApp.
 * "Hola {primer nombre}, le saluda su corredor de seguros. Su póliza de {tipoSeguro} N° {numeroPoliza} con {aseguradora} {vence el dd/mm/aaaa | venció el dd/mm/aaaa}. ¿Le ayudo con la renovación?"
 * (venció si diasRestantes < 0).
 */
export function mensajeRenovacion(
  clienteNombre: string,
  poliza: Poliza,
  diasRestantes: number,
): string {
  const primerNombre = obtenerPrimerNombre(clienteNombre);
  const accionVerbo = diasRestantes < 0 ? "venció" : "vence";
  const fechaDma = formatearFechaDma(poliza.vigenciaFin);
  return `Hola ${primerNombre}, le saluda su corredor de seguros. Su póliza de ${poliza.tipoSeguro} N° ${poliza.numeroPoliza} con ${poliza.aseguradora} ${accionVerbo} el ${fechaDma}. ¿Le ayudo con la renovación?`;
}

/**
 * Genera el texto del saludo de cumpleaños para WhatsApp.
 * "¡Feliz cumpleaños, {primer nombre}! Le deseo un excelente día. Saludos de su corredor de seguros."
 */
export function mensajeCumpleanos(clienteNombre: string): string {
  const primerNombre = obtenerPrimerNombre(clienteNombre);
  return `¡Feliz cumpleaños, ${primerNombre}! Le deseo un excelente día. Saludos de su corredor de seguros.`;
}
