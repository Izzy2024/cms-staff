import { supabase } from "./supabase.ts";
import type { Cliente, Poliza } from "./types.ts";

export type ClienteConPolizas = { cliente: Cliente; polizas: Poliza[] };

function filaAPoliza(fila: {
  id: string;
  cliente_id: string;
  aseguradora: string;
  tipo_seguro: string;
  detalle_bien: string;
  numero_poliza: string;
  vigencia_inicio: string;
  vigencia_fin: string;
  prima: number;
  observaciones: string;
  beneficios: string;
}): Poliza {
  return {
    id: fila.id,
    clienteId: fila.cliente_id,
    aseguradora: fila.aseguradora,
    tipoSeguro: fila.tipo_seguro as Poliza["tipoSeguro"],
    detalleBien: fila.detalle_bien,
    numeroPoliza: fila.numero_poliza,
    vigenciaInicio: fila.vigencia_inicio,
    vigenciaFin: fila.vigencia_fin,
    prima: fila.prima,
    observaciones: fila.observaciones,
    beneficios: fila.beneficios,
  };
}

function polizaAFila(data: Omit<Poliza, "id" | "clienteId">) {
  return {
    aseguradora: data.aseguradora,
    tipo_seguro: data.tipoSeguro,
    detalle_bien: data.detalleBien,
    numero_poliza: data.numeroPoliza,
    vigencia_inicio: data.vigenciaInicio,
    vigencia_fin: data.vigenciaFin,
    prima: data.prima,
    observaciones: data.observaciones,
    beneficios: data.beneficios,
  };
}

export async function listClientesConPolizas(): Promise<ClienteConPolizas[]> {
  const [{ data: clientes, error: errorClientes }, { data: polizas, error: errorPolizas }] =
    await Promise.all([
      supabase.from("clientes").select("*"),
      supabase.from("polizas").select("*"),
    ]);
  if (errorClientes) throw errorClientes;
  if (errorPolizas) throw errorPolizas;

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
    },
    polizas: polizasPorCliente.get(cliente.id) ?? [],
  }));
}

export async function getCliente(clienteId: string): Promise<Cliente | null> {
  const { data, error } = await supabase.from("clientes").select("*").eq("id", clienteId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, nombre: data.nombre, cedula: data.cedula, telefono: data.telefono, email: data.email ?? undefined };
}

export async function createCliente(data: Omit<Cliente, "id">): Promise<string> {
  const { data: fila, error } = await supabase.from("clientes").insert(data).select("id").single();
  if (error) throw error;
  return fila.id;
}

export async function updateCliente(clienteId: string, data: Omit<Cliente, "id">): Promise<void> {
  const { error } = await supabase.from("clientes").update(data).eq("id", clienteId);
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
  const { error } = await supabase.from("polizas").delete().eq("id", polizaId).eq("cliente_id", clienteId);
  if (error) throw error;
}
