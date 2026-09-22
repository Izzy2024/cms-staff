import readXlsxFile from "read-excel-file/browser";
import type { ClienteConPolizas } from "./clientesRepo.ts";
import type { Poliza } from "./types.ts";
import { polizasActuales } from "./renovaciones.ts";

export type CampoSistema =
  | "cliente"
  | "aseguradora"
  | "tipoProductoTexto"
  | "numeroPoliza"
  | "vigenciaTexto"
  | "prima"
  | "observaciones";

export interface InfoCampoSistema {
  clave: CampoSistema;
  etiqueta: string;
  requerido: boolean;
  descripcion: string;
}

export const CAMPOS_SISTEMA: InfoCampoSistema[] = [
  { clave: "cliente", etiqueta: "Cliente", requerido: true, descripcion: "Nombre del cliente" },
  { clave: "aseguradora", etiqueta: "Compañía de seguros", requerido: false, descripcion: "Aseguradora (ej. ASSA, Mapfre)" },
  { clave: "tipoProductoTexto", etiqueta: "Tipo de producto / Bien", requerido: false, descripcion: "Detalle del producto o bien asegurado" },
  { clave: "numeroPoliza", etiqueta: "Número de póliza", requerido: true, descripcion: "Identificador único de la póliza" },
  { clave: "vigenciaTexto", etiqueta: "Vigencia", requerido: true, descripcion: "Rango de fechas ej. 16/9/2026 al 16/09/2027" },
  { clave: "prima", etiqueta: "Prima", requerido: false, descripcion: "Monto de la prima" },
  { clave: "observaciones", etiqueta: "Observaciones", requerido: false, descripcion: "Notas o comentarios adicionales" },
];

export interface MapeoColumnas {
  cliente: number | null;
  aseguradora: number | null;
  tipoProductoTexto: number | null;
  numeroPoliza: number | null;
  vigenciaTexto: number | null;
  prima: number | null;
  observaciones: number | null;
}

export interface PolizaValida {
  filaNumero: number;
  clienteNombre: string;
  aseguradora: string;
  tipoProductoTexto: string;
  numeroPoliza: string;
  vigenciaInicio: string;
  vigenciaFin: string;
  prima: number;
  observaciones: string;
}

export interface ClienteAgrupado {
  nombre: string;
  polizas: PolizaValida[];
}

export interface ErrorFilaImportacion {
  filaNumero: number;
  motivo: string;
  datosFila?: Record<string, string>;
}

export interface ResultadoProcesamiento {
  totalFilas: number;
  filasValidas: PolizaValida[];
  clientesAgrupados: ClienteAgrupado[];
  errores: ErrorFilaImportacion[];
}

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parsea una fecha en formato D(D)/M(M)/YYYY o D(D)-M(M)-YYYY
 * y retorna string ISO YYYY-MM-DD o null si es inválida.
 */
function parseFechaDmy(fechaStr: string): string | null {
  const match = fechaStr.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;

  const dia = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  const anio = parseInt(match[3], 10);

  if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || anio < 1900 || anio > 2100) {
    return null;
  }

  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return null;
  }

  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Parsea un rango de vigencia tipo "16/9/2026 al 16/09/2027", "16/09/2026 - 16/09/2027", etc.
 * Retorna las fechas de inicio y fin en formato ISO YYYY-MM-DD.
 */
