import { useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { Badge } from "../components/ui/badge.tsx";
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
        setErrorLectura("El archivo parece estar vacío o no contiene encabezados legibles.");
        return;
      }
      if (filas.length === 0) {
        setErrorLectura("El archivo contiene encabezados pero no tiene filas de datos.");
        return;
      }

      setArchivo(file);
      setHeaders(headersLeidos);
      setFilasRaw(filas);
      const mapeoInicial = detectarMapeoColumnas(headersLeidos);
      setMapeo(mapeoInicial);
      setPaso("mapear");
    } catch (err) {
      setErrorLectura(
        err instanceof Error
          ? err.message
          : "Error al procesar el archivo. Asegúrate de que sea un .xlsx o .csv válido.",
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
      setErrorLectura("Debes asignar una columna al campo 'Cliente'.");
      return;
    }
    if (mapeo.numeroPoliza === null) {
      setErrorLectura("Debes asignar una columna al campo 'Número de póliza'.");
      return;
    }
    if (mapeo.vigenciaTexto === null) {
      setErrorLectura("Debes asignar una columna al campo 'Vigencia'.");
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
    } catch (err) {
      setErrorImportacion(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al guardar los datos en la base de datos.",
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
    <section style={{ maxWidth: "880px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>Importación masiva desde Excel</h1>
        <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
          Carga en bloque tu cartera de clientes y pólizas a partir de un archivo .xlsx o .csv.
        </p>
      </div>

      {/* Indicador de pasos */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "28px",
          paddingBottom: "16px",
          borderBottom: "1px solid #e5e4e7",
          fontSize: "14px",
        }}
      >
        <Badge variant={paso === "subir" ? "default" : "secondary"}>1. Archivo</Badge>
        <span style={{ color: "#9ca3af" }}>→</span>
        <Badge variant={paso === "mapear" ? "default" : "secondary"}>2. Mapeo</Badge>
        <span style={{ color: "#9ca3af" }}>→</span>
        <Badge variant={paso === "previsualizar" ? "default" : "secondary"}>
          3. Previsualización
        </Badge>
        <span style={{ color: "#9ca3af" }}>→</span>
        <Badge variant={paso === "resultado" ? "default" : "secondary"}>4. Resumen</Badge>
      </div>

      {/* PASO 1: SUBIR ARCHIVO */}
      {paso === "subir" ? (
        <div
          style={{
            border: "2px dashed #d1d5db",
            borderRadius: "12px",
            padding: "48px 24px",
            textAlign: "center",
            background: "#fafafa",
          }}
        >
          <FileSpreadsheet
            style={{ width: "56px", height: "56px", margin: "0 auto 16px", color: "#4f46e5" }}
            aria-hidden="true"
          />
          <h2 style={{ margin: "0 0 8px", fontSize: "20px" }}>Selecciona tu archivo de pólizas</h2>
          <p style={{ margin: "0 auto 24px", color: "#6b7280", maxWidth: "480px", fontSize: "15px" }}>
            Formatos compatibles: <strong>.xlsx</strong> y <strong>.csv</strong>. El archivo debe
            contener una fila por cada póliza (un cliente puede repetirse en varias filas).
          </p>

          <input
            id={fileInputId}
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => void handleArchivoSeleccionado(e)}
            style={{ display: "none" }}
          />

          <Button
            size="lg"
            disabled={leyendo}
            onClick={() => inputRef.current?.click()}
            style={{ fontSize: "16px", padding: "12px 24px" }}
          >
            <Upload aria-hidden="true" />
            {leyendo ? "Leyendo archivo…" : "Seleccionar archivo Excel"}
          </Button>

          {errorLectura ? (
            <p role="alert" style={{ color: "#b00020", marginTop: "16px" }}>
              {errorLectura}
            </p>
          ) : null}

          <div
            style={{
              marginTop: "32px",
              padding: "16px",
              borderRadius: "8px",
              background: "#f3f4f6",
              textAlign: "left",
              fontSize: "13px",
              color: "#4b5563",
            }}
          >
            <p style={{ margin: "0 0 6px", fontWeight: "bold" }}>Columnas habituales esperadas:</p>
            <p style={{ margin: 0 }}>
              CLIENTE · COMPAÑIA DE SEGUROS · TIPO DE PRODUCTO · NUMERO DE POLIZA · VIGENCIA (ej.
              16/9/2026 al 16/09/2027) · PRIMA · OBSERVACIONES
            </p>
          </div>
        </div>
      ) : null}

      {/* PASO 2: MAPEO DE COLUMNAS */}
      {paso === "mapear" ? (
        <div style={{ display: "grid", gap: "20px" }}>
          <div
            style={{
              border: "1px solid #e5e4e7",
              borderRadius: "8px",
              padding: "16px",
              background: "#f9fafb",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>Archivo: {archivo?.name}</p>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "14px" }}>
              Se detectaron <strong>{headers.length}</strong> columnas y{" "}
              <strong>{filasRaw.length}</strong> filas de datos. Asigna cada campo del sistema a la
              columna correspondiente.
            </p>
          </div>

          {errorLectura ? (
            <p role="alert" style={{ color: "#b00020", margin: 0 }}>
              {errorLectura}
            </p>
          ) : null}

          <div style={{ display: "grid", gap: "12px" }}>
            {CAMPOS_SISTEMA.map((campo) => {
              const valorActual = mapeo[campo.clave];
              const ejemploDato =
                valorActual !== null && filasRaw[0] ? String(filasRaw[0][valorActual] ?? "") : "";

              return (
                <div
                  key={campo.clave}
                  style={{
                    border: "1px solid #e5e4e7",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: "220px", flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "15px" }}>
                      {campo.etiqueta}{" "}
                      {campo.requerido ? (
                        <span style={{ color: "#b00020" }} title="Campo obligatorio">
                          *
                        </span>
                      ) : null}
                    </p>
                    <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "13px" }}>
                      {campo.descripcion}
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "260px" }}>
                    <select
                      value={valorActual === null ? -1 : valorActual}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleCambioMapeo(campo.clave, val === -1 ? null : val);
                      }}
                      style={{
                        fontSize: "15px",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        background: "#fff",
                      }}
                    >
                      <option value={-1}>-- No asignar --</option>
                      {headers.map((h, idx) => (
                        <option key={idx} value={idx}>
                          Columna {idx + 1}: {h || `(Sin título ${idx + 1})`}
                        </option>
                      ))}
                    </select>

                    {ejemploDato ? (
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        Ej. fila 1: &ldquo;{ejemploDato.length > 40 ? `${ejemploDato.substring(0, 40)}…` : ejemploDato}&rdquo;
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", gap: "12px", flexWrap: "wrap" }}>
            <Button variant="outline" onClick={handleReiniciar}>
              <ArrowLeft aria-hidden="true" />
              Cambiar archivo
            </Button>
            <Button onClick={handleContinuarAPrevisualizar}>
              Continuar a previsualización
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* PASO 3: PREVISUALIZACIÓN */}
      {paso === "previsualizar" && resultado ? (
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Métricas clave */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                border: "1px solid #e5e4e7",
                borderRadius: "8px",
                padding: "16px",
                background: "#f0fdf4",
              }}
            >
              <p style={{ margin: 0, color: "#166534", fontSize: "13px", fontWeight: 600 }}>
                PÓLIZAS VÁLIDAS
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "28px", fontWeight: "bold", color: "#15803d" }}>
                {resultado.filasValidas.length}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #e5e4e7",
                borderRadius: "8px",
                padding: "16px",
                background: "#eff6ff",
              }}
            >
              <p style={{ margin: 0, color: "#1e40af", fontSize: "13px", fontWeight: 600 }}>
                CLIENTES A CREAR
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "28px", fontWeight: "bold", color: "#1d4ed8" }}>
                {resultado.clientesAgrupados.length}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #e5e4e7",
                borderRadius: "8px",
                padding: "16px",
                background: resultado.errores.length > 0 ? "#fef2f2" : "#f9fafb",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: resultado.errores.length > 0 ? "#991b1b" : "#6b7280",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                FILAS CON ERROR
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: resultado.errores.length > 0 ? "#b91c1c" : "#374151",
                }}
              >
                {resultado.errores.length}
              </p>
            </div>
          </div>

          {errorImportacion ? (
            <p role="alert" style={{ color: "#b00020", margin: 0 }}>
              {errorImportacion}
            </p>
          ) : null}

          {/* Listado de filas con error */}
          {resultado.errores.length > 0 ? (
            <div
              style={{
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "16px",
                background: "#fff5f5",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <AlertCircle style={{ color: "#dc2626", width: "20px", height: "20px" }} aria-hidden="true" />
                <h3 style={{ margin: 0, fontSize: "16px", color: "#991b1b" }}>
                  Filas que no se importarán ({resultado.errores.length})
                </h3>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#7f1d1d" }}>
                Estas filas tienen datos faltantes o con formato incorrecto y serán ignoradas sin
                afectar la importación de las filas válidas:
              </p>

              <div style={{ display: "grid", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
                {resultado.errores.map((err, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #fee2e2",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      background: "#fff",
                      fontSize: "13px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>Fila {err.filaNumero}:</strong>{" "}
                      <span style={{ color: "#b91c1c" }}>{err.motivo}</span>
                    </div>
                    {err.datosFila ? (
                      <span style={{ color: "#6b7280" }}>
                        Cliente: &ldquo;{err.datosFila.cliente}&rdquo; · Póliza: &ldquo;
                        {err.datosFila.numeroPoliza}&rdquo;
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Agrupación de clientes y pólizas a importar */}
          <div>
            <h3 style={{ margin: "0 0 12px", fontSize: "18px" }}>
              Clientes y pólizas a crear ({resultado.clientesAgrupados.length} clientes)
            </h3>

            {resultado.clientesAgrupados.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No se encontraron filas válidas para importar.</p>
            ) : (
              <div style={{ display: "grid", gap: "12px", maxHeight: "360px", overflowY: "auto" }}>
                {resultado.clientesAgrupados.map((grupo, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #e5e4e7",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Users aria-hidden="true" style={{ width: "18px", height: "18px", color: "#4f46e5" }} />
                        <h4 style={{ margin: 0, fontSize: "16px" }}>{grupo.nombre}</h4>
                      </div>
                      <Badge variant="secondary">
                        {grupo.polizas.length} {grupo.polizas.length === 1 ? "póliza" : "pólizas"}
                      </Badge>
                    </div>

                    <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "14px" }}>
                      {grupo.polizas.map((p, pIdx) => (
                        <li key={pIdx} style={{ margin: "3px 0" }}>
                          <strong>{p.aseguradora || "Sin aseguradora"}</strong> · Póliza:{" "}
                          <strong>{p.numeroPoliza}</strong>
                          {p.tipoProductoTexto ? ` (${p.tipoProductoTexto})` : ""} · Vigencia:{" "}
                          {p.vigenciaInicio} al {p.vigenciaFin}
                          {p.prima > 0 ? ` · Prima: $${p.prima}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", gap: "12px", flexWrap: "wrap" }}>
            <Button variant="outline" disabled={importando} onClick={() => setPaso("mapear")}>
              <ArrowLeft aria-hidden="true" />
              Modificar mapeo
            </Button>
            <Button
              disabled={resultado.filasValidas.length === 0 || importando}
              onClick={() => void handleConfirmarImportacion()}
              style={{ padding: "10px 24px" }}
            >
              <ShieldCheck aria-hidden="true" />
              {importando
                ? "Guardando en Firestore…"
                : `Confirmar e importar ${resultado.filasValidas.length} pólizas`}
            </Button>
          </div>
        </div>
      ) : null}

      {/* PASO 4: RESULTADO FINAL */}
      {paso === "resultado" && resultado ? (
        <div
          style={{
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            padding: "36px 24px",
            textAlign: "center",
            background: "#f0fdf4",
          }}
        >
          <CheckCircle2
            style={{ width: "56px", height: "56px", margin: "0 auto 16px", color: "#16a34a" }}
            aria-hidden="true"
          />
          <h2 style={{ margin: "0 0 8px", fontSize: "22px", color: "#15803d" }}>
            Importación completada
          </h2>
          <p
            style={{
              margin: "0 auto 20px",
              fontSize: "18px",
              fontWeight: 600,
              color: "#166534",
            }}
          >
            {polizasImportadas} pólizas importadas, {resultado.errores.length} con error
          </p>

          <p style={{ margin: "0 auto 24px", color: "#4b5563", maxWidth: "520px", fontSize: "14px" }}>
            Los clientes y pólizas se han creado en Firestore agrupados por nombre exacto de
            cliente. Ya puedes verlos en tu lista de clientes y en las alertas de renovación.
          </p>

          {resultado.errores.length > 0 ? (
            <div
              style={{
                margin: "24px auto",
                textAlign: "left",
                maxWidth: "600px",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "16px",
                background: "#fff",
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: "bold", color: "#991b1b", fontSize: "14px" }}>
                Detalle de errores ({resultado.errores.length}):
              </p>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#7f1d1d" }}>
                {resultado.errores.map((err, idx) => (
                  <li key={idx} style={{ margin: "4px 0" }}>
                    Fila {err.filaNumero}: {err.motivo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "24px",
            }}
          >
            <Button onClick={() => navigate("/clientes")}>Ver lista de clientes</Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Ir al dashboard
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
