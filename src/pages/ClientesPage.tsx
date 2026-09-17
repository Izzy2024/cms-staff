import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, FileSpreadsheet, IdCard, Mail, Phone, Pin, Plus, Search, Users, X } from "lucide-react";
import { actualizarEstadoManual, listClientesConPolizas } from "../lib/clientesRepo.ts";
import type { ClienteConPolizas } from "../lib/clientesRepo.ts";
import { esClienteActivo, estadoClientePorFechas } from "../lib/renovaciones.ts";
import { cn } from "../lib/utils.ts";
import { RenovacionBadge } from "../components/RenovacionBadge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";
import { EmptyState } from "../components/EmptyState.tsx";

type FiltroEstado = "activos" | "inactivos" | "todos";

const OPCIONES_FILTRO: { value: FiltroEstado; label: string }[] = [
  { value: "activos", label: "Activos" },
  { value: "inactivos", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];

/** Siguiente estado del ciclo manual: auto -> forzado(contrario) -> forzado(opuesto) -> auto. */
function siguienteEstadoManual(activoManual: boolean | null | undefined, activoCalculado: boolean): boolean | null {
  if (activoManual === null || activoManual === undefined) return !activoCalculado;
  if (activoManual === true) return false;
  return null;
}

function obtenerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "CL";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

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
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("activos");
  const [errorEstado, setErrorEstado] = useState("");

  useEffect(() => {
    listClientesConPolizas()
      .then(setItems)
      .catch(() => setError("No se pudo cargar la lista de clientes. Revise su conexión e intente de nuevo."))
      .finally(() => setLoading(false));
  }, []);

  const conteos = useMemo(() => {
    let activos = 0;
    for (const item of items) {
      if (esClienteActivo(item.cliente, item.polizas)) activos += 1;
    }
    return { activos, inactivos: items.length - activos, todos: items.length };
  }, [items]);

  const visibles = useMemo(() => {
    const conEstado = items
      .filter((i) => coincide(i, busqueda))
      .map((item) => ({
        item,
        activo: esClienteActivo(item.cliente, item.polizas),
        diasRelevante: estadoClientePorFechas(item.polizas).diasRelevante,
      }));

    const filtrados =
      estadoFiltro === "todos"
        ? conEstado
        : conEstado.filter((i) => (estadoFiltro === "activos" ? i.activo : !i.activo));

    if (estadoFiltro !== "todos") {
      const descendente = estadoFiltro === "inactivos";
      filtrados.sort((a, b) => {
        if (a.diasRelevante === null && b.diasRelevante === null) return 0;
        if (a.diasRelevante === null) return 1;
        if (b.diasRelevante === null) return -1;
        return descendente ? b.diasRelevante - a.diasRelevante : a.diasRelevante - b.diasRelevante;
      });
    }

    return filtrados;
  }, [items, busqueda, estadoFiltro]);

  async function alternarEstadoManual(item: ClienteConPolizas, activoCalculado: boolean) {
    const clienteId = item.cliente.id;
    const siguiente = siguienteEstadoManual(item.cliente.activoManual, activoCalculado);
    const previos = items;
    setErrorEstado("");
    setItems((prev) =>
      prev.map((i) => (i.cliente.id === clienteId ? { ...i, cliente: { ...i.cliente, activoManual: siguiente } } : i)),
    );
    try {
      await actualizarEstadoManual(clienteId, siguiente);
    } catch {
      setItems(previos);
      setErrorEstado("No se pudo guardar el estado manual del cliente. Revise su conexión e intente de nuevo.");
    }
  }

  return (
    <section className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Clientes</h1>
            {!loading && !error && (
              <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-semibold">
                {items.length} {items.length === 1 ? "cliente" : "clientes"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Directorio general de asegurados, contactos y pólizas activas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" nativeButton={false} render={<Link to="/importar" />}>
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            Importar Excel
          </Button>
          <Button nativeButton={false} render={<Link to="/clientes/nuevo" />}>
            <Plus className="size-4" aria-hidden="true" />
            Agregar cliente
          </Button>
        </div>
      </div>

      {/* Buscador + filtro por estado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1">
          <label htmlFor="buscador-clientes" className="sr-only">
            Buscar clientes o pólizas
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="buscador-clientes"
            type="search"
            className="h-11 pl-10 pr-10 text-sm"
            placeholder="Buscar por nombre, cédula, aseguradora o número de póliza…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda.length > 0 && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filtrar clientes por estado"
          className="inline-flex w-full shrink-0 items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 sm:w-auto"
        >
          {OPCIONES_FILTRO.map((op) => {
            const seleccionada = estadoFiltro === op.value;
            return (
              <button
                key={op.value}
                type="button"
                aria-pressed={seleccionada}
                onClick={() => setEstadoFiltro(op.value)}
                className={cn(
                  "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors sm:flex-none",
                  seleccionada
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {op.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    seleccionada ? "bg-muted text-muted-foreground" : "text-muted-foreground/70",
                  )}
                >
                  {conteos[op.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <Cargando mensaje="Cargando clientes…" /> : null}

      {error ? <MensajeError>{error}</MensajeError> : null}

      {/* Estado vacío cuando no hay clientes registrados */}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          icono={Users}
          titulo="Todavía no hay clientes registrados"
          descripcion="Comience creando su primer asegurado manualmente o cargue su cartera de clientes desde un archivo Excel."
          accion={
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button nativeButton={false} render={<Link to="/clientes/nuevo" />}>
                <Plus className="size-4" aria-hidden="true" />
                Agregar cliente
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link to="/importar" />}>
                <FileSpreadsheet className="size-4" aria-hidden="true" />
                Importar Excel
              </Button>
            </div>
          }
        />
      ) : null}

      {!loading && !error && errorEstado ? <MensajeError>{errorEstado}</MensajeError> : null}

      {/* Estado vacío cuando la búsqueda o el filtro no arrojan resultados */}
      {!loading && !error && items.length > 0 && visibles.length === 0 ? (
        <EmptyState
          icono={Search}
          titulo={
            busqueda.trim()
              ? "Sin resultados de búsqueda"
              : `Sin clientes ${estadoFiltro === "inactivos" ? "inactivos" : "activos"}`
          }
          descripcion={
            busqueda.trim()
              ? `No encontramos ningún cliente ni póliza que coincida con «${busqueda}». Pruebe con otro término o cambie el filtro.`
              : "Ningún cliente coincide con este filtro. Cambie de filtro para ver el resto de su cartera."
          }
          accion={
            busqueda.trim() ? (
              <Button variant="outline" onClick={() => setBusqueda("")}>
                Limpiar búsqueda
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setEstadoFiltro("todos")}>
                Ver todos
              </Button>
            )
          }
        />
      ) : null}

      {/* Lista de clientes */}
      {!loading && !error && visibles.length > 0 ? (
        <div className="grid gap-3.5">
          {visibles.map(({ item: { cliente, polizas }, activo }) => {
            const iniciales = obtenerIniciales(cliente.nombre);
            const esManual = cliente.activoManual !== null && cliente.activoManual !== undefined;
            const tituloEstado = esManual
              ? `Estado manual ${activo ? "activo" : "inactivo"}. Click para cambiar o volver a automático.`
              : "Click para forzar/quitar el estado manual.";
            return (
              <Link
                key={cliente.id}
                to={`/clientes/${cliente.id}`}
                className="group block rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-foreground/30 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Avatar + Datos principales */}
                  <div className="flex items-start gap-3.5">
                    <div
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary"
                    >
                      {iniciales}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary sm:text-lg">
                          {cliente.nombre}
                        </h2>
                        {cliente.cedula && (
                          <Badge variant="outline" className="font-mono text-xs">
                            <IdCard className="mr-1 size-3 text-muted-foreground" aria-hidden="true" />
                            {cliente.cedula}
                          </Badge>
                        )}
                        <button
                          type="button"
                          title={tituloEstado}
                          aria-label={tituloEstado}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void alternarEstadoManual({ cliente, polizas }, activo);
                          }}
                          className={cn(
                            "inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2 text-xs font-medium transition-colors",
                            activo
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-border bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                          )}
                        >
                          {activo ? "Activo" : "Inactivo"}
                          {esManual && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-normal opacity-80">
                              <Pin className="size-3" aria-hidden="true" />
                              manual
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Metadatos de contacto */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                        {cliente.telefono && (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            {cliente.telefono}
                          </span>
                        )}
                        {cliente.email && (
                          <span className="inline-flex items-center gap-1.5 break-all">
                            <Mail className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            {cliente.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contador de pólizas + Flecha */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Badge variant={polizas.length > 0 ? "secondary" : "outline"} className="text-xs">
                      {polizas.length} {polizas.length === 1 ? "póliza" : "pólizas"}
                    </Badge>
                    <ChevronRight
                      className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Vista previa de pólizas */}
                {polizas.length > 0 ? (
                  <div className="mt-3.5 border-t border-border/60 pt-3">
                    <ul className="flex flex-col gap-2">
                      {polizas.slice(0, 3).map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-foreground sm:text-sm"
                        >
                          <span className="font-medium">
                            {p.aseguradora} · <span className="text-muted-foreground">{p.tipoSeguro}</span>
                            {p.numeroPoliza && (
                              <span className="ml-1 font-mono text-muted-foreground">({p.numeroPoliza})</span>
                            )}
                          </span>
                          <RenovacionBadge vigenciaFin={p.vigenciaFin} />
                        </li>
                      ))}
                      {polizas.length > 3 && (
                        <p className="text-right text-xs text-muted-foreground">
                          +{polizas.length - 3} póliza(s) más…
                        </p>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-3.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                    Sin pólizas registradas en el sistema.
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