export function parseVigenciaRango(
  texto: unknown,
): { vigenciaInicio: string; vigenciaFin: string } | null {
  if (texto === null || texto === undefined) return null;
  const str = String(texto).trim();
  if (!str) return null;

  const regex = /(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s*(?:al?|hasta|-|–|—)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i;
  const match = str.match(regex);
  if (!match) return null;

  const fInicio = parseFechaDmy(match[1]);
  const fFin = parseFechaDmy(match[2]);

  if (!fInicio || !fFin) return null;
  return { vigenciaInicio: fInicio, vigenciaFin: fFin };
}

/**
 * Parsea un monto de prima a número.
 */
export function parsePrima(valor: unknown): number {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? Math.max(0, valor) : 0;
  }
  if (!valor) return 0;
  let str = String(valor)
    .trim()
    .replace(/[^0-9.,-]/g, "")
    .replace(/^[.,]+|[.,]+$/g, "");
  if (!str) return 0;

  const tieneComa = str.includes(",");
  const tienePunto = str.includes(".");

  if (tieneComa && tienePunto) {
    const decimal = str.lastIndexOf(",") > str.lastIndexOf(".") ? "," : ".";
    const miles = decimal === "," ? "." : ",";
    str = str.split(miles).join("").replace(decimal, ".");
  } else if (tieneComa) {
    str = /^\d{1,3}(,\d{3})+$/.test(str) ? str.replace(/,/g, "") : str.replace(",", ".");
  } else if (tienePunto) {
    str = /^\d{1,3}(\.\d{3}){2,}$/.test(str) ? str.replace(/\./g, "") : str;
  }

  const parsed = parseFloat(str);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/**
 * Sugiere el mapeo automático de columnas basándose en los encabezados del archivo.
 */
export function detectarMapeoColumnas(headers: string[]): MapeoColumnas {
  const normalizados = headers.map((h) => normalizarTexto(h));

  const mapeo: MapeoColumnas = {
    cliente: null,
    aseguradora: null,
    tipoProductoTexto: null,
    numeroPoliza: null,
    vigenciaTexto: null,
    prima: null,
    observaciones: null,
  };

  const patrones: Record<CampoSistema, string[]> = {
    cliente: ["cliente", "nombre del cliente", "asegurado", "tomador", "nombre"],
    aseguradora: ["compania de seguros", "compañia de seguros", "compania", "compañia", "aseguradora", "empresa aseguradora"],
    tipoProductoTexto: ["tipo de producto", "producto", "bien", "tipo", "ramo", "detalle"],
    numeroPoliza: ["numero de poliza", "no. de poliza", "no. poliza", "no poliza", "nro poliza", "poliza"],
    vigenciaTexto: ["vigencia", "periodo", "fechas de vigencia", "fechas"],
    prima: ["prima", "costo", "monto", "importe"],
    observaciones: ["observaciones", "observacion", "notas", "comentarios"],
  };

  for (const [campo, keywords] of Object.entries(patrones) as [CampoSistema, string[]][]) {
    for (const keyword of keywords) {
      const idx = normalizados.findIndex((h) => h === keyword || h.includes(keyword));
      if (idx !== -1) {
        mapeo[campo] = idx;
        break;
      }
    }
  }

  return mapeo;
}

/**
 * Parsea un contenido CSV delimitado por comas o puntos y comas.
 */
export function parsearCsv(texto: string): { headers: string[]; filas: unknown[][] } {
  const lineas = texto
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lineas.length === 0) return { headers: [], filas: [] };

  const primeraLinea = lineas[0];
  const comaCount = (primeraLinea.match(/,/g) || []).length;
  const puntoComaCount = (primeraLinea.match(/;/g) || []).length;
  const delimitador = puntoComaCount > comaCount ? ";" : ",";

  const rows = lineas.map((linea) => {
    const row: string[] = [];
    let actual = "";
    let entreComillas = false;

    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (entreComillas && linea[i + 1] === '"') {
          actual += '"';
          i++;
        } else {
          entreComillas = !entreComillas;
        }
      } else if (c === delimitador && !entreComillas) {
        row.push(actual.trim());
        actual = "";
      } else {
        actual += c;
      }
    }
    row.push(actual.trim());
    return row;
  });

  const headers = rows[0].map((h) => h.trim());
  const filas = rows.slice(1).filter((r) => r.some((c) => c.length > 0));

  return { headers, filas };
}

/**
 * Lee un archivo .xlsx o .csv en el navegador.
 */
export async function leerArchivoExcel(
  archivo: File,
): Promise<{ headers: string[]; filas: unknown[][] }> {
  const nombre = archivo.name.toLowerCase();
  if (nombre.endsWith(".csv") || archivo.type.includes("csv") || archivo.type.includes("text")) {
    const texto = await archivo.text();
    return parsearCsv(texto);
  }

  const resultado = await readXlsxFile(archivo);
  if (!resultado || resultado.length === 0) {
    return { headers: [], filas: [] };
  }

  // En read-excel-file v9, readXlsxFile retorna Sheet[] donde cada sheet tiene { sheet: string, data: Row[] }
  const primerElemento = resultado[0] as unknown;
  const data: unknown[][] =
    primerElemento !== null &&
    typeof primerElemento === "object" &&
    "data" in primerElemento &&
    Array.isArray((primerElemento as { data: unknown }).data)
      ? ((primerElemento as { data: unknown[][] }).data)
      : (resultado as unknown as unknown[][]);

  if (!data || data.length === 0) {
    return { headers: [], filas: [] };
  }

  const headers = (data[0] ?? []).map((c) => String(c ?? "").trim());
  const filas = data.slice(1).filter((row) =>
    row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""),
  );

  return { headers, filas };
}

