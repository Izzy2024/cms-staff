import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCliente,
  createPoliza,
  deletePoliza,
  getCliente,
  listPolizas,
  updateCliente,
  updatePoliza,
} from "../lib/clientesRepo.ts";
import type { Cliente, Poliza } from "../lib/types.ts";
import { PolizaForm } from "../components/PolizaForm.tsx";
import type { PolizaFormValues } from "../components/PolizaForm.tsx";

const clienteVacio: Omit<Cliente, "id"> = { nombre: "", cedula: "", telefono: "", email: "" };

export function ClienteDetailPage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const esNuevo = !clienteId || clienteId === "nuevo";
  const navigate = useNavigate();

  const [datos, setDatos] = useState<Omit<Cliente, "id">>(clienteVacio);
  const [polizas, setPolizas] = useState<Poliza[]>([]);
  const [loading, setLoading] = useState(!esNuevo);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormPoliza, setMostrarFormPoliza] = useState(false);
  const [polizaEditando, setPolizaEditando] = useState<Poliza | null>(null);

  useEffect(() => {
    if (esNuevo) return;
    Promise.all([getCliente(clienteId), listPolizas(clienteId)])
      .then(([cliente, listaPolizas]) => {
        if (!cliente) {
          setError("Cliente no encontrado.");
          return;
        }
        setDatos({ nombre: cliente.nombre, cedula: cliente.cedula, telefono: cliente.telefono, email: cliente.email ?? "" });
        setPolizas(listaPolizas);
      })
      .catch(() => setError("No se pudo cargar el cliente."))
      .finally(() => setLoading(false));
  }, [clienteId, esNuevo]);

  async function handleGuardarDatos(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const email = datos.email?.trim();
      const payload: Omit<Cliente, "id"> = { nombre: datos.nombre, cedula: datos.cedula, telefono: datos.telefono };
      if (email) payload.email = email;
      if (esNuevo) {
        const nuevoId = await createCliente(payload);
        navigate(`/clientes/${nuevoId}`, { replace: true });
      } else if (clienteId) {
        await updateCliente(clienteId, payload);
      }
    } catch {
      setError("No se pudo guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardarPoliza(valores: PolizaFormValues): Promise<void> {
    if (!clienteId || esNuevo) return;
    if (polizaEditando) {
      await updatePoliza(clienteId, polizaEditando.id, valores);
    } else {
      await createPoliza(clienteId, valores);
    }
    const listaPolizas = await listPolizas(clienteId);
    setPolizas(listaPolizas);
    setMostrarFormPoliza(false);
    setPolizaEditando(null);
  }

  async function handleEliminarPoliza(polizaId: string): Promise<void> {
    if (!clienteId) return;
    if (!window.confirm("¿Eliminar esta póliza?")) return;
    await deletePoliza(clienteId, polizaId);
    setPolizas(await listPolizas(clienteId));
  }

  if (loading) return <p>Cargando…</p>;

  return (
    <section>
      <h1>{esNuevo ? "Nuevo cliente" : "Ficha de cliente"}</h1>
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleGuardarDatos}
        style={{ display: "grid", gap: "12px", maxWidth: "480px", border: "1px solid #e5e4e7", borderRadius: "8px", padding: "16px" }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          Nombre
          <input
            required
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            style={{ fontSize: "16px", padding: "8px" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          Cédula
          <input
            required
            value={datos.cedula}
            onChange={(e) => setDatos({ ...datos, cedula: e.target.value })}
            style={{ fontSize: "16px", padding: "8px" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          Teléfono
          <input
            required
            value={datos.telefono}
            onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
            style={{ fontSize: "16px", padding: "8px" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          Email (opcional)
          <input
            type="email"
            value={datos.email ?? ""}
            onChange={(e) => setDatos({ ...datos, email: e.target.value })}
            style={{ fontSize: "16px", padding: "8px" }}
          />
        </label>
        <button type="submit" disabled={guardando} style={{ fontSize: "16px", padding: "10px 16px" }}>
          {guardando ? "Guardando…" : "Guardar datos"}
        </button>
      </form>

      {!esNuevo ? (
        <div style={{ marginTop: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Pólizas</h2>
            {!mostrarFormPoliza ? (
              <button
                type="button"
                onClick={() => {
                  setPolizaEditando(null);
                  setMostrarFormPoliza(true);
                }}
                style={{ fontSize: "16px", padding: "10px 16px" }}
              >
                + Agregar póliza
              </button>
            ) : null}
          </div>

          {mostrarFormPoliza ? (
            <div style={{ marginTop: "12px" }}>
              <PolizaForm
                inicial={polizaEditando ?? undefined}
                onGuardar={handleGuardarPoliza}
                onCancelar={() => {
                  setMostrarFormPoliza(false);
                  setPolizaEditando(null);
                }}
              />
            </div>
          ) : null}

          <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
            {polizas.length === 0 ? <p>Sin pólizas registradas.</p> : null}
            {polizas.map((p) => (
              <div key={p.id} style={{ border: "1px solid #e5e4e7", borderRadius: "8px", padding: "16px" }}>
                <p style={{ margin: 0, fontWeight: "bold" }}>
                  {p.aseguradora} · {p.tipoSeguro}
                </p>
                <p style={{ margin: "4px 0" }}>Póliza: {p.numeroPoliza}</p>
                {p.detalleBien ? <p style={{ margin: "4px 0" }}>{p.detalleBien}</p> : null}
                <p style={{ margin: "4px 0" }}>
                  Vigencia: {p.vigenciaInicio} a {p.vigenciaFin}
                </p>
                <p style={{ margin: "4px 0" }}>Prima: {p.prima}</p>
                {p.observaciones ? <p style={{ margin: "4px 0" }}>{p.observaciones}</p> : null}
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPolizaEditando(p);
                      setMostrarFormPoliza(true);
                    }}
                  >
                    Editar
                  </button>
                  <button type="button" onClick={() => handleEliminarPoliza(p.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
