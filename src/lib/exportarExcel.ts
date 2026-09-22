import type { ClienteConPolizas } from "./clientesRepo.ts";
import { calcularDiasRestantes, polizasActuales } from "./renovaciones.ts";
import type { ItemRenovacion } from "./renovaciones.ts";

export interface FilaExportacion {
  cliente: string;
  cedula: string;
  telefono: string;
  email: string;
  aseguradora: string;
  tipoSeguro: string;
  numeroPoliza: string;
  corredor: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  diasRestantes: number | null;
  estado: string;
  prima: number | null;
  frecuenciaPago: string;
  conductoPago: string;
}

/**
 * Convierte una fecha ISO (YYYY-MM-DD) a texto "dd/mm/aaaa" sin usar objetos Date,
 * evitando desfases de huso horario.
 */
export function formatearFechaDma(fechaStr?: string): string {
  if (!fechaStr || typeof fechaStr !== "string") return "";
  const partes = fechaStr.trim().split("T")[0].split("-");
  if (partes.length !== 3) return "";
  const [anio, mes, dia] = partes;
  if (!anio || !mes || !dia) return "";
  return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio}`;
}

function calcularEstado(dias: number | null): string {
  if (dias === null) return "";
  if (dias < 0) return "Vencida";
  if (dias <= 30) return "Por vencer";
  return "Vigente";
}

/**
 * Genera una fila por cada póliza actual de los clientes (excluyendo vigencias renovadas).
 * Si un cliente no tiene pólizas, genera una fila con las columnas de póliza vacías.
 */
export function filasCartera(
  items: ClienteConPolizas[],
  fechaReferencia: Date = new Date(),
): FilaExportacion[] {
  const filas: FilaExportacion[] = [];

  for (const { cliente, polizas } of items) {
    const actuales = polizasActuales(polizas);
    if (actuales.length === 0) {
      filas.push({
        cliente: cliente.nombre || "",
        cedula: cliente.cedula || "",
        telefono: cliente.telefono || "",
        email: cliente.email || "",
        aseguradora: "",
        tipoSeguro: "",
        numeroPoliza: "",
        corredor: "",
        vigenciaDesde: "",
        vigenciaHasta: "",
        diasRestantes: null,
        estado: "",
        prima: null,
        frecuenciaPago: "",
        conductoPago: "",
      });
    } else {
      for (const poliza of actuales) {
        const dias = calcularDiasRestantes(poliza.vigenciaFin, fechaReferencia);
        filas.push({
          cliente: cliente.nombre || "",
          cedula: cliente.cedula || "",
          telefono: cliente.telefono || "",
          email: cliente.email || "",
          aseguradora: poliza.aseguradora || "",
          tipoSeguro: poliza.tipoSeguro || "",
          numeroPoliza: poliza.numeroPoliza || "",
          corredor: poliza.corredor || "",
          vigenciaDesde: formatearFechaDma(poliza.vigenciaInicio),
          vigenciaHasta: formatearFechaDma(poliza.vigenciaFin),
          diasRestantes: dias,
          estado: calcularEstado(dias),
          prima: typeof poliza.prima === "number" ? poliza.prima : null,
          frecuenciaPago: poliza.frecuenciaPago || "",
          conductoPago: poliza.conductoPago || "",
        });
      }
    }
  }

  return filas;
}

/**
 * Genera una fila por cada item de renovación próxima, vinculando los datos de contacto
 * del cliente correspondiente.
 */
export function filasRenovaciones(
  renovaciones: ItemRenovacion[],
  items: ClienteConPolizas[],
  fechaReferencia: Date = new Date(),
): FilaExportacion[] {
  const clientePorId = new Map(items.map((i) => [i.cliente.id, i.cliente]));

  return renovaciones.map((item) => {
    const cliente = clientePorId.get(item.clienteId);
    const dias =
      item.diasRestantes ??
      calcularDiasRestantes(item.poliza.vigenciaFin, fechaReferencia);

    return {
      cliente: item.clienteNombre || cliente?.nombre || "",
      cedula: cliente?.cedula || "",
      telefono: cliente?.telefono || "",
      email: cliente?.email || "",
      aseguradora: item.poliza.aseguradora || "",
      tipoSeguro: item.poliza.tipoSeguro || "",
      numeroPoliza: item.poliza.numeroPoliza || "",
      corredor: item.poliza.corredor || "",
      vigenciaDesde: formatearFechaDma(item.poliza.vigenciaInicio),
      vigenciaHasta: formatearFechaDma(item.poliza.vigenciaFin),
      diasRestantes: dias,
      estado: calcularEstado(dias),
      prima: typeof item.poliza.prima === "number" ? item.poliza.prima : null,
      frecuenciaPago: item.poliza.frecuenciaPago || "",
      conductoPago: item.poliza.conductoPago || "",
    };
  });
}

/**
 * Descarga el archivo Excel en el navegador cargando write-excel-file dinámicamente.
 */
export async function descargarExcel(
  filas: FilaExportacion[],
  nombreArchivo: string,
): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const columns = [
    { header: "Cliente", cell: (r: FilaExportacion) => ({ type: String, value: r.cliente }) },
    { header: "Cédula", cell: (r: FilaExportacion) => ({ type: String, value: r.cedula }) },
    { header: "Teléfono", cell: (r: FilaExportacion) => ({ type: String, value: r.telefono }) },
    { header: "Email", cell: (r: FilaExportacion) => ({ type: String, value: r.email }) },
    { header: "Aseguradora", cell: (r: FilaExportacion) => ({ type: String, value: r.aseguradora }) },
    { header: "Tipo de seguro", cell: (r: FilaExportacion) => ({ type: String, value: r.tipoSeguro }) },
    { header: "N° póliza", cell: (r: FilaExportacion) => ({ type: String, value: r.numeroPoliza }) },
    { header: "Corredor", cell: (r: FilaExportacion) => ({ type: String, value: r.corredor }) },
    { header: "Vigencia desde", cell: (r: FilaExportacion) => ({ type: String, value: r.vigenciaDesde }) },
    { header: "Vigencia hasta", cell: (r: FilaExportacion) => ({ type: String, value: r.vigenciaHasta }) },
    {
      header: "Días restantes",
      cell: (r: FilaExportacion) => ({
        type: Number,
        value: r.diasRestantes ?? undefined,
      }),
    },
    { header: "Estado", cell: (r: FilaExportacion) => ({ type: String, value: r.estado }) },
    {
      header: "Prima",
      cell: (r: FilaExportacion) => ({
        type: Number,
        value: r.prima ?? undefined,
        format: "#,##0.00",
      }),
    },
    { header: "Frecuencia de pago", cell: (r: FilaExportacion) => ({ type: String, value: r.frecuenciaPago }) },
    { header: "Conducto de pago", cell: (r: FilaExportacion) => ({ type: String, value: r.conductoPago }) },
  ];

  await writeXlsxFile(filas, { columns }).toFile(nombreArchivo);
}
