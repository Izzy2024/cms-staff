import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listClientesConPolizas } from "../lib/clientesRepo.ts";
import type { ClienteConPolizas } from "../lib/clientesRepo.ts";
import { RenovacionBadge } from "../components/RenovacionBadge.tsx";

function coincide(item: ClienteConPolizas, termino: string): boolean {
  const t = termino.trim().toLowerCase();
  if (!t) return true;
  if (item.cliente.nombre.toLowerCase().includes(t)) return true;
  if (item.cliente.cedula.toLowerCase().includes(t)) return true;
  return item.polizas.some(
    (p) => p.aseguradora.toLowerCase().includes(t) || p.numeroPoliza.toLowerCase().includes(t),
  );
}

export function ClientesPage() {
  const [items, setItems] = useState<ClienteConPolizas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    listClientesConPolizas()
      .then(setItems)
      .catch(() => setError("No se pudo cargar la lista de clientes."))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(() => items.filter((i) => coincide(i, busqueda)), [items, busqueda]);

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <h1>Clientes</h1>
        <Link to="/clientes/nuevo">
          <button type="button" style={{ fontSize: "16px", padding: "10px 16px" }}>
            + Agregar cliente
          </button>
        </Link>
      </div>

      <input
        type="search"
        placeholder="Buscar por nombre, cédula, aseguradora o número de póliza"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ fontSize: "16px", padding: "10px", width: "100%", marginTop: "16px", boxSizing: "border-box" }}
      />

      {loading ? <p style={{ marginTop: "16px" }}>Cargando…</p> : null}
      {error ? (
        <p role="alert" style={{ color: "#b00020", marginTop: "16px" }}>
          {error}
        </p>
      ) : null}
      {!loading && !error && filtrados.length === 0 ? (
        <p style={{ marginTop: "16px" }}>No se encontraron clientes.</p>
      ) : null}

      <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
        {filtrados.map(({ cliente, polizas }) => (
          <Link
            key={cliente.id}
            to={`/clientes/${cliente.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{ border: "1px solid #e5e4e7", borderRadius: "8px", padding: "16px" }}>
              <h2 style={{ margin: 0 }}>{cliente.nombre}</h2>
              <p style={{ margin: "4px 0", color: "#555" }}>
                Cédula: {cliente.cedula} · Tel: {cliente.telefono}
                {cliente.email ? ` · ${cliente.email}` : ""}
              </p>
              {polizas.length === 0 ? (
                <p style={{ margin: "8px 0 0", color: "#777" }}>Sin pólizas registradas.</p>
              ) : (
                <ul style={{ margin: "8px 0 0", paddingLeft: "20px" }}>
                  {polizas.map((p) => (
                    <li key={p.id} style={{ margin: "4px 0" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span>
                          {p.aseguradora} · {p.tipoSeguro} · Póliza {p.numeroPoliza} (vence {p.vigenciaFin})
                        </span>
                        <RenovacionBadge vigenciaFin={p.vigenciaFin} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
