import { supabase } from "./supabase.ts";
import { validarArchivo } from "./documentosValidacion.ts";
import type { DocumentoPoliza, TipoDocumento } from "./types.ts";

const BUCKET = "documentos";
const URL_FIRMADA_SEGUNDOS = 60 * 60;

function nombreSeguro(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function urlFirmada(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, URL_FIRMADA_SEGUNDOS);
  if (error) throw error;
  return data.signedUrl;
}

export async function listDocumentos(_clienteId: string, polizaId: string): Promise<DocumentoPoliza[]> {
  const { data, error } = await supabase
    .from("documentos_poliza")
    .select("*")
    .eq("poliza_id", polizaId)
    .order("fecha_subida", { ascending: false });
  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (fila) => ({
      id: fila.id,
      nombreArchivo: fila.nombre_archivo,
      tipoDocumento: fila.tipo_documento as TipoDocumento,
      urlStorage: await urlFirmada(fila.storage_path),
      fechaSubida: fila.fecha_subida,
    })),
  );
}

export async function subirDocumento(
  clienteId: string,
  polizaId: string,
  archivo: File,
  tipoDocumento: TipoDocumento,
): Promise<DocumentoPoliza> {
  const motivo = validarArchivo(archivo);
  if (motivo) throw new Error(motivo);

  const path = `clientes/${clienteId}/polizas/${polizaId}/${crypto.randomUUID()}-${nombreSeguro(archivo.name)}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, archivo);
  if (uploadError) {
    throw new Error("No se pudo subir el documento. Revise su conexión e intente de nuevo.");
  }

  const { data: fila, error: insertError } = await supabase
    .from("documentos_poliza")
    .insert({
      poliza_id: polizaId,
      nombre_archivo: archivo.name,
      tipo_documento: tipoDocumento,
      storage_path: path,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
    throw new Error("No se pudo subir el documento. Revise su conexión e intente de nuevo.");
  }

  return {
    id: fila.id,
    nombreArchivo: fila.nombre_archivo,
    tipoDocumento: fila.tipo_documento,
    urlStorage: await urlFirmada(fila.storage_path),
    fechaSubida: fila.fecha_subida,
  };
}

export async function eliminarDocumento(
  _clienteId: string,
  _polizaId: string,
  documento: DocumentoPoliza,
): Promise<void> {
  const { data: fila } = await supabase
    .from("documentos_poliza")
    .select("storage_path")
    .eq("id", documento.id)
    .single();

  await supabase.from("documentos_poliza").delete().eq("id", documento.id);
  if (fila) {
    await supabase.storage.from(BUCKET).remove([fila.storage_path]).catch(() => undefined);
  }
}
