import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  Cake,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import { listClientesConPolizas } from "../lib/clientesRepo.ts";
import type { ClienteConPolizas } from "../lib/clientesRepo.ts";
import {
  contarClientesActivos,
  contarPolizasActivas,
  obtenerCumpleanosProximos,
  obtenerRenovacionesProximas,
  textoDiasRestantes,
} from "../lib/renovaciones.ts";
import type { ItemRenovacion } from "../lib/renovaciones.ts";
import { cn } from "../lib/utils.ts";
import { RenovacionBadge } from "../components/RenovacionBadge.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { Button } from "../components/ui/button.tsx";
import { Badge } from "../components/ui/badge.tsx";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function DashboardPage() {
  const [clientesConPolizas, setClientesConPolizas] = useState<ClienteConPolizas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listClientesConPolizas()
      .then(setClientesConPolizas)
      .catch(() =>
        setError("No se pudieron cargar las renovaciones. Revise su conexión e intente de nuevo."),
      )
      .finally(() => setLoading(false));
  }, []);

  const renovaciones: ItemRenovacion[] = useMemo(() => {
    return obtenerRenovacionesProximas(clientesConPolizas);
  }, [clientesConPolizas]);

  const clientesActivos = useMemo(
    () => contarClientesActivos(clientesConPolizas),
    [clientesConPolizas],
  );

  const polizasActivas = useMemo(
    () => contarPolizasActivas(clientesConPolizas),
    [clientesConPolizas],
  );

  const cumpleanosProximos = useMemo(
    () => obtenerCumpleanosProximos(clientesConPolizas),
    [clientesConPolizas],
  );

  const kpis = [
    { etiqueta: "Clientes activos", valor: clientesActivos, icono: Users, alerta: false },
    { etiqueta: "Pólizas activas", valor: polizasActivas, icono: ShieldCheck, alerta: false },
    // Mismo cálculo que alimenta el badge del título (no se duplica la lógica).
    { etiqueta: "Por vencer en 30 días", valor: renovaciones.length, icono: AlertTriangle, alerta: true },
  ];

  return (
    <section className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Renovaciones próximas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Pólizas con vencimiento en los próximos 30 días, ordenadas por urgencia.
          </p>
        </div>

        {!loading && !error && renovaciones.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="warning" className="px-3 py-1 text-sm font-semibold">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {renovaciones.length} {renovaciones.length === 1 ? "póliza por vencer" : "pólizas por vencer"}
            </Badge>
          </div>
        ) : null}
      </div>

      {loading ? <Cargando mensaje="Cargando renovaciones…" /> : null}

      {error ? <MensajeError>{error}</MensajeError> : null}

      {/* Indicadores KPI */}
      {!loading && !error ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpis.map(({ etiqueta, valor, icono: Icono, alerta }) => (
            <div
              key={etiqueta}
              className="flex items-center gap-3.5 rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5"
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  alerta
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-primary/10 text-primary",
                )}
              >
                <Icono className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{etiqueta}</p>
                <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{valor}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Cumpleaños próximos */}
      {!loading && !error ? (
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
          <div className="mb-3.5 flex items-center gap-2.5 border-b border-border/60 pb-3">
            <Cake className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Cumpleaños próximos
            </h2>
            {cumpleanosProximos.length > 0 ? (
              <Badge variant="secondary" className="px-2 py-0 text-xs">
                {cumpleanosProximos.length}
              </Badge>
            ) : null}
          </div>

          {cumpleanosProximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin cumpleaños próximos en los próximos 30 días.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cumpleanosProximos.map((c) => (
                <li
                  key={c.clienteId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      to={`/clientes/${c.clienteId}`}
                      className="truncate text-sm font-medium text-foreground hover:text-primary"
                    >
                      {c.clienteNombre}
                    </Link>
                    {c.clienteTelefono ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                        {c.clienteTelefono}
                      </span>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                    <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
                    {c.dia} de {MESES[c.mes - 1]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!loading && !error && renovaciones.length === 0 ? (
        <EmptyState
          icono={ShieldCheck}
          titulo="Todo al día en la cartera"
          descripcion="No hay pólizas que venzan en los próximos 30 días. Todas las coberturas registradas están vigentes."
          accion={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button nativeButton={false} render={<Link to="/clientes" />}>
                <Users aria-hidden="true" />
                Ver cartera de clientes
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to="/importar" />}
              >
                <FileSpreadsheet aria-hidden="true" />
                Importar pólizas
              </Button>
            </div>
          }
        />
      ) : null}

      {!loading && !error && renovaciones.length > 0 ? (
        <div className="flex flex-col gap-3">
          {renovaciones.map((item) => {
            const esVencida = item.diasRestantes < 0;
            const esUrgente = item.diasRestantes <= 7;

            const acentoBorde = esVencida
              ? "border-l-4 border-l-red-500"
              : esUrgente
              ? "border-l-4 border-l-amber-500"
              : "border-l-4 border-l-blue-400";

            return (
              <Link
                key={`${item.clienteId}-${item.poliza.id}`}
                to={`/clientes/${item.clienteId}`}
                className="group block"
              >
                <div
                  className={`flex flex-col gap-3.5 rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all duration-150 hover:border-foreground/25 hover:shadow-sm active:scale-[0.995] sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${acentoBorde}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-base font-bold text-foreground transition-colors group-hover:text-primary sm:text-lg">
                        {item.clienteNombre}
                      </h2>
                      <RenovacionBadge diasRestantes={item.diasRestantes} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground sm:text-base">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        {item.poliza.aseguradora}
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>{item.poliza.tipoSeguro}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs sm:text-sm text-foreground">
                        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        {item.poliza.numeroPoliza}
                      </span>
                    </div>

                    {item.poliza.detalleBien ? (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {item.poliza.detalleBien}
                      </p>
                    ) : null}

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Calendar className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span>
                        Vence:{" "}
                        <strong className="font-semibold text-foreground">
                          {item.poliza.vigenciaFin}
                        </strong>{" "}
                        ({textoDiasRestantes(item.diasRestantes)})
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-end text-muted-foreground transition-transform duration-150 group-hover:translate-x-1 group-hover:text-foreground sm:pl-2">
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
