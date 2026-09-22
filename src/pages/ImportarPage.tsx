import { useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { MensajeError } from "../components/MensajeError.tsx";
import { createClientes, createPolizas, listClientesConPolizas } from "../lib/clientesRepo.ts";
import {
  CAMPOS_SISTEMA,
  detectarMapeoColumnas,
  leerArchivoExcel,
  normalizarTexto,
  planificarImportacion,
  procesarFilas,
} from "../lib/importadorExcel.ts";
import type {
  CampoSistema,
  MapeoColumnas,
  ResultadoProcesamiento,
} from "../lib/importadorExcel.ts";

type PasoImportacion = "subir" | "mapear" | "previsualizar" | "resultado";

const PASOS: { id: PasoImportacion; numero: number; titulo: string }[] = [
  { id: "subir", numero: 1, titulo: "Archivo" },
  { id: "mapear", numero: 2, titulo: "Columnas" },
  { id: "previsualizar", numero: 3, titulo: "Revisión" },
  { id: "resultado", numero: 4, titulo: "Resumen" },
];

const claseSelect =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-2xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export function ImportarPage() {
  const navigate = useNavigate();
  const fileInputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState<PasoImportacion>("subir");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [errorLectura, setErrorLectura] = useState("");

  const [headers, setHeaders] = useState<string[]>([]);
  const [filasRaw, setFilasRaw] = useState<unknown[][]>([]);
  const [mapeo, setMapeo] = useState<MapeoColumnas>({
    cliente: null,
    aseguradora: null,
    tipoProductoTexto: null,
    numeroPoliza: null,
    vigenciaTexto: null,
    prima: null,
    observaciones: null,
  });

  const [resultado, setResultado] = useState<ResultadoProcesamiento | null>(null);
  const [importando, setImportando] = useState(false);
  const [errorImportacion, setErrorImportacion] = useState("");
  const [polizasImportadas, setPolizasImportadas] = useState(0);
  const [polizasOmitidas, setPolizasOmitidas] = useState(0);
  const [renovacionesEnlazadas, setRenovacionesEnlazadas] = useState(0);

  async function handleArchivoSeleccionado(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorLectura("");
    setLeyendo(true);
    try {
      const { headers: headersLeidos, filas } = await leerArchivoExcel(file);
      if (headersLeidos.length === 0) {
        setErrorLectura("El archivo parece estar vacío o no tiene encabezados legibles.");
        return;
      }
      if (filas.length === 0) {
        setErrorLectura("El archivo tiene encabezados pero no tiene filas con datos.");
        return;
      }

      setArchivo(file);
      setHeaders(headersLeidos);
      setFilasRaw(filas);
      const mapeoInicial = detectarMapeoColumnas(headersLeidos);
      setMapeo(mapeoInicial);
      setPaso("mapear");
    } catch {
      setErrorLectura(
        "No pudimos leer el archivo. Verifique que sea un archivo de Excel (.xlsx) o CSV (.csv) y que no esté dañado.",
      );
    } finally {
      setLeyendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleCambioMapeo(campo: CampoSistema, columnaIndex: number | null): void {
    setMapeo((prev) => ({
      ...prev,
      [campo]: columnaIndex,
    }));
  }

  function handleContinuarAPrevisualizar(): void {
    if (mapeo.cliente === null) {
      setErrorLectura("Debe asignar una columna al campo «Cliente».");
      return;
    }
    if (mapeo.numeroPoliza === null) {
      setErrorLectura("Debe asignar una columna al campo «Número de póliza».");
      return;
    }
    if (mapeo.vigenciaTexto === null) {
      setErrorLectura("Debe asignar una columna al campo «Vigencia».");
      return;
    }

    setErrorLectura("");
    const res = procesarFilas(filasRaw, mapeo);
    setResultado(res);
    setPaso("previsualizar");
  }

  async function handleConfirmarImportacion(): Promise<void> {
    if (!resultado || resultado.filasValidas.length === 0) return;

    setImportando(true);
    setErrorImportacion("");

    try {
      // ponytail: importación idempotente; si falla a mitad y se reintenta, lo ya creado se reutiliza u omite en vez de duplicarse.
      const existentes = await listClientesConPolizas();
      const plan = planificarImportacion(resultado.clientesAgrupados, existentes);

      const creados = await createClientes(
        plan.clientesNuevos.map((nombre) => ({ nombre, cedula: "", telefono: "" })),
      );

      const idPorClave = new Map<string, string>();
      for (const { cliente } of existentes) {
        const clave = normalizarTexto(cliente.nombre);
        if (!idPorClave.has(clave)) idPorClave.set(clave, cliente.id);
      }
      for (const { id, nombre } of creados) {
        idPorClave.set(normalizarTexto(nombre), id);
      }

      await createPolizas(
        plan.polizasPorCrear.map(({ claveCliente, clienteIdExistente, poliza, polizaAnteriorId }) => ({
          clienteId: clienteIdExistente ?? idPorClave.get(claveCliente) ?? "",
          datos: {
            aseguradora: poliza.aseguradora,
            tipoSeguro: "Otro" as const,
            detalleBien: poliza.tipoProductoTexto,
            numeroPoliza: poliza.numeroPoliza,
            vigenciaInicio: poliza.vigenciaInicio,
            vigenciaFin: poliza.vigenciaFin,
            prima: poliza.prima,
            observaciones: poliza.observaciones,
            beneficios: "",
          },
          polizaAnteriorId: polizaAnteriorId ?? undefined,
        })),
      );

      setPolizasImportadas(plan.polizasPorCrear.length);
      setPolizasOmitidas(plan.omitidas.length);
      setRenovacionesEnlazadas(plan.renovacionesEnlazadas);
      setPaso("resultado");
    } catch {
      setErrorImportacion(
        "No se pudieron guardar los datos. Revise su conexión a internet e intente de nuevo.",
      );
    } finally {
      setImportando(false);
    }
  }

  function handleReiniciar(): void {
    setPaso("subir");
    setArchivo(null);
    setHeaders([]);
    setFilasRaw([]);
    setResultado(null);
    setErrorLectura("");
    setErrorImportacion("");
    setPolizasImportadas(0);
    setPolizasOmitidas(0);
    setRenovacionesEnlazadas(0);
  }

  const indexPasoActual = PASOS.findIndex((p) => p.id === paso);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Importar desde Excel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargue de una sola vez su cartera de clientes y pólizas a partir de una planilla .xlsx o .csv.
        </p>
      </div>

      {/* Stepper visual moderno */}
      <nav aria-label="Progreso de la importación" className="border-y border-border/60 py-4">
        <ol className="grid grid-cols-4 gap-2 sm:gap-4">
          {PASOS.map((item, idx) => {
            const completado = idx < indexPasoActual;
            const actual = idx === indexPasoActual;

            return (
              <li key={item.id} className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors sm:size-8 ${
                    actual
                      ? "bg-foreground text-background"
                      : completado
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {completado ? (
                    <Check className="size-3.5 sm:size-4" aria-hidden="true" />
                  ) : (
                    item.numero
                  )}
                </div>
                <div className="min-w-0">
                  <span
                    className={`block truncate text-xs font-medium sm:text-sm ${
                      actual
                        ? "font-semibold text-foreground"
                        : completado
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {item.titulo}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Paso 1: Subir Archivo */}
      {paso === "subir" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-foreground/40 sm:p-12">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-8" aria-hidden="true" />
            </div>

            <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Seleccione su archivo de pólizas
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Archivos compatibles: <strong className="text-foreground">.xlsx</strong> o{" "}
              <strong className="text-foreground">.csv</strong>. Cada fila representa una póliza; un mismo
              cliente puede figurar en múltiples registros.
            </p>

            <input
              id={fileInputId}
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => void handleArchivoSeleccionado(e)}
              className="hidden"
            />

            <div className="mt-6 flex justify-center">
              <Button
                size="lg"
                disabled={leyendo}
                onClick={() => inputRef.current?.click()}
                className="w-full sm:w-auto"
              >
                <Upload className="size-4" aria-hidden="true" />
                {leyendo ? "Leyendo archivo…" : "Seleccionar archivo"}
              </Button>
            </div>

            {errorLectura ? <MensajeError className="mt-6 text-left">{errorLectura}</MensajeError> : null}
          </div>

          {/* Tarjeta de referencia de columnas */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <HelpCircle className="size-4 text-primary" aria-hidden="true" />
              Columnas habituales reconocidas automáticamente
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
              CLIENTE · COMPAÑÍA DE SEGUROS · TIPO DE PRODUCTO · NÚMERO DE PÓLIZA · VIGENCIA (ej.
              16/09/2024 al 16/09/2025) · PRIMA · OBSERVACIONES
            </p>
          </div>
        </div>
      ) : null}

      {/* Paso 2: Mapear Columnas */}
      {paso === "mapear" ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Archivo cargado: <span className="text-primary font-mono">{archivo?.name}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Detectamos <strong>{headers.length}</strong> columnas y <strong>{filasRaw.length}</strong>{" "}
                filas con información.
              </p>
            </div>
            <Badge variant="secondary" className="self-start text-xs font-mono sm:self-auto">
              {filasRaw.length} filas
            </Badge>
          </div>

          {errorLectura ? <MensajeError>{errorLectura}</MensajeError> : null}

          <div className="space-y-3">
            {CAMPOS_SISTEMA.map((campo) => {
              const valorActual = mapeo[campo.clave];
              const ejemploDato =
                valorActual !== null && filasRaw[0] ? String(filasRaw[0][valorActual] ?? "") : "";

              return (
                <div
                  key={campo.clave}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {campo.etiqueta}{" "}
                      {campo.requerido ? (
                        <span className="text-destructive font-bold" title="Campo obligatorio">
                          *
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{campo.descripcion}</p>
                  </div>

                  <div className="flex w-full flex-col gap-1.5 sm:w-80 sm:shrink-0">
                    <select
                      aria-label={`Columna para ${campo.etiqueta}`}
                      value={valorActual === null ? -1 : valorActual}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleCambioMapeo(campo.clave, val === -1 ? null : val);
                      }}
                      className={claseSelect}
                    >
                      <option value={-1}>-- Sin asignar --</option>
                      {headers.map((h, idx) => (
                        <option key={idx} value={idx}>
                          Columna {idx + 1}: {h || `(sin título ${idx + 1})`}
                        </option>
                      ))}
                    </select>

                    {ejemploDato ? (
                      <span className="truncate text-xs text-muted-foreground">
                        Ejemplo fila 1: &ldquo;{ejemploDato}&rdquo;
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-4 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={handleReiniciar}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Cambiar de archivo
            </Button>
            <Button onClick={handleContinuarAPrevisualizar}>
              Continuar a revisión
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Paso 3: Previsualización y Revisión */}
      {paso === "previsualizar" && resultado ? (
        <div className="space-y-6">
          {/* Métricas KPI visuales */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-4 dark:bg-emerald-950/20">
              <span className="text-xs font-semibold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
                Pólizas listas
              </span>
              <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {resultado.filasValidas.length}
              </p>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 p-4 dark:bg-blue-950/20">
              <span className="text-xs font-semibold tracking-wider text-blue-800 uppercase dark:text-blue-300">
                Clientes a crear
              </span>
              <p className="mt-1 text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {resultado.clientesAgrupados.length}
              </p>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                resultado.errores.length > 0
                  ? "border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20"
                  : "border-border bg-card"
              }`}
            >
              <span
                className={`text-xs font-semibold tracking-wider uppercase ${
                  resultado.errores.length > 0
                    ? "text-rose-800 dark:text-rose-300"
                    : "text-muted-foreground"
                }`}
              >
                Filas con error
              </span>
              <p
                className={`mt-1 text-3xl font-bold tracking-tight ${
                  resultado.errores.length > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-foreground"
                }`}
              >
                {resultado.errores.length}
              </p>
            </div>
          </div>

          {errorImportacion ? <MensajeError>{errorImportacion}</MensajeError> : null}

          {/* Desglose de Errores */}
          {resultado.errores.length > 0 ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-50/40 p-4 dark:bg-rose-950/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-5 shrink-0 text-rose-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                  Filas que se omitirán ({resultado.errores.length})
                </h3>
              </div>
              <p className="mt-1 text-xs text-rose-800 dark:text-rose-300">
                Estas filas tienen datos incompletos o fechas irreconocibles. Se descartarán sin
                interrumpir la importación del resto:
              </p>

              <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto">
                {resultado.errores.map((err, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 rounded-lg border border-rose-200/80 bg-background p-2.5 text-xs sm:flex-row sm:justify-between sm:gap-3"
                  >
                    <span className="text-foreground">
                      <strong>Fila {err.filaNumero}:</strong>{" "}
                      <span className="text-rose-700">{err.motivo}</span>
                    </span>
                    {err.datosFila ? (
                      <span className="truncate text-muted-foreground">
                        Cliente: &ldquo;{err.datosFila.cliente}&rdquo; · Póliza: &ldquo;
                        {err.datosFila.numeroPoliza}&rdquo;
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Lista previa de Clientes y Pólizas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Vista previa de clientes agrupados ({resultado.clientesAgrupados.length})
              </h3>
              <Badge variant="outline" className="text-xs">
                {resultado.filasValidas.length} pólizas
              </Badge>
            </div>

            {resultado.clientesAgrupados.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No se encontraron filas con datos válidos para procesar.
              </div>
            ) : (
              <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
                {resultado.clientesAgrupados.map((grupo, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-card p-4 shadow-2xs transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-primary" aria-hidden="true" />
                        <h4 className="text-sm font-semibold tracking-tight text-foreground">
                          {grupo.nombre}
                        </h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {grupo.polizas.length} {grupo.polizas.length === 1 ? "póliza" : "pólizas"}
                      </Badge>
                    </div>

                    <ul className="mt-2.5 space-y-1.5 text-xs text-foreground sm:text-sm">
                      {grupo.polizas.map((p, pIdx) => (
                        <li
                          key={pIdx}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
                        >
                          <span className="font-medium">
                            {p.aseguradora || "Sin aseguradora"} · {p.tipoProductoTexto || "Póliza"} ·{" "}
                            <span className="font-mono text-muted-foreground">{p.numeroPoliza}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Vence: {p.vigenciaFin}
                            {p.prima > 0 ? ` · $${p.prima}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-4 sm:flex-row sm:justify-between">
            <Button variant="outline" disabled={importando} onClick={() => setPaso("mapear")}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Modificar columnas
            </Button>
            <Button
              disabled={resultado.filasValidas.length === 0 || importando}
              onClick={() => void handleConfirmarImportacion()}
              className="w-full sm:w-auto"
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              {importando
                ? "Guardando en el sistema…"
                : `Confirmar e importar ${resultado.filasValidas.length} pólizas`}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Paso 4: Resultado y Resumen */}
      {paso === "resultado" && resultado ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-6 text-center dark:bg-emerald-950/20 sm:p-10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-9" aria-hidden="true" />
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
            ¡Importación exitosa!
          </h2>
          <p className="mt-1 text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {polizasImportadas} pólizas registradas · {resultado.clientesAgrupados.length} clientes
            creados
          </p>

          {polizasOmitidas > 0 ? (
            <p className="mt-1 text-lg font-semibold text-muted-foreground">
              {polizasOmitidas === 1
                ? "1 póliza omitida porque ya existía"
                : `${polizasOmitidas} pólizas omitidas porque ya existían`}
            </p>
          ) : null}

          {renovacionesEnlazadas > 0 ? (
            <p className="mt-1 text-lg font-semibold text-muted-foreground">
              {renovacionesEnlazadas === 1
                ? "1 renovación enlazada a su póliza anterior"
                : `${renovacionesEnlazadas} renovaciones enlazadas a su póliza anterior`}
            </p>
          ) : null}

          <p className="mx-auto mt-3 max-w-lg text-sm text-foreground/80">
            Los clientes y sus respectivas pólizas fueron creados correctamente en el sistema. Ya
            están disponibles en el directorio y sincronizados en las alertas de renovación.
          </p>

          {resultado.errores.length > 0 ? (
            <div className="mx-auto mt-6 max-w-xl rounded-xl border border-rose-200 bg-background p-4 text-left">
              <p className="text-xs font-semibold text-rose-800">
                Detalle de filas omitidas ({resultado.errores.length}):
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-700">
                {resultado.errores.map((err, idx) => (
                  <li key={idx}>
                    Fila {err.filaNumero}: {err.motivo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => navigate("/clientes")}>Ver directorio de clientes</Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Ir a renovaciones
            </Button>
            <Button variant="outline" onClick={handleReiniciar}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Importar otro archivo
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