/**
 * Procesa las filas según el mapeo de columnas, valida cada una,
 * agrupa por nombre exacto de cliente y genera la lista de errores.
 */
export function procesarFilas(
  filas: unknown[][],
  mapeo: MapeoColumnas,
): ResultadoProcesamiento {
  const filasValidas: PolizaValida[] = [];
  const errores: ErrorFilaImportacion[] = [];

  let filaNumero = 1;
  for (const fila of filas) {
    filaNumero++;

    const estaVacia = fila.every(
      (celda) => celda === null || celda === undefined || String(celda).trim() === "",
    );
    if (estaVacia) continue;

    const clienteValor = mapeo.cliente !== null ? String(fila[mapeo.cliente] ?? "").trim() : "";
    const aseguradoraValor = mapeo.aseguradora !== null ? String(fila[mapeo.aseguradora] ?? "").trim() : "";
    const tipoProductoValor = mapeo.tipoProductoTexto !== null ? String(fila[mapeo.tipoProductoTexto] ?? "").trim() : "";
    const numeroPolizaValor = mapeo.numeroPoliza !== null ? String(fila[mapeo.numeroPoliza] ?? "").trim() : "";
    const vigenciaTextoValor = mapeo.vigenciaTexto !== null ? String(fila[mapeo.vigenciaTexto] ?? "").trim() : "";
    const primaValor = mapeo.prima !== null ? parsePrima(fila[mapeo.prima]) : 0;
    const observacionesValor = mapeo.observaciones !== null ? String(fila[mapeo.observaciones] ?? "").trim() : "";

    if (!clienteValor) {
      errores.push({
        filaNumero,
        motivo: "Falta el nombre del cliente",
        datosFila: {
          cliente: "(vacío)",
          numeroPoliza: numeroPolizaValor || "(vacío)",
          vigencia: vigenciaTextoValor || "(vacío)",
        },
      });
      continue;
    }

    if (!numeroPolizaValor) {
      errores.push({
        filaNumero,
        motivo: "Falta el número de póliza",
        datosFila: {
          cliente: clienteValor,
          numeroPoliza: "(vacío)",
          vigencia: vigenciaTextoValor || "(vacío)",
        },
      });
      continue;
    }

    const vigencia = parseVigenciaRango(vigenciaTextoValor);
    if (!vigencia) {
      errores.push({
        filaNumero,
        motivo: `Formato de vigencia inválido: "${vigenciaTextoValor || "(vacío)"}"`,
        datosFila: {
          cliente: clienteValor,
          numeroPoliza: numeroPolizaValor,
          vigencia: vigenciaTextoValor || "(vacío)",
        },
      });
      continue;
    }

    filasValidas.push({
      filaNumero,
      clienteNombre: clienteValor,
      aseguradora: aseguradoraValor,
      tipoProductoTexto: tipoProductoValor,
      numeroPoliza: numeroPolizaValor,
      vigenciaInicio: vigencia.vigenciaInicio,
      vigenciaFin: vigencia.vigenciaFin,
      prima: primaValor,
      observaciones: observacionesValor,
    });
  }

  // Agrupación por nombre exacto de cliente
  const clientesMap = new Map<string, PolizaValida[]>();
  for (const poliza of filasValidas) {
    const lista = clientesMap.get(poliza.clienteNombre) ?? [];
    lista.push(poliza);
    clientesMap.set(poliza.clienteNombre, lista);
  }

  const clientesAgrupados: ClienteAgrupado[] = Array.from(clientesMap.entries()).map(
    ([nombre, polizas]) => ({
      nombre,
      polizas,
    }),
  );

  return {
    totalFilas: filasValidas.length + errores.length,
    filasValidas,
    clientesAgrupados,
    errores,
  };
}

