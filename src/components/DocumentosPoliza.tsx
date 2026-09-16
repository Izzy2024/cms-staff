import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { format } from "date-fns";
import { Button } from "./ui/button.tsx";
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
      .catch(() => setError("No se pudieron cargar los documentos."))
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
      setError("Selecciona un archivo para subir.");
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
      setError(err instanceof Error ? err.message : "No se pudo subir el documento.");
    } finally {
      setSubiendo(false);
    }
  }

  async function handleEliminar(documento: DocumentoPoliza): Promise<void> {
    if (!window.confirm(`¿Eliminar "${documento.nombreArchivo}"?`)) return;
    setError("");
    try {
      await eliminarDocumento(clienteId, polizaId, documento);
      setDocumentos(await listDocumentos(clienteId, polizaId));
    } catch {
      setError("No se pudo eliminar el documento.");
    }
  }

  return (
    <div
      style={{
        marginTop: "12px",
        borderTop: "1px solid #e5e4e7",
        paddingTop: "12px",
        display: "grid",
        gap: "12px",
      }}
    >
      <p style={{ margin: 0, fontWeight: "bold" }}>Documentos</p>

      <form onSubmit={handleSubir} style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={handleSeleccion}
          style={{ fontSize: "16px" }}
        />
        <select
          value={tipoDocumento}
          onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
          style={{ fontSize: "16px", padding: "8px" }}
        >
          {TIPOS_DOCUMENTO.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={subiendo}>
          {subiendo ? "Subiendo…" : "Subir documento"}
        </Button>
      </form>

      <p style={{ margin: 0, color: "#777", fontSize: "14px" }}>
        Formatos permitidos: PDF, JPG o PNG. Tamaño máximo: 10 MB.
      </p>

      {error ? (
        <p role="alert" style={{ margin: 0, color: "#b00020" }}>
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p style={{ margin: 0 }}>Cargando documentos…</p>
      ) : documentos.length === 0 ? (
        <p style={{ margin: 0, color: "#777" }}>Sin documentos adjuntos.</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "8px" }}>
          {documentos.map((documento) => (
            <li
              key={documento.id}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                border: "1px solid #e5e4e7",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>{documento.nombreArchivo}</p>
                <p style={{ margin: "2px 0 0", color: "#555", fontSize: "14px" }}>
                  {etiquetaTipoDocumento(documento.tipoDocumento)} · {formatearFecha(documento.fechaSubida)}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={documento.urlStorage} target="_blank" rel="noreferrer" />}
                >
                  Ver
                </Button>
                <Button variant="destructive" onClick={() => void handleEliminar(documento)}>
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
