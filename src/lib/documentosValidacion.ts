export const EXTENSIONES_PERMITIDAS = ["pdf", "jpg", "jpeg", "png"];
export const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

export function validarArchivo(archivo: { name: string; size: number }): string | null {
  const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
  if (!extension || !EXTENSIONES_PERMITIDAS.includes(extension)) {
    return "Tipo de archivo no permitido. Solo se aceptan PDF, JPG o PNG.";
  }
  if (archivo.size === 0) {
    return "El archivo está vacío.";
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return "El archivo supera el tamaño máximo de 10 MB.";
  }
  return null;
}
