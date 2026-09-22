import { supabase } from "./supabase.ts";
import { BUCKET } from "./documentosRepo.ts";
import type { Cliente, Poliza } from "./types.ts";

export type ClienteConPolizas = { cliente: Cliente; polizas: Poliza[] };

function filaAPoliza(fila: {
  id: string;
  cliente_id: string;
  aseguradora: string;
  tipo_seguro: string;
  detalle_bien: string;
  numero_poliza: string;
  corredor?: string | null;
  vigencia_inicio: string;
  vigencia_fin: string;
  prima: number;
  observaciones: string;
  beneficios: string;
  cobertura_auto?: string | null;
  frecuencia_pago?: string | null;
  conducto_pago?: string | null;
  dia_pago?: string | null;
  numero_cuotas?: number | null;
}): Poliza {
  return {
    id: fila.id,
    clienteId: fila.cliente_id,
    aseguradora: fila.aseguradora,
    tipoSeguro: fila.tipo_seguro as Poliza["tipoSeguro"],
    detalleBien: fila.detalle_bien,
    numeroPoliza: fila.numero_poliza,
    corredor: fila.corredor ?? undefined,
    vigenciaInicio: fila.vigencia_inicio,
    vigenciaFin: fila.vigencia_fin,
    prima: fila.prima,
    observaciones: fila.observaciones,
    beneficios: fila.beneficios,
    coberturaAuto: (fila.cobertura_auto as Poliza["coberturaAuto"]) || undefined,
    frecuenciaPago: (fila.frecuencia_pago as Poliza["frecuenciaPago"]) || undefined,
    conductoPago: (fila.conducto_pago as Poliza["conductoPago"]) || undefined,
    diaPago: fila.dia_pago ?? undefined,
    numeroCuotas: fila.numero_cuotas ?? undefined,
  };
}

function polizaAFila(data: Omit<Poliza, "id" | "clienteId">) {
  return {
    aseguradora: data.aseguradora,
    tipo_seguro: data.tipoSeguro,
    detalle_bien: data.detalleBien,
    numero_poliza: data.numeroPoliza,
    corredor: data.corredor ?? null,
    vigencia_inicio: data.vigenciaInicio,
    vigencia_fin: data.vigenciaFin,
    prima: data.prima,
    observaciones: data.observaciones,
    beneficios: data.beneficios,
    cobertura_auto: data.coberturaAuto ?? null,
    frecuencia_pago: data.frecuenciaPago ?? null,
    conducto_pago: data.conductoPago ?? null,
    dia_pago: data.diaPago ?? null,
    numero_cuotas: data.numeroCuotas ?? null,
  };
}

const PAGINA = 1000;

// ponytail: asume el max-rows por defecto de Supabase (1000); si se baja en el dashboard, bajar PAGINA.
async function traerTodasLasFilas(tabla: "clientes" | "polizas") {
  const primera = await supabase.from(tabla).select("*").order("id").range(0, PAGINA - 1);
  if (primera.error) throw primera.error;
  const filas = [...(primera.data ?? [])];
  for (let desde = PAGINA; filas.length === desde; desde += PAGINA) {
    const { data, error } = await supabase
      .from(tabla)
      .select("*")
      .order("id")
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    filas.push(...(data ?? []));
  }
  return filas;
}

export async function listClientesConPolizas(): Promise<ClienteConPolizas[]> {
  const [clientes, polizas] = await Promise.all([
    traerTodasLasFilas("clientes"),
    traerTodasLasFilas("polizas"),
  ]);

  const polizasPorCliente = new Map<string, Poliza[]>();
  for (const fila of polizas ?? []) {
    const poliza = filaAPoliza(fila);
    const lista = polizasPorCliente.get(poliza.clienteId) ?? [];
    lista.push(poliza);
    polizasPorCliente.set(poliza.clienteId, lista);
  }

  return (clientes ?? []).map((cliente) => ({
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      cedula: cliente.cedula,
      telefono: cliente.telefono,
      email: cliente.email ?? undefined,
      fechaNacimiento: cliente.fecha_nacimiento ?? undefined,
      activoManual: cliente.activo_manual ?? null,
    },
    polizas: polizasPorCliente.get(cliente.id) ?? [],
  }));
}

