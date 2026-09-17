import { useState } from "react";
import type { FormEvent } from "react";
import { DollarSign, FileText, Save, X } from "lucide-react";
import { TIPOS_SEGURO } from "../lib/types.ts";
import type { Poliza, TipoSeguro } from "../lib/types.ts";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { MensajeError } from "./MensajeError.tsx";

export type PolizaFormValues = Omit<Poliza, "id" | "clienteId">;

const vacio: PolizaFormValues = {
  aseguradora: "",
  tipoSeguro: "Auto",
  detalleBien: "",
  numeroPoliza: "",
  vigenciaInicio: "",
  vigenciaFin: "",
  prima: 0,
  observaciones: "",
};

const claseSelect =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-2xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

const claseTextarea =
  "min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-2xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export function PolizaForm({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: PolizaFormValues;
  onGuardar: (valores: PolizaFormValues) => Promise<void>;
  onCancelar: () => void;
}) {
  const [valores, setValores] = useState<PolizaFormValues>(inicial ?? vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await onGuardar(valores);
    } catch {
      setError("No se pudo guardar la póliza. Revise los datos e intente de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-primary" aria-hidden="true" />
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {inicial ? "Editar póliza" : "Nueva póliza"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Cerrar formulario"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          <span>
            Aseguradora <span className="text-destructive">*</span>
          </span>
          <Input
            required
            value={valores.aseguradora}
            onChange={(e) => setValores({ ...valores, aseguradora: e.target.value })}
            placeholder="Ej. Mercantil Seguros, Mapfre…"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          <span>
            Tipo de seguro <span className="text-destructive">*</span>
          </span>
          <select
            value={valores.tipoSeguro}
            onChange={(e) => setValores({ ...valores, tipoSeguro: e.target.value as TipoSeguro })}
            className={claseSelect}
          >
            {TIPOS_SEGURO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          <span>
            Número de póliza <span className="text-destructive">*</span>
          </span>
          <Input
            required
            value={valores.numeroPoliza}
            onChange={(e) => setValores({ ...valores, numeroPoliza: e.target.value })}
            placeholder="Ej. POL-2024-00123"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          <span>
            Prima anual ($) <span className="text-destructive">*</span>
          </span>
          <div className="relative">
            <DollarSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              required
              className="pl-8"
              value={valores.prima}
              onChange={(e) => setValores({ ...valores, prima: Number(e.target.value) })}
              placeholder="0.00"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
          <span>Detalle del bien asegurado</span>
          <Input
            value={valores.detalleBien}
            onChange={(e) => setValores({ ...valores, detalleBien: e.target.value })}
            placeholder="Ej. Toyota Corolla 2021 Blanco, Placa AB123CD"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          <span>
            Vigencia desde <span className="text-destructive">*</span>
          </span>
          <Input
            type="date"
            required
            value={valores.vigenciaInicio}
            onChange={(e) => setValores({ ...valores, vigenciaInicio: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          <span>
            Vigencia hasta <span className="text-destructive">*</span>
          </span>
          <Input
            type="date"
            required
            value={valores.vigenciaFin}
            onChange={(e) => setValores({ ...valores, vigenciaFin: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
          <span>Observaciones o notas adicionales</span>
          <textarea
            value={valores.observaciones}
            onChange={(e) => setValores({ ...valores, observaciones: e.target.value })}
            rows={3}
            className={claseTextarea}
            placeholder="Comentarios sobre coberturas, deducible o estatus especial…"
          />
        </label>
      </div>

      {error ? <MensajeError className="mt-4">{error}</MensajeError> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
        <Button type="submit" disabled={guardando}>
          <Save className="size-4" aria-hidden="true" />
          {guardando ? "Guardando…" : "Guardar póliza"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

