import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { listClientesConPolizas } from "../lib/clientesRepo.ts";
import type { ClienteConPolizas } from "../lib/clientesRepo.ts";
import { obtenerRenovacionesProximas, textoDiasRestantes } from "../lib/renovaciones.ts";
import type { ItemRenovacion } from "../lib/renovaciones.ts";
import { RenovacionBadge } from "../components/RenovacionBadge.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";

export function DashboardPage() {
  const [clientesConPolizas, setClientesConPolizas] = useState<ClienteConPolizas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listClientesConPolizas()
      .then(setClientesConPolizas)
      .catch(() => setError("No se pudieron cargar las renovaciones. Revise su conexión e intente de nuevo."))
      .finally(() => setLoading(false));
  }, []);

  const renovaciones: ItemRenovacion[] = useMemo(() => {
    return obtenerRenovacionesProximas(clientesConPolizas);
  }, [clientesConPolizas]);

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Renovaciones próximas</h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Pólizas que vencen en los próximos 30 días, ordenadas por la fecha más próxima.
          </p>
        </div>
        {!loading && !error && renovaciones.length > 0 ? (
          <span className="shrink-0 text-base font-medium text-muted-foreground">
            {renovaciones.length} {renovaciones.length === 1 ? "póliza" : "pólizas"}
          </span>
        ) : null}
      </div>

      {loading ? <Cargando mensaje="Cargando renovaciones…" /> : null}

      {error ? <MensajeError className="mt-6">{error}</MensajeError> : null}

      {!loading && !error && renovaciones.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-12 text-emerald-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-foreground">No hay renovaciones próximas</h2>
          <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
            Todas las pólizas registradas están al día. Ninguna vence en los próximos 30 días.
          </p>
        </div>
      ) : null}

      {!loading && !error && renovaciones.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3">
          {renovaciones.map((item) => (
            <Link key={`${item.clienteId}-${item.poliza.id}`} to={`/clientes/${item.clienteId}`} className="block">
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-2 break-words">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-foreground">{item.clienteNombre}</h2>
                    <RenovacionBadge diasRestantes={item.diasRestantes} />
                  </div>

                  <p className="text-base text-foreground">
                    <strong>{item.poliza.aseguradora}</strong> · {item.poliza.tipoSeguro} · Póliza:{" "}
                    <strong>{item.poliza.numeroPoliza}</strong>
                  </p>

                  {item.poliza.detalleBien ? (
                    <p className="text-base text-muted-foreground">{item.poliza.detalleBien}</p>
                  ) : null}

                  <p className="text-base text-muted-foreground">
                    Vence: <strong className="text-foreground">{item.poliza.vigenciaFin}</strong> (
                    {textoDiasRestantes(item.diasRestantes)})
                  </p>
                </div>

                <ChevronRight className="hidden size-6 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