export interface PlanImportacion {
  clientesNuevos: string[];
  polizasPorCrear: {
    claveCliente: string;
    clienteIdExistente: string | null;
    poliza: PolizaValida;
    polizaAnteriorId: string | null;
  }[];
  omitidas: PolizaValida[];
  renovacionesEnlazadas: number;
}

function clavePoliza(aseguradora: string, numeroPoliza: string, vigenciaInicio: string): string {
  return `${normalizarTexto(aseguradora)}|${normalizarTexto(numeroPoliza)}|${normalizarTexto(vigenciaInicio)}`;
}

/**
 * Planifica la importación de forma idempotente: reutiliza clientes existentes por nombre
 * normalizado, fusiona grupos homónimos del archivo en un solo cliente nuevo (conserva el
 * primer nombre) y omite las pólizas ya presentes en la base o repetidas en el archivo.
 */
export function planificarImportacion(
  grupos: ClienteAgrupado[],
  existentes: ClienteConPolizas[],
): PlanImportacion {
  const idPorClave = new Map<string, string>();
  const clavesPoliza = new Set<string>();
  const polizasActualesPorCliente = new Map<string, Poliza[]>();

  for (const { cliente, polizas } of existentes) {
    const clave = normalizarTexto(cliente.nombre);
    if (!idPorClave.has(clave)) idPorClave.set(clave, cliente.id);
    for (const p of polizas) {
      clavesPoliza.add(clavePoliza(p.aseguradora, p.numeroPoliza, p.vigenciaInicio));
    }
    polizasActualesPorCliente.set(cliente.id, polizasActuales(polizas));
  }

  const omitidas: PolizaValida[] = [];
  const polizasPorCrear: PlanImportacion["polizasPorCrear"] = [];
  const nombrePorClaveNueva = new Map<string, string>();
  const idsReclamados = new Set<string>();
  let renovacionesEnlazadas = 0;

  for (const grupo of grupos) {
    const clave = normalizarTexto(grupo.nombre);
    const clienteIdExistente = idPorClave.get(clave) ?? null;
    if (clienteIdExistente === null && !nombrePorClaveNueva.has(clave)) {
      nombrePorClaveNueva.set(clave, grupo.nombre);
    }

    for (const poliza of grupo.polizas) {
      const claveP = clavePoliza(poliza.aseguradora, poliza.numeroPoliza, poliza.vigenciaInicio);
      if (clavesPoliza.has(claveP)) {
        omitidas.push(poliza);
        continue;
      }
      clavesPoliza.add(claveP);

      let polizaAnteriorId: string | null = null;

      // ponytail: limite conocido; dos vigencias de la misma poliza dentro del mismo archivo no se enlazan entre si (se puede enlazar despues con una segunda importacion).
      if (clienteIdExistente !== null) {
        const candidatas = (polizasActualesPorCliente.get(clienteIdExistente) ?? []).filter(
          (p) =>
            normalizarTexto(p.aseguradora) === normalizarTexto(poliza.aseguradora) &&
            normalizarTexto(p.numeroPoliza) === normalizarTexto(poliza.numeroPoliza) &&
            p.vigenciaInicio < poliza.vigenciaInicio,
        );

        if (candidatas.length > 0) {
          candidatas.sort((a, b) => b.vigenciaInicio.localeCompare(a.vigenciaInicio));
          const masReciente = candidatas[0];
          if (!idsReclamados.has(masReciente.id)) {
            polizaAnteriorId = masReciente.id;
            idsReclamados.add(masReciente.id);
            renovacionesEnlazadas += 1;
          }
        }
      }

      polizasPorCrear.push({
        claveCliente: clave,
        clienteIdExistente,
        poliza,
        polizaAnteriorId,
      });
    }
  }

  // Un cliente nuevo cuyas pólizas quedaron TODAS omitidas no se crea.
  const clavesConPoliza = new Set(
    polizasPorCrear.filter((a) => a.clienteIdExistente === null).map((a) => a.claveCliente),
  );
  const clientesNuevos = [...nombrePorClaveNueva.entries()]
    .filter(([clave]) => clavesConPoliza.has(clave))
    .map(([, nombre]) => nombre);

  return { clientesNuevos, polizasPorCrear, omitidas, renovacionesEnlazadas };
}
