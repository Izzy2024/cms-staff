import { useState } from "react";
import type { ChangeEvent } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button.tsx";
import { MensajeError } from "./MensajeError.tsx";
import { extraerPolizaDesdeArchivo } from "../lib/extraccionPoliza.ts";
import type { ResultadoExtraccion } from "../lib/extraccionPoliza.ts";

export function SubirPolizaIA({
  onExtraido,
}: {
  onExtraido: (resultado: ResultadoExtraccion, archivoOriginal: File) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [extraido, setExtraido] = useState(false);

  function handleSeleccion(event: ChangeEvent<HTMLInputElement>): void {
    setArchivo(event.target.files?.[0] ?? null);
    setError("");
    setAvisos([]);
    setExtraido(false);
  }

  async function handleAnalizar(): Promise<void> {
    if (!archivo) {
      setError("Seleccione primero un archivo PDF para poder analizarlo.");
      return;
    }
    setError("");
    setAvisos([]);
    setExtraido(false);
    setAnalizando(true);
    try {
      const resultado = await extraerPolizaDesdeArchivo(archivo);
      onExtraido(resultado, archivo);
      setAvisos(resultado.avisos);
      setExtraido(true);
    } catch {
      setError(
        "No pudimos analizar el PDF automáticamente. Puede completar los datos a mano y guardar la póliza con normalidad.",
      );
    } finally {
      setAnalizando(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex items-start gap-2.5 border-b border-border/60 pb-3.5">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Subir póliza en PDF y analizar con IA
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adjunte el PDF de la póliza y presione «Analizar con IA» para prellenar los datos. Siempre
            podrá revisarlos y corregirlos antes de guardar.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleSeleccion}
          disabled={analizando}
          aria-label="Archivo PDF de la póliza"
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-2xs transition-colors file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
        />
        <Button
          type="button"
          onClick={() => void handleAnalizar()}
          disabled={analizando}
          className="w-full sm:w-auto"
        >
          {analizando ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {analizando ? "Analizando…" : extraido ? "Analizar de nuevo" : "Analizar con IA"}
        </Button>
      </div>

      {analizando ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Analizando el PDF. Esto puede tardar unos segundos…
        </p>
      ) : null}

      {error ? <MensajeError className="mt-4">{error}</MensajeError> : null}

      {extraido ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
          <p className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            Datos extraídos. Revise el formulario y corrija lo que haga falta antes de guardar.
          </p>
          {avisos.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-emerald-900">
              {avisos.map((aviso, indice) => (
                <li key={indice}>{aviso}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        Si el análisis falla, puede completar los datos manualmente sin problema.
      </p>
    </div>
  );
}