export async function getCliente(clienteId: string): Promise<Cliente | null> {
  const { data, error } = await supabase.from("clientes").select("*").eq("id", clienteId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    cedula: data.cedula,
    telefono: data.telefono,
    email: data.email ?? undefined,
    fechaNacimiento: data.fecha_nacimiento ?? undefined,
    activoManual: data.activo_manual ?? null,
  };
}

export async function createCliente(data: Omit<Cliente, "id">): Promise<string> {
  const { activoManual, fechaNacimiento, ...resto } = data;
  const { data: fila, error } = await supabase
    .from("clientes")
    .insert({ ...resto, fecha_nacimiento: fechaNacimiento || null, activo_manual: activoManual })
    .select("id")
    .single();
  if (error) throw error;
  return fila.id;
}

export async function updateCliente(clienteId: string, data: Omit<Cliente, "id">): Promise<void> {
  const { activoManual, fechaNacimiento, ...resto } = data;
  const { error } = await supabase
    .from("clientes")
    .update({ ...resto, fecha_nacimiento: fechaNacimiento || null, activo_manual: activoManual })
    .eq("id", clienteId);
  if (error) throw error;
}

export async function actualizarEstadoManual(clienteId: string, activoManual: boolean | null): Promise<void> {
  const { error } = await supabase.from("clientes").update({ activo_manual: activoManual }).eq("id", clienteId);
  if (error) throw error;
}

export async function listPolizas(clienteId: string): Promise<Poliza[]> {
  const { data, error } = await supabase.from("polizas").select("*").eq("cliente_id", clienteId);
  if (error) throw error;
  return (data ?? []).map(filaAPoliza);
}

export async function createPoliza(
  clienteId: string,
  data: Omit<Poliza, "id" | "clienteId">,
): Promise<string> {
  const { data: fila, error } = await supabase
    .from("polizas")
    .insert({ ...polizaAFila(data), cliente_id: clienteId })
    .select("id")
    .single();
  if (error) throw error;
  return fila.id;
}

export async function updatePoliza(
  clienteId: string,
  polizaId: string,
  data: Omit<Poliza, "id" | "clienteId">,
): Promise<void> {
  const { error } = await supabase
    .from("polizas")
    .update(polizaAFila(data))
    .eq("id", polizaId)
    .eq("cliente_id", clienteId);
  if (error) throw error;
}

export async function deletePoliza(clienteId: string, polizaId: string): Promise<void> {
  const { data: documentos, error: errorDocumentos } = await supabase
    .from("documentos_poliza")
    .select("storage_path")
    .eq("poliza_id", polizaId);
  if (errorDocumentos) throw errorDocumentos;

  const { error } = await supabase.from("polizas").delete().eq("id", polizaId).eq("cliente_id", clienteId);
  if (error) throw error;

  const rutas = (documentos ?? []).map((fila) => fila.storage_path);
  if (rutas.length > 0) {
    await supabase.storage.from(BUCKET).remove(rutas).catch(() => undefined);
  }
}

export async function createClientes(
  lista: Omit<Cliente, "id">[],
): Promise<{ id: string; nombre: string }[]> {
  if (lista.length === 0) return [];
  const filas = lista.map(({ activoManual, fechaNacimiento, ...resto }) => ({
    ...resto,
    fecha_nacimiento: fechaNacimiento || null,
    activo_manual: activoManual,
  }));
  const { data, error } = await supabase.from("clientes").insert(filas).select("id, nombre");
  if (error) throw error;
  return (data ?? []).map((fila) => ({ id: fila.id, nombre: fila.nombre }));
}

export async function createPolizas(
  lista: { clienteId: string; datos: Omit<Poliza, "id" | "clienteId"> }[],
): Promise<void> {
  for (let i = 0; i < lista.length; i += 500) {
    const bloque = lista.slice(i, i + 500).map(({ clienteId, datos }) => ({
      ...polizaAFila(datos),
      cliente_id: clienteId,
    }));
    const { error } = await supabase.from("polizas").insert(bloque);
    if (error) throw error;
  }
}
