import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase.ts";
import type { Cliente, Poliza } from "./types.ts";

export type ClienteConPolizas = { cliente: Cliente; polizas: Poliza[] };

function polizasCol(clienteId: string) {
  return collection(db, "clientes", clienteId, "polizas");
}

export async function listClientesConPolizas(): Promise<ClienteConPolizas[]> {
  const [clientesSnap, polizasSnap] = await Promise.all([
    getDocs(collection(db, "clientes")),
    getDocs(collectionGroup(db, "polizas")),
  ]);

  const polizasPorCliente = new Map<string, Poliza[]>();
  for (const polizaDoc of polizasSnap.docs) {
    const clienteId = polizaDoc.ref.parent.parent?.id;
    if (!clienteId) continue;
    const poliza = { id: polizaDoc.id, clienteId, ...polizaDoc.data() } as Poliza;
    const lista = polizasPorCliente.get(clienteId) ?? [];
    lista.push(poliza);
    polizasPorCliente.set(clienteId, lista);
  }

  return clientesSnap.docs.map((clienteDoc) => ({
    cliente: { id: clienteDoc.id, ...clienteDoc.data() } as Cliente,
    polizas: polizasPorCliente.get(clienteDoc.id) ?? [],
  }));
}

export async function getCliente(clienteId: string): Promise<Cliente | null> {
  const snap = await getDoc(doc(db, "clientes", clienteId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Cliente) : null;
}

export async function createCliente(data: Omit<Cliente, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "clientes"), data);
  return ref.id;
}

export async function updateCliente(clienteId: string, data: Omit<Cliente, "id">): Promise<void> {
  await updateDoc(doc(db, "clientes", clienteId), data);
}

export async function listPolizas(clienteId: string): Promise<Poliza[]> {
  const snap = await getDocs(polizasCol(clienteId));
  return snap.docs.map((d) => ({ id: d.id, clienteId, ...d.data() }) as Poliza);
}

export async function createPoliza(
  clienteId: string,
  data: Omit<Poliza, "id" | "clienteId">,
): Promise<string> {
  const ref = await addDoc(polizasCol(clienteId), data);
  return ref.id;
}

export async function updatePoliza(
  clienteId: string,
  polizaId: string,
  data: Omit<Poliza, "id" | "clienteId">,
): Promise<void> {
  await updateDoc(doc(db, "clientes", clienteId, "polizas", polizaId), data);
}

export async function deletePoliza(clienteId: string, polizaId: string): Promise<void> {
  await deleteDoc(doc(db, "clientes", clienteId, "polizas", polizaId));
}
