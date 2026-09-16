import { useState } from "react";
import type { FormEvent } from "react";
import { TIPOS_SEGURO } from "../lib/types.ts";
import type { Poliza, TipoSeguro } from "../lib/types.ts";

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
      setError("No se pudo guardar la póliza.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "grid", gap: "12px", border: "1px solid #e5e4e7", borderRadius: "8px", padding: "16px" }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        Aseguradora
        <input
          required
          value={valores.aseguradora}
          onChange={(e) => setValores({ ...valores, aseguradora: e.target.value })}
          style={{ fontSize: "16px", padding: "8px" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        Tipo de seguro
        <select
          value={valores.tipoSeguro}
          onChange={(e) => setValores({ ...valores, tipoSeguro: e.target.value as TipoSeguro })}
          style={{ fontSize: "16px", padding: "8px" }}
        >
          {TIPOS_SEGURO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        Detalle del bien
        <input
          value={valores.detalleBien}
          onChange={(e) => setValores({ ...valores, detalleBien: e.target.value })}
          placeholder="Ej. Toyota Corolla 2020, placa AB1234"
          style={{ fontSize: "16px", padding: "8px" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        Número de póliza
        <input
          required
          value={valores.numeroPoliza}
          onChange={(e) => setValores({ ...valores, numeroPoliza: e.target.value })}
          style={{ fontSize: "16px", padding: "8px" }}
        />
      </label>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          Vigencia inicio
          <input
            type="date"
            required
            value={valores.vigenciaInicio}
            onChange={(e) => setValores({ ...valores, vigenciaInicio: e.target.value })}
            style={{ fontSize: "16px", padding: "8px" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          Vigencia fin
          <input
            type="date"
            required
            value={valores.vigenciaFin}
            onChange={(e) => setValores({ ...valores, vigenciaFin: e.target.value })}
            style={{ fontSize: "16px", padding: "8px" }}
          />
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        Prima
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={valores.prima}
          onChange={(e) => setValores({ ...valores, prima: Number(e.target.value) })}
          style={{ fontSize: "16px", padding: "8px" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        Observaciones
        <textarea
          value={valores.observaciones}
          onChange={(e) => setValores({ ...valores, observaciones: e.target.value })}
          rows={3}
          style={{ fontSize: "16px", padding: "8px" }}
        />
      </label>
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "12px" }}>
        <button type="submit" disabled={guardando} style={{ fontSize: "16px", padding: "10px 16px" }}>
          {guardando ? "Guardando…" : "Guardar póliza"}
        </button>
        <button type="button" onClick={onCancelar} style={{ fontSize: "16px", padding: "10px 16px" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
