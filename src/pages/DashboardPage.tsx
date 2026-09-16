import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { listClientesConPolizas } from "../lib/clientesRepo.ts";
import type { ClienteConPolizas } from "../lib/clientesRepo.ts";
import {
  obtenerRenovacionesProximas,
  textoDiasRestantes,
} from "../lib/renovaciones.ts";
import type { ItemRenovacion } from "../lib/renovaciones.ts";
import { RenovacionBadge } from "../components/RenovacionBadge.tsx";

export function DashboardPage() {
  const [clientesConPolizas, setClientesConPolizas] = useState<ClienteConPolizas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listClientesConPolizas()
      .then(setClientesConPolizas)
      .catch(() => setError("No se pudo cargar la lista de renovaciones."))
      .finally(() => setLoading(false));
  }, []);

  const renovaciones: ItemRenovacion[] = useMemo(() => {
    return obtenerRenovacionesProximas(clientesConPolizas);
  }, [clientesConPolizas]);

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <h1 style={{ margin: 0 }}>Renovaciones próximas</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>
            Pólizas que vencen en los próximos 30 días o menos, ordenadas por fecha más próxima.
          </p>
        </div>
        {!loading && !error && renovaciones.length > 0 ? (
          <span style={{ fontSize: "14px", color: "#6b7280", fontWeight: 500 }}>
            {renovaciones.length} {renovaciones.length === 1 ? "póliza" : "pólizas"}
          </span>
        ) : null}
      </div>

      {loading ? <p style={{ marginTop: "24px" }}>Cargando renovaciones…</p> : null}

      {error ? (
        <p role="alert" style={{ color: "#b00020", marginTop: "24px" }}>
          {error}
        </p>
      ) : null}

      {!loading && !error && renovaciones.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            border: "1px dashed #d1d5db",
            borderRadius: "12px",
            marginTop: "24px",
            background: "#fafafa",
          }}
        >
          <CheckCircle2
            style={{ width: "48px", height: "48px", margin: "0 auto 12px", color: "#16a34a" }}
            aria-hidden="true"
          />
          <h2 style={{ margin: "0 0 8px", fontSize: "18px" }}>No hay renovaciones próximas</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
            Todas las pólizas registradas están al día. Ninguna póliza vence en los próximos 30 días.
          </p>
        </div>
      ) : null}

      {!loading && !error && renovaciones.length > 0 ? (
        <div style={{ display: "grid", gap: "12px", marginTop: "20px" }}>
          {renovaciones.map((item) => (
            <Link
              key={`${item.clienteId}-${item.poliza.id}`}
              to={`/clientes/${item.clienteId}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  border: "1px solid #e5e4e7",
                  borderRadius: "8px",
                  padding: "16px",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                }}
                className="hover:border-primary hover:shadow-xs"
              >
                <div style={{ display: "grid", gap: "6px", flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 600 }}>
                      {item.clienteNombre}
                    </h2>
                    <RenovacionBadge diasRestantes={item.diasRestantes} />
                  </div>

                  <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                    <strong>{item.poliza.aseguradora}</strong> · {item.poliza.tipoSeguro} · Póliza:{" "}
                    <strong>{item.poliza.numeroPoliza}</strong>
                    {item.poliza.detalleBien ? ` · ${item.poliza.detalleBien}` : ""}
                  </p>

                  <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                    Vence: <strong>{item.poliza.vigenciaFin}</strong> (
                    {textoDiasRestantes(item.diasRestantes)})
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#9ca3af",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight aria-hidden="true" style={{ width: "20px", height: "20px" }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
