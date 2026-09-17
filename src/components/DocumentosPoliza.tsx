import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { format } from "date-fns";
import { ExternalLink, File, FileImage, FileText, FolderOpen, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/button.tsx";
import { Badge } from "./ui/badge.tsx";
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

function IconoArchivo({ nombre }: { nombre: string }) {
  const ext = nombre.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    return <FileText className="size-5 text-rose-600" aria-hidden="true" />;
  }
  if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp") {
    return <FileImage className="size-5 text-sky-600" aria-hidden="true" />;
  }
  return <File className="size-5 text-muted-foreground" aria-hidden="true" />;
}

const claseSelect =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-2xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-auto sm:min-w-44";

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
    <div className="mt-4 border-t border-border/60 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-4 text-primary" aria-hidden="true" />
          <h4 className="text-sm font-semibold tracking-tight text-foreground">
            Documentos adjuntos
          </h4>
          <Badge variant="secondary" className="px-2 py-0 text-xs">
            {documentos.length}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          PDF, JPG o PNG · Máx. 10 MB
        </span>
      </div>

      {/* Formulario para adjuntar */}
      <form onSubmit={handleSubir} className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={handleSeleccion}
            className="block h-10 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground file:mr-2.5 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <select
          value={tipoDocumento}
          onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
          aria-label="Tipo de documento"
          className={claseSelect}
        >
          {TIPOS_DOCUMENTO.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.label}
            </option>
          ))}
        </select>

        <Button type="submit" size="sm" disabled={subiendo || !archivo} className="h-10 shrink-0">
          <Upload className="size-3.5" aria-hidden="true" />
          {subiendo ? "Subiendo…" : "Adjuntar"}
        </Button>
      </form>

      {error ? <MensajeError className="mt-3">{error}</MensajeError> : null}

      {/* Lista de documentos */}
      {cargando ? (
        <Cargando className="py-4 text-xs" mensaje="Cargando documentos…" />
      ) : documentos.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
          No hay documentos adjuntos a esta póliza todavía.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border/60 rounded-lg border border-border/80 bg-card">
          {documentos.map((documento) => (
            <li
              key={documento.id}
              className="flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <IconoArchivo nombre={documento.nombreArchivo} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-tight break-all text-foreground">
                    {documento.nombreArchivo}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[11px] py-0 px-1.5 font-normal">
                      {etiquetaTipoDocumento(documento.tipoDocumento)}
                    </Badge>
                    <span>Subido: {formatearFecha(documento.fechaSubida)}</span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  className="h-8 text-xs"
                  render={<a href={documento.urlStorage} target="_blank" rel="noreferrer" />}
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  Ver
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => void handleEliminar(documento)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
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

