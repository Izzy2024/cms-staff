import { useState } from "react";
import type { FormEvent } from "react";
import { Save } from "lucide-react";
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

const claseCampo =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
      className="grid gap-5 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <label className="flex flex-col gap-2 text-base font-medium text-foreground">
        Aseguradora
        <Input
          required
          value={valores.aseguradora}
          onChange={(e) => setValores({ ...valores, aseguradora: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-2 text-base font-medium text-foreground">
        Tipo de seguro
        <select
          value={valores.tipoSeguro}
          onChange={(e) => setValores({ ...valores, tipoSeguro: e.target.value as TipoSeguro })}
          className={claseCampo}
        >
          {TIPOS_SEGURO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-base font-medium text-foreground">
        Detalle del bien asegurado
        <Input
          value={valores.detalleBien}
          onChange={(e) => setValores({ ...valores, detalleBien: e.target.value })}
          placeholder="Ej. Toyota Corolla 2020, placa AB1234"
        />
      </label>

      <label className="flex flex-col gap-2 text-base font-medium text-foreground">
        Número de póliza
        <Input
          required
          value={valores.numeroPoliza}
          onChange={(e) => setValores({ ...valores, numeroPoliza: e.target.value })}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-base font-medium text-foreground">
          Vigencia desde
          <Input
            type="date"
            required
            value={valores.vigenciaInicio}
            onChange={(e) => setValores({ ...valores, vigenciaInicio: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-2 text-base font-medium text-foreground">
          Vigencia hasta
          <Input
            type="date"
            required
            value={valores.vigenciaFin}
            onChange={(e) => setValores({ ...valores, vigenciaFin: e.target.value })}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-base font-medium text-foreground">
        Prima
        <Input
          type="number"
          step="0.01"
          min="0"
          required
          value={valores.prima}
          onChange={(e) => setValores({ ...valores, prima: Number(e.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-2 text-base font-medium text-foreground">
        Observaciones
        <textarea
          value={valores.observaciones}
          onChange={(e) => setValores({ ...valores, observaciones: e.target.value })}
          rows={3}
          className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>

      {error ? <MensajeError>{error}</MensajeError> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={guardando}>
          <Save aria-hidden="true" />
          {guardando ? "Guardando…" : "Guardar póliza"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
