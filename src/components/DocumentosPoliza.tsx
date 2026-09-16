import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { format } from "date-fns";
import { Eye, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/button.tsx";
import { Cargando } from "./Cargando.tsx";
import { MensajeError } from "./MensajeError.tsx";
import { eliminarDocumento, listDocumentos, subirDocumento } from "../lib/documentosRepo.ts";
import { validarArchivo } from "../lib/documentosValidacion.ts";
import { TIPOS_DOCUMENTO, etiquetaTipoDocumento } from "../lib/types.ts";
import type { DocumentoPoliza, TipoDocumento } from "../lib/types.ts";

function formatearFecha(fecha: string): string {
  const date = new Date(fecha);
  return Number.isNaN(date.getTime()) ? fecha : format(date, "dd/MM/yyyy HH:mm");
}

export function DocumentosPoliza({ clienteId, polizaId }: { clienteId: string; polizaId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentos, setDocumentos] = useState<DocumentoPoliza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("poliza");

  useEffect(() => {
    setCargando(true);
    listDocumentos(clienteId, polizaId)
      .then(setDocumentos)
      .catch(() => setError("No se pudieron cargar los documentos de esta póliza."))
      .finally(() => setCargando(false));
  }, [clienteId, polizaId]);

  function limpiarSeleccion(): void {
    setArchivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleSeleccion(event: ChangeEvent<HTMLInputElement>): void {
    const seleccionado = event.target.files?.[0] ?? null;
    setArchivo(seleccionado);
    setError(seleccionado ? (validarArchivo(seleccionado) ?? "") : "");
  }

  async function handleSubir(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!archivo) {
      setError("Primero seleccione un archivo para subir.");
      return;
    }
    const motivo = validarArchivo(archivo);
    if (motivo) {
      setError(motivo);
      return;
    }
    setError("");
    setSubiendo(true);
    try {
      await subirDocumento(clienteId, polizaId, archivo, tipoDocumento);
      setDocumentos(await listDocumentos(clienteId, polizaId));
      limpiarSeleccion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el documento. Intente de nuevo.");
    } finally {
      setSubiendo(false);
    }
  }

  async function handleEliminar(documento: DocumentoPoliza): Promise<void> {
    if (!window.confirm(`¿Seguro que desea eliminar el documento «${documento.nombreArchivo}»?`)) return;
    setError("");
    try {
      await eliminarDocumento(clienteId, polizaId, documento);
      setDocumentos(await listDocumentos(clienteId, polizaId));
    } catch {
      setError("No se pudo eliminar el documento. Intente de nuevo.");
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
      <h4 className="text-lg font-semibold text-foreground">Documentos de la póliza</h4>

      <form onSubmit={handleSubir} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={handleSeleccion}
          className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-base file:font-medium file:text-foreground sm:w-auto sm:flex-1"
        />
        <select
          value={tipoDocumento}
          onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
          aria-label="Tipo de documento"
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto"
        >
          {TIPOS_DOCUMENTO.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={subiendo} className="w-full sm:w-auto">
          <Upload aria-hidden="true" />
          {subiendo ? "Subiendo…" : "Subir documento"}
        </Button>
      </form>

      <p className="text-base text-muted-foreground">
        Formatos permitidos: PDF, JPG o PNG. Tamaño máximo: 10 MB.
      </p>

      {error ? <MensajeError>{error}</MensajeError> : null}

      {cargando ? (
        <Cargando className="py-6" mensaje="Cargando documentos…" />
      ) : documentos.length === 0 ? (
        <p className="text-base text-muted-foreground">Esta póliza todavía no tiene documentos.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {documentos.map((documento) => (
            <li
              key={documento.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-base font-semibold break-words text-foreground">{documento.nombreArchivo}</p>
                <p className="mt-1 text-base text-muted-foreground">
                  {etiquetaTipoDocumento(documento.tipoDocumento)} · {formatearFecha(documento.fechaSubida)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={documento.urlStorage} target="_blank" rel="noreferrer" />}
                >
                  <Eye aria-hidden="true" />
                  Ver
                </Button>
                <Button variant="destructive" onClick={() => void handleEliminar(documento)}>
                  <Trash2 aria-hidden="true" />
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
