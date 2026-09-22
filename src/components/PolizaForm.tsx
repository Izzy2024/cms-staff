import { useState, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { CreditCard, DollarSign, FileText, Save, ShieldCheck, X } from "lucide-react";
import {
  TIPOS_SEGURO,
  FRECUENCIAS_PAGO,
  CONDUCTOS_PAGO,
} from "../lib/types.ts";
import type {
  Poliza,
  TipoSeguro,
  CoberturaAuto,
  FrecuenciaPago,
  ConductoPago,
} from "../lib/types.ts";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { MensajeError } from "./MensajeError.tsx";

export type PolizaFormValues = Omit<Poliza, "id" | "clienteId">;

const vacio: PolizaFormValues = {
  aseguradora: "",
  tipoSeguro: "Auto",
  detalleBien: "",
  numeroPoliza: "",
  corredor: "",
  vigenciaInicio: "",
  vigenciaFin: "",
  prima: 0,
  observaciones: "",
  beneficios: "",
  coberturaAuto: undefined,
  frecuenciaPago: undefined,
  conductoPago: undefined,
  diaPago: "",
  numeroCuotas: 1,
};

const claseSelect =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-2xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

const claseTextarea =
  "min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-2xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export function calcularCuotas(prima: number, cuotas: number): number[] {
  const n = Math.max(1, Math.floor(cuotas || 1));
  const montoTotal = Math.max(0, Number(prima) || 0);
  if (n === 1) return [Math.round(montoTotal * 100) / 100];

  const cuotaBase = Math.round((montoTotal / n) * 100) / 100;
  const sumaAnteriores = cuotaBase * (n - 1);
  const ultimaCuota = Math.round((montoTotal - sumaAnteriores) * 100) / 100;

  const resultado: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    resultado.push(cuotaBase);
  }
  resultado.push(ultimaCuota);
  return resultado;
}

export function formatearCuotasTexto(cuotas: number[]): string {
  if (cuotas.length === 0) return "$0.00";
  const cuotaBase = cuotas[0];
  const todasIguales = cuotas.every((c) => c === cuotaBase);
  if (todasIguales) {
    return `${cuotas.length} ${cuotas.length === 1 ? "cuota" : "cuotas"} de $${cuotaBase.toFixed(2)}`;
  }
  const nAnteriores = cuotas.length - 1;
  const ultima = cuotas[cuotas.length - 1];
  return `${nAnteriores} ${nAnteriores === 1 ? "cuota" : "cuotas"} de $${cuotaBase.toFixed(2)} y 1 cuota de $${ultima.toFixed(2)}`;
}

function inicializarValores(inicial?: PolizaFormValues): PolizaFormValues {
  return {
    ...vacio,
    ...inicial,
  };
}

export function PolizaForm({
  inicial,
  esEdicion,
  onGuardar,
  onCancelar,
}: {
  inicial?: PolizaFormValues;
  esEdicion?: boolean;
  onGuardar: (valores: PolizaFormValues) => Promise<void>;
  onCancelar: () => void;
}) {
  const [valores, setValores] = useState<PolizaFormValues>(() => inicializarValores(inicial));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (inicial) {
      setValores(inicializarValores(inicial));
    }
  }, [inicial]);

  const cuotasCalculadas = useMemo(() => {
    return calcularCuotas(valores.prima, valores.numeroCuotas ?? 1);
  }, [valores.prima, valores.numeroCuotas]);

  const textoCuotas = useMemo(() => {
    return formatearCuotasTexto(cuotasCalculadas);
  }, [cuotasCalculadas]);

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

  const esModoEdicion = esEdicion !== undefined ? esEdicion : Boolean(inicial);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-primary" aria-hidden="true" />
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {esModoEdicion ? "Editar póliza" : "Nueva póliza"}
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
            onChange={(e) => {
              const nuevoTipo = e.target.value as TipoSeguro;
              setValores({
                ...valores,
                tipoSeguro: nuevoTipo,
                coberturaAuto: nuevoTipo === "Auto" ? valores.coberturaAuto : undefined,
              });
            }}
            className={claseSelect}
          >
            {TIPOS_SEGURO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </label>

        {valores.tipoSeguro === "Auto" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Cobertura
            </span>
            <select
              value={valores.coberturaAuto ?? ""}
              onChange={(e) =>
                setValores({
                  ...valores,
                  coberturaAuto: (e.target.value as CoberturaAuto) || undefined,
                })
              }
              className={claseSelect}
            >
              <option value="">Seleccione una opción…</option>
              <option value="Cobertura completa">Auto - Cobertura completa</option>
              <option value="Solo a terceros">Auto - Solo a terceros</option>
            </select>
          </label>
        )}

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
          <span>Corredor / Agente</span>
          <Input
            value={valores.corredor ?? ""}
            onChange={(e) => setValores({ ...valores, corredor: e.target.value })}
            placeholder="Ej. Veronica Del Carmen Staff Guerra PN6961"
          />
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

        {/* Sección de Pago */}
        <div className="sm:col-span-2 mt-2 rounded-lg border border-border/70 bg-muted/20 p-4">
          <div className="mb-3.5 flex items-center gap-2 border-b border-border/60 pb-2.5">
            <CreditCard className="size-4 text-primary" aria-hidden="true" />
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Información de pago
            </h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              <span>Frecuencia de pago</span>
              <select
                value={valores.frecuenciaPago ?? ""}
                onChange={(e) =>
                  setValores({
                    ...valores,
                    frecuenciaPago: (e.target.value as FrecuenciaPago) || undefined,
                  })
                }
                className={claseSelect}
              >
                <option value="">Seleccione una opción…</option>
                {FRECUENCIAS_PAGO.map((frec) => (
                  <option key={frec} value={frec}>
                    {frec}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              <span>Conducto de pago</span>
              <select
                value={valores.conductoPago ?? ""}
                onChange={(e) =>
                  setValores({
                    ...valores,
                    conductoPago: (e.target.value as ConductoPago) || undefined,
                  })
                }
                className={claseSelect}
              >
                <option value="">Seleccione una opción…</option>
                {CONDUCTOS_PAGO.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              <span>Día de pago</span>
              <Input
                value={valores.diaPago ?? ""}
                onChange={(e) => setValores({ ...valores, diaPago: e.target.value })}
                placeholder="Ej. 21 del mes correspondiente"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              <span>Número de cuotas</span>
              <Input
                type="number"
                min="1"
                step="1"
                value={valores.numeroCuotas ?? 1}
                onChange={(e) =>
                  setValores({
                    ...valores,
                    numeroCuotas: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                placeholder="1"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
              <span>Monto por cuota</span>
              <div className="relative">
                <Input
                  readOnly
                  tabIndex={-1}
                  value={textoCuotas}
                  className="bg-muted/60 font-semibold text-foreground cursor-default focus-visible:ring-0"
                  aria-label="Monto de cuotas calculado"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Monto calculado en modo solo lectura a partir de la prima anual (${(valores.prima || 0).toFixed(2)}) y {valores.numeroCuotas ?? 1} cuota{(valores.numeroCuotas ?? 1) === 1 ? "" : "s"}.
              </p>
            </label>
          </div>
        </div>

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

        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
          <span>Beneficios / coberturas</span>
          <textarea
            value={valores.beneficios}
            onChange={(e) => setValores({ ...valores, beneficios: e.target.value })}
            rows={3}
            className={claseTextarea}
            placeholder="Ej. Cobertura amplia, pérdida total, responsabilidad civil…"
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
