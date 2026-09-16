import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Save, Trash2 } from "lucide-react";
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
import { DocumentosPoliza } from "../components/DocumentosPoliza.tsx";
import { RenovacionBadge } from "../components/RenovacionBadge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";

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
          setError("No se encontró este cliente. Puede que se haya eliminado.");
          return;
        }
        setDatos({
          nombre: cliente.nombre,
          cedula: cliente.cedula,
          telefono: cliente.telefono,
          email: cliente.email ?? "",
        });
        setPolizas(listaPolizas);
      })
      .catch(() => setError("No se pudo cargar la ficha del cliente. Revise su conexión e intente de nuevo."))
      .finally(() => setLoading(false));
  }, [clienteId, esNuevo]);

  async function handleGuardarDatos(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const email = datos.email?.trim();
      const payload: Omit<Cliente, "id"> = {
        nombre: datos.nombre,
        cedula: datos.cedula,
        telefono: datos.telefono,
      };
      if (email) payload.email = email;
      if (esNuevo) {
        const nuevoId = await createCliente(payload);
        navigate(`/clientes/${nuevoId}`, { replace: true });
      } else if (clienteId) {
        await updateCliente(clienteId, payload);
      }
    } catch {
      setError("No se pudieron guardar los datos del cliente. Intente de nuevo.");
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
    if (!window.confirm("¿Seguro que desea eliminar esta póliza? Esta acción no se puede deshacer.")) return;
    setError("");
    try {
      await deletePoliza(clienteId, polizaId);
      setPolizas(await listPolizas(clienteId));
    } catch {
      setError("No se pudo eliminar la póliza. Intente de nuevo.");
    }
  }

  if (loading) return <Cargando mensaje="Cargando la ficha del cliente…" />;

  return (
    <section>
      {!esNuevo && clienteId ? (
        <Link
          to="/clientes"
          className="inline-flex h-11 items-center gap-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          Volver a clientes
        </Link>
      ) : null}

      <h1 className="mt-2 text-3xl font-bold text-foreground">
        {esNuevo ? "Nuevo cliente" : "Ficha de cliente"}
      </h1>

      {error ? <MensajeError className="mt-4">{error}</MensajeError> : null}

      <form
        onSubmit={handleGuardarDatos}
        className="mt-6 grid max-w-xl gap-5 rounded-xl border border-border bg-card p-4 sm:p-5"
      >
        <label className="flex flex-col gap-2 text-base font-medium text-foreground">
          Nombre completo
          <Input
            required
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-base font-medium text-foreground">
          Cédula
          <Input
            required
            value={datos.cedula}
            onChange={(e) => setDatos({ ...datos, cedula: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-base font-medium text-foreground">
          Teléfono
          <Input
            type="tel"
            required
            value={datos.telefono}
            onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-base font-medium text-foreground">
          Correo electrónico (opcional)
          <Input
            type="email"
            value={datos.email ?? ""}
            onChange={(e) => setDatos({ ...datos, email: e.target.value })}
          />
        </label>

        <div>
          <Button type="submit" disabled={guardando}>
            <Save aria-hidden="true" />
            {guardando ? "Guardando…" : "Guardar datos"}
          </Button>
        </div>
      </form>

      {!esNuevo && clienteId ? (
        <div className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-foreground">Pólizas</h2>
            {!mostrarFormPoliza ? (
              <Button
                onClick={() => {
                  setPolizaEditando(null);
                  setMostrarFormPoliza(true);
                }}
              >
                <Plus aria-hidden="true" />
                Agregar póliza
              </Button>
            ) : null}
          </div>

          {mostrarFormPoliza ? (
            <div className="mt-4">
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

          <div className="mt-4 flex flex-col gap-4">
            {polizas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
                <p className="text-lg font-medium text-foreground">Este cliente todavía no tiene pólizas</p>
                <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
                  Use el botón «Agregar póliza» para registrar la primera.
                </p>
              </div>
            ) : null}

            {polizas.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 break-words">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-foreground">
                    {p.aseguradora} · {p.tipoSeguro}
                  </h3>
                  <RenovacionBadge vigenciaFin={p.vigenciaFin} />
                </div>

                <div className="mt-3 flex flex-col gap-1 text-base text-foreground">
                  <p>
                    <span className="text-muted-foreground">Número de póliza: </span>
                    <strong>{p.numeroPoliza}</strong>
                  </p>
                  {p.detalleBien ? (
                    <p>
                      <span className="text-muted-foreground">Bien asegurado: </span>
                      {p.detalleBien}
                    </p>
                  ) : null}
                  <p>
                    <span className="text-muted-foreground">Vigencia: </span>
                    {p.vigenciaInicio} al {p.vigenciaFin}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Prima: </span>
                    {p.prima}
                  </p>
                  {p.observaciones ? (
                    <p>
                      <span className="text-muted-foreground">Observaciones: </span>
                      {p.observaciones}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPolizaEditando(p);
                      setMostrarFormPoliza(true);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    Editar
                  </Button>
                  <Button variant="destructive" onClick={() => void handleEliminarPoliza(p.id)}>
                    <Trash2 aria-hidden="true" />
                    Eliminar
                  </Button>
                </div>

                <DocumentosPoliza clienteId={clienteId} polizaId={p.id} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
