import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase.ts";
import { validarArchivo } from "./documentosValidacion.ts";
import type { DocumentoPoliza, TipoDocumento } from "./types.ts";

function nombreSeguro(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function documentosCol(clienteId: string, polizaId: string) {
  return collection(db, "clientes", clienteId, "polizas", polizaId, "documentos");
}

export async function listDocumentos(clienteId: string, polizaId: string): Promise<DocumentoPoliza[]> {
  const snap = await getDocs(documentosCol(clienteId, polizaId));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as DocumentoPoliza)
    .sort((a, b) => b.fechaSubida.localeCompare(a.fechaSubida));
}

export async function subirDocumento(
  clienteId: string,
  polizaId: string,
  archivo: File,
  tipoDocumento: TipoDocumento,
): Promise<DocumentoPoliza> {
  const motivo = validarArchivo(archivo);
  if (motivo) throw new Error(motivo);

  const docRef = doc(documentosCol(clienteId, polizaId));
  const archivoRef = ref(
    storage,
    `clientes/${clienteId}/polizas/${polizaId}/${docRef.id}-${nombreSeguro(archivo.name)}`,
  );

  await uploadBytes(archivoRef, archivo);

  let urlStorage: string;
  try {
    urlStorage = await getDownloadURL(archivoRef);
  } catch (error) {
    await deleteObject(archivoRef).catch(() => undefined);
    throw error;
  }

  const documento: Omit<DocumentoPoliza, "id"> = {
    nombreArchivo: archivo.name,
    tipoDocumento,
    urlStorage,
    fechaSubida: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, documento);
  } catch (error) {
    await deleteObject(archivoRef).catch(() => undefined);
    throw error;
  }

  return { id: docRef.id, ...documento };
}

export async function eliminarDocumento(
  clienteId: string,
  polizaId: string,
  documento: DocumentoPoliza,
): Promise<void> {
  await deleteDoc(doc(db, "clientes", clienteId, "polizas", polizaId, "documentos", documento.id));
  await deleteObject(ref(storage, documento.urlStorage)).catch(() => undefined);
}
