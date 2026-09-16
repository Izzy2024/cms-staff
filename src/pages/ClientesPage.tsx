import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { listClientesConPolizas } from "../lib/clientesRepo.ts";
import type { ClienteConPolizas } from "../lib/clientesRepo.ts";
import { RenovacionBadge } from "../components/RenovacionBadge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";

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
      .catch(() => setError("No se pudo cargar la lista de clientes. Revise su conexión e intente de nuevo."))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(() => items.filter((i) => coincide(i, busqueda)), [items, busqueda]);

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
        <Button nativeButton={false} render={<Link to="/clientes/nuevo" />}>
          <Plus aria-hidden="true" />
          Agregar cliente
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <label htmlFor="buscador-clientes" className="text-base font-medium text-foreground">
          Buscar cliente
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="buscador-clientes"
            type="search"
            className="pl-10"
            placeholder="Nombre, cédula, aseguradora o número de póliza"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {loading ? <Cargando mensaje="Cargando clientes…" /> : null}

      {error ? <MensajeError className="mt-6">{error}</MensajeError> : null}

      {!loading && !error && filtrados.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            {items.length === 0 ? "Todavía no hay clientes" : "Sin resultados"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
            {items.length === 0
              ? "Agregue su primer cliente con el botón «Agregar cliente»."
              : "No se encontró ningún cliente con esa búsqueda. Pruebe con otro nombre, cédula o número de póliza."}
          </p>
        </div>
      ) : null}

      {!loading && !error && filtrados.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4">
          {filtrados.map(({ cliente, polizas }) => (
            <Link
              key={cliente.id}
              to={`/clientes/${cliente.id}`}
              className="block rounded-xl border border-border bg-card p-4 break-words transition-colors hover:border-primary"
            >
              <h2 className="text-xl font-semibold text-foreground">{cliente.nombre}</h2>
              <p className="mt-1 text-base text-muted-foreground">
                Cédula: {cliente.cedula} · Teléfono: {cliente.telefono}
                {cliente.email ? ` · ${cliente.email}` : ""}
              </p>

              {polizas.length === 0 ? (
                <p className="mt-3 text-base text-muted-foreground">Sin pólizas registradas.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {polizas.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 text-base text-foreground">
                      <span>
                        {p.aseguradora} · {p.tipoSeguro} · Póliza {p.numeroPoliza} (vence {p.vigenciaFin})
                      </span>
                      <RenovacionBadge vigenciaFin={p.vigenciaFin} />
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
