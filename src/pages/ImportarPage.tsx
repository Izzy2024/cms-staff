import { useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { MensajeError } from "../components/MensajeError.tsx";
import { createCliente, createPoliza } from "../lib/clientesRepo.ts";
import {
  CAMPOS_SISTEMA,
  detectarMapeoColumnas,
  leerArchivoExcel,
  procesarFilas,
} from "../lib/importadorExcel.ts";
import type {
  CampoSistema,
  MapeoColumnas,
  ResultadoProcesamiento,
} from "../lib/importadorExcel.ts";

type PasoImportacion = "subir" | "mapear" | "previsualizar" | "resultado";

const claseCampo =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
    let importadas = 0;

    try {
      for (const grupo of resultado.clientesAgrupados) {
        // 1. Crear el cliente con datos base (cédula y teléfono vacíos si no vienen en el Excel)
        const clienteId = await createCliente({
          nombre: grupo.nombre,
          cedula: "",
          telefono: "",
        });

        // 2. Crear cada póliza del cliente
        for (const p of grupo.polizas) {
          await createPoliza(clienteId, {
            aseguradora: p.aseguradora,
            tipoSeguro: "Otro",
            detalleBien: p.tipoProductoTexto,
            numeroPoliza: p.numeroPoliza,
            vigenciaInicio: p.vigenciaInicio,
            vigenciaFin: p.vigenciaFin,
            prima: p.prima,
            observaciones: p.observaciones,
          });
          importadas++;
        }
      }

      setPolizasImportadas(importadas);
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
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Importar desde Excel</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Cargue de una sola vez su cartera de clientes y pólizas a partir de un archivo .xlsx o .csv.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <Badge variant={paso === "subir" ? "default" : "secondary"}>1. Archivo</Badge>
        <span className="text-base text-muted-foreground">→</span>
        <Badge variant={paso === "mapear" ? "default" : "secondary"}>2. Columnas</Badge>
        <span className="text-base text-muted-foreground">→</span>
        <Badge variant={paso === "previsualizar" ? "default" : "secondary"}>
          3. Revisión
        </Badge>
        <span className="text-base text-muted-foreground">→</span>
        <Badge variant={paso === "resultado" ? "default" : "secondary"}>4. Resumen</Badge>
      </div>

      {paso === "subir" ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-10 text-center sm:px-6 sm:py-12">
          <FileSpreadsheet className="mx-auto mb-4 size-14 text-primary" aria-hidden="true" />
          <h2 className="text-2xl font-semibold text-foreground">Seleccione su archivo de pólizas</h2>
          <p className="mx-auto mt-2 mb-6 max-w-lg text-base text-muted-foreground">
            Formatos aceptados: <strong>.xlsx</strong> y <strong>.csv</strong>. Cada fila debe ser una
            póliza; un mismo cliente puede aparecer en varias filas.
          </p>

          <input
            id={fileInputId}
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => void handleArchivoSeleccionado(e)}
            className="hidden"
          />

          <Button
            size="lg"
            disabled={leyendo}
            onClick={() => inputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Upload aria-hidden="true" />
            {leyendo ? "Leyendo el archivo…" : "Seleccionar archivo"}
          </Button>

          {errorLectura ? <MensajeError className="mt-6 text-left">{errorLectura}</MensajeError> : null}

          <div className="mt-8 rounded-lg bg-muted px-4 py-4 text-left">
            <p className="text-base font-semibold text-foreground">Columnas que suele tener el archivo</p>
            <p className="mt-1 text-base break-words text-foreground">
              CLIENTE · COMPAÑÍA DE SEGUROS · TIPO DE PRODUCTO · NÚMERO DE PÓLIZA · VIGENCIA (por ejemplo
              16/9/2026 al 16/09/2027) · PRIMA · OBSERVACIONES
            </p>
          </div>
        </div>
      ) : null}

      {paso === "mapear" ? (
        <div className="mt-6 flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-base font-semibold text-foreground">Archivo: {archivo?.name}</p>
            <p className="mt-1 text-base text-muted-foreground">
              El archivo tiene <strong>{headers.length}</strong> columnas y{" "}
              <strong>{filasRaw.length}</strong> filas. Indique qué columna corresponde a cada dato del
              sistema.
            </p>
          </div>

          {errorLectura ? <MensajeError>{errorLectura}</MensajeError> : null}

          <div className="flex flex-col gap-3">
            {CAMPOS_SISTEMA.map((campo) => {
              const valorActual = mapeo[campo.clave];
              const ejemploDato =
                valorActual !== null && filasRaw[0] ? String(filasRaw[0][valorActual] ?? "") : "";

              return (
                <div
                  key={campo.clave}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-foreground">
                      {campo.etiqueta}{" "}
                      {campo.requerido ? (
                        <span className="text-destructive" title="Dato obligatorio">
                          *
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-base text-muted-foreground">{campo.descripcion}</p>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-80 sm:shrink-0">
                    <select
                      aria-label={`Columna para ${campo.etiqueta}`}
                      value={valorActual === null ? -1 : valorActual}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleCambioMapeo(campo.clave, val === -1 ? null : val);
                      }}
                      className={claseCampo}
                    >
                      <option value={-1}>-- Sin asignar --</option>
                      {headers.map((h, idx) => (
                        <option key={idx} value={idx}>
                          Columna {idx + 1}: {h || `(sin título ${idx + 1})`}
                        </option>
                      ))}
                    </select>

                    {ejemploDato ? (
                      <span className="text-base break-words text-muted-foreground">
                        Ejemplo: &ldquo;
                        {ejemploDato.length > 40 ? `${ejemploDato.substring(0, 40)}…` : ejemploDato}&rdquo;
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={handleReiniciar}>
              <ArrowLeft aria-hidden="true" />
              Cambiar de archivo
            </Button>
            <Button onClick={handleContinuarAPrevisualizar}>
              Continuar
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {paso === "previsualizar" && resultado ? (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-base font-semibold text-emerald-800">PÓLIZAS LISTAS</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">{resultado.filasValidas.length}</p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-base font-semibold text-blue-800">CLIENTES A CREAR</p>
              <p className="mt-1 text-3xl font-bold text-blue-700">{resultado.clientesAgrupados.length}</p>
            </div>

            <div
              className={
                resultado.errores.length > 0
                  ? "rounded-xl border border-red-200 bg-red-50 p-4"
                  : "rounded-xl border border-border bg-muted/30 p-4"
              }
            >
              <p
                className={
                  resultado.errores.length > 0
                    ? "text-base font-semibold text-red-800"
                    : "text-base font-semibold text-muted-foreground"
                }
              >
                FILAS CON ERROR
              </p>
              <p
                className={
                  resultado.errores.length > 0
                    ? "mt-1 text-3xl font-bold text-red-700"
                    : "mt-1 text-3xl font-bold text-foreground"
                }
              >
                {resultado.errores.length}
              </p>
            </div>
          </div>

          {errorImportacion ? <MensajeError>{errorImportacion}</MensajeError> : null}

          {resultado.errores.length > 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-6 shrink-0 text-red-600" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-red-800">
                  Filas que no se importarán ({resultado.errores.length})
                </h3>
              </div>
              <p className="mt-2 text-base text-red-800">
                Estas filas tienen datos faltantes o mal escritos. Se omitirán sin afectar al resto de
                la importación:
              </p>

              <div className="mt-3 flex max-h-60 flex-col gap-2 overflow-y-auto">
                {resultado.errores.map((err, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 rounded-lg border border-red-200 bg-background px-3 py-2 text-base sm:flex-row sm:justify-between sm:gap-3"
                  >
                    <span className="text-foreground">
                      <strong>Fila {err.filaNumero}:</strong> <span className="text-red-700">{err.motivo}</span>
                    </span>
                    {err.datosFila ? (
                      <span className="break-words text-muted-foreground">
                        Cliente: &ldquo;{err.datosFila.cliente}&rdquo; · Póliza: &ldquo;
                        {err.datosFila.numeroPoliza}&rdquo;
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Clientes y pólizas a crear ({resultado.clientesAgrupados.length}{" "}
              {resultado.clientesAgrupados.length === 1 ? "cliente" : "clientes"})
            </h3>

            {resultado.clientesAgrupados.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">
                No se encontraron filas completas para importar.
              </p>
            ) : (
              <div className="mt-3 flex max-h-96 flex-col gap-3 overflow-y-auto">
                {resultado.clientesAgrupados.map((grupo, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-4 break-words">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Users className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <h4 className="text-lg font-semibold break-words text-foreground">{grupo.nombre}</h4>
                      </div>
                      <Badge variant="secondary">
                        {grupo.polizas.length} {grupo.polizas.length === 1 ? "póliza" : "pólizas"}
                      </Badge>
                    </div>

                    <ul className="mt-2 flex list-disc flex-col gap-1 pl-6 text-base text-foreground">
                      {grupo.polizas.map((p, pIdx) => (
                        <li key={pIdx}>
                          <strong>{p.aseguradora || "Sin aseguradora"}</strong> · Póliza:{" "}
                          <strong>{p.numeroPoliza}</strong>
                          {p.tipoProductoTexto ? ` (${p.tipoProductoTexto})` : ""} · Vigencia:{" "}
                          {p.vigenciaInicio} al {p.vigenciaFin}
                          {p.prima > 0 ? ` · Prima: ${p.prima}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" disabled={importando} onClick={() => setPaso("mapear")}>
              <ArrowLeft aria-hidden="true" />
              Cambiar columnas
            </Button>
            <Button
              disabled={resultado.filasValidas.length === 0 || importando}
              onClick={() => void handleConfirmarImportacion()}
              className="w-full sm:w-auto"
            >
              <ShieldCheck aria-hidden="true" />
              {importando
                ? "Guardando…"
                : `Confirmar e importar ${resultado.filasValidas.length} pólizas`}
            </Button>
          </div>
        </div>
      ) : null}

      {paso === "resultado" && resultado ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-9 text-center sm:px-6">
          <CheckCircle2 className="mx-auto mb-4 size-14 text-emerald-600" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-emerald-800">Importación completada</h2>
          <p className="mt-2 text-xl font-semibold text-emerald-800">
            {polizasImportadas} pólizas importadas, {resultado.errores.length} con error
          </p>

          <p className="mx-auto mt-4 max-w-xl text-base text-foreground">
            Los clientes y las pólizas quedaron guardados y agrupados por el nombre del cliente. Ya
            puede verlos en la lista de clientes y en las renovaciones.
          </p>

          {resultado.errores.length > 0 ? (
            <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-background p-4 text-left">
              <p className="text-base font-semibold text-red-800">
                Detalle de las filas omitidas ({resultado.errores.length}):
              </p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-6 text-base text-red-800">
                {resultado.errores.map((err, idx) => (
                  <li key={idx}>
                    Fila {err.filaNumero}: {err.motivo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate("/clientes")}>Ver la lista de clientes</Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Ir a renovaciones
            </Button>
            <Button variant="outline" onClick={handleReiniciar}>
              Importar otro archivo
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
