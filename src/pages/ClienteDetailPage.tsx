import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  IdCard,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";
import {
  createCliente,
  createPoliza,
  deletePoliza,
  getCliente,
  listPolizas,
  updateCliente,
  updatePoliza,
} from "../lib/clientesRepo.ts";
import { subirDocumento } from "../lib/documentosRepo.ts";
import { TIPOS_SEGURO } from "../lib/types.ts";
import type { Cliente, Poliza, TipoSeguro, CoberturaAuto, FrecuenciaPago, ConductoPago } from "../lib/types.ts";
import type { ResultadoExtraccion } from "../lib/extraccionPoliza.ts";
import { calcularDiasRestantes } from "../lib/renovaciones.ts";
import { PolizaForm } from "../components/PolizaForm.tsx";
import type { PolizaFormValues } from "../components/PolizaForm.tsx";
import { SubirPolizaIA } from "../components/SubirPolizaIA.tsx";
import { DocumentosPoliza } from "../components/DocumentosPoliza.tsx";
import { RenovacionBadge } from "../components/RenovacionBadge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";
import { EmptyState } from "../components/EmptyState.tsx";

const clienteVacio: Omit<Cliente, "id"> = { nombre: "", cedula: "", telefono: "", email: "" };

function normalizarTextoComparacion(txt?: string): string {
  return (txt ?? "").trim().toLowerCase();
}

function buscarPolizaCandidataRenovacion(
  polizasExistentes: Poliza[],
  extraida: PolizaFormValues,
): Poliza | null {
  const candidatas = polizasExistentes.filter((p) => {
    const dias = calcularDiasRestantes(p.vigenciaFin);
    return dias !== null && dias <= 30;
  });

  const numExtraida = normalizarTextoComparacion(extraida.numeroPoliza);
  if (numExtraida) {
    const matchNumero = candidatas.find(
      (p) => normalizarTextoComparacion(p.numeroPoliza) === numExtraida,
    );
    if (matchNumero) return matchNumero;
  }

  const asex = normalizarTextoComparacion(extraida.aseguradora);
  const tipox = normalizarTextoComparacion(extraida.tipoSeguro);
  const detx = normalizarTextoComparacion(extraida.detalleBien);

  if (asex || detx) {
    const matchCombinacion = candidatas.find(
      (p) =>
        normalizarTextoComparacion(p.aseguradora) === asex &&
        normalizarTextoComparacion(p.tipoSeguro) === tipox &&
        normalizarTextoComparacion(p.detalleBien) === detx,
    );
    if (matchCombinacion) return matchCombinacion;
  }

  return null;
}

function polizaExtraidaAFormulario(poliza: ResultadoExtraccion["poliza"]): PolizaFormValues {
  const tipoSeguro = TIPOS_SEGURO.includes(poliza.tipoSeguro as TipoSeguro)
    ? (poliza.tipoSeguro as TipoSeguro)
    : "Otro";

  return {
    aseguradora: poliza.aseguradora,
    tipoSeguro,
    detalleBien: poliza.detalleBien,
    numeroPoliza: poliza.numeroPoliza,
    vigenciaInicio: poliza.vigenciaInicio,
    vigenciaFin: poliza.vigenciaFin,
    prima: poliza.prima,
    observaciones: poliza.observaciones,
    beneficios: poliza.beneficios,
    coberturaAuto: (poliza.coberturaAuto as CoberturaAuto) || undefined,
    frecuenciaPago: (poliza.frecuenciaPago as FrecuenciaPago) || undefined,
    conductoPago: (poliza.conductoPago as ConductoPago) || undefined,
    diaPago: poliza.diaPago || undefined,
    numeroCuotas: poliza.numeroCuotas || 1,
  };
}

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
  const [polizaRenovando, setPolizaRenovando] = useState<Poliza | null>(null);
  const [extraccionPoliza, setExtraccionPoliza] = useState<PolizaFormValues | null>(null);
  const [archivoPolizaExtraida, setArchivoPolizaExtraida] = useState<File | null>(null);

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
      .catch(() => {
        setError("No se pudo cargar la ficha del cliente. Revise su conexión e intente de nuevo.");
      })
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
    setError("");
    if (polizaEditando) {
      await updatePoliza(clienteId, polizaEditando.id, valores);
      if (archivoPolizaExtraida) {
        try {
          await subirDocumento(clienteId, polizaEditando.id, archivoPolizaExtraida, "poliza");
        } catch {
          setError(
            "La póliza se guardó correctamente, pero no se pudo adjuntar el PDF. Puede subirlo de nuevo desde los documentos de la póliza.",
          );
        }
      }
      setExtraccionPoliza(null);
      setArchivoPolizaExtraida(null);
      setPolizaRenovando(null);
    } else {
      const nuevaPolizaId = await createPoliza(clienteId, valores);
      if (archivoPolizaExtraida) {
        try {
          await subirDocumento(clienteId, nuevaPolizaId, archivoPolizaExtraida, "poliza");
        } catch {
          setError(
            "La póliza se guardó correctamente, pero no se pudo adjuntar el PDF. Puede subirlo de nuevo desde los documentos de la póliza.",
          );
        }
      }
      setExtraccionPoliza(null);
      setArchivoPolizaExtraida(null);
      setPolizaRenovando(null);
    }
    const listaPolizas = await listPolizas(clienteId);
    setPolizas(listaPolizas);
    setMostrarFormPoliza(false);
    setPolizaEditando(null);
    setPolizaRenovando(null);
  }

  function handleExtraccionNuevoCliente(resultado: ResultadoExtraccion, archivo: File): void {
    setDatos((previo) => ({
      nombre: resultado.cliente.nombre.trim() ? resultado.cliente.nombre : previo.nombre,
      cedula: resultado.cliente.cedula.trim() ? resultado.cliente.cedula : previo.cedula,
      telefono: resultado.cliente.telefono.trim() ? resultado.cliente.telefono : previo.telefono,
      email: resultado.cliente.email.trim() ? resultado.cliente.email : previo.email,
    }));
    setExtraccionPoliza(polizaExtraidaAFormulario(resultado.poliza));
    setArchivoPolizaExtraida(archivo);
  }

  function handleExtraccionParaPoliza(resultado: ResultadoExtraccion, archivo: File): void {
    const formValues = polizaExtraidaAFormulario(resultado.poliza);
    setExtraccionPoliza(formValues);
    setArchivoPolizaExtraida(archivo);

    const match = buscarPolizaCandidataRenovacion(polizas, formValues);
    if (match) {
      setPolizaEditando(match);
      setPolizaRenovando(match);
    } else {
      setPolizaEditando(null);
      setPolizaRenovando(null);
    }
    setMostrarFormPoliza(true);
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
    <section className="mx-auto max-w-4xl space-y-8">
      {/* Botón Volver y Encabezado */}
      <div>
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a clientes
        </Link>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {esNuevo ? "Nuevo cliente" : datos.nombre || "Ficha de cliente"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {esNuevo
                ? "Complete los datos del titular para registrar su ficha en el sistema."
                : "Información general de contacto y pólizas activas asociadas."}
            </p>
          </div>

          {!esNuevo && datos.cedula && (
            <Badge variant="outline" className="self-start font-mono text-xs sm:self-auto">
              <IdCard className="mr-1.5 size-3.5 text-muted-foreground" aria-hidden="true" />
              {datos.cedula}
            </Badge>
          )}
        </div>
      </div>

      {error ? <MensajeError>{error}</MensajeError> : null}

      {esNuevo ? <SubirPolizaIA onExtraido={handleExtraccionNuevoCliente} /> : null}

      {/* Tarjeta de Datos del Cliente */}
      <form
        onSubmit={handleGuardarDatos}
        className="rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="mb-5 flex items-center gap-2.5 border-b border-border/60 pb-3.5">
          <User className="size-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Datos del cliente
            </h2>
            <p className="text-xs text-muted-foreground">
              Información de contacto para notificaciones y renovaciones.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <span>
              Nombre completo <span className="text-destructive">*</span>
            </span>
            <Input
              required
              placeholder="Ej. Juan Pérez"
              value={datos.nombre}
              onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <span>
              Cédula / RIF <span className="text-destructive">*</span>
            </span>
            <Input
              required
              placeholder="Ej. V-12345678"
              value={datos.cedula}
              onChange={(e) => setDatos({ ...datos, cedula: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <span>
              Teléfono principal <span className="text-destructive">*</span>
            </span>
            <div className="relative">
              <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="tel"
                required
                className="pl-9"
                placeholder="Ej. +58 414 123 4567"
                value={datos.telefono}
                onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <span>Correo electrónico (opcional)</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                className="pl-9"
                placeholder="Ej. juan@correo.com"
                value={datos.email ?? ""}
                onChange={(e) => setDatos({ ...datos, email: e.target.value })}
              />
            </div>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end border-t border-border/60 pt-4">
          <Button type="submit" disabled={guardando}>
            <Save className="size-4" aria-hidden="true" />
            {guardando ? "Guardando…" : esNuevo ? "Crear cliente" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      {/* Sección de Pólizas (solo para clientes ya creados) */}
      {!esNuevo && clienteId ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">Pólizas asociadas</h2>
              <Badge variant="secondary" className="px-2 py-0 text-xs">
                {polizas.length}
              </Badge>
            </div>

            {!mostrarFormPoliza ? (
              <Button
                onClick={() => {
                  setPolizaEditando(null);
                  setPolizaRenovando(null);
                  setExtraccionPoliza(null);
                  setMostrarFormPoliza(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Agregar póliza
              </Button>
            ) : null}
          </div>

          <SubirPolizaIA onExtraido={handleExtraccionParaPoliza} />

          {mostrarFormPoliza ? (
            <div className="mt-2">
              {polizaRenovando ? (
                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
                    <div className="text-sm">
                      <p className="font-semibold text-amber-900">Renovación detectada</p>
                      <p className="mt-0.5 text-amber-800">
                        Esto parece renovar la póliza N°{" "}
                        <span className="font-mono font-semibold">{polizaRenovando.numeroPoliza}</span> que vencía
                        el <span className="font-semibold">{polizaRenovando.vigenciaFin}</span>. Se actualizará
                        esa póliza en vez de crear una nueva.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
                    onClick={() => {
                      setPolizaEditando(null);
                      setPolizaRenovando(null);
                    }}
                  >
                    Crear como nueva póliza
                  </Button>
                </div>
              ) : null}

              <PolizaForm
                inicial={extraccionPoliza ?? polizaEditando ?? undefined}
                esEdicion={Boolean(polizaEditando)}
                onGuardar={handleGuardarPoliza}
                onCancelar={() => {
                  setMostrarFormPoliza(false);
                  setPolizaEditando(null);
                  setPolizaRenovando(null);
                  setExtraccionPoliza(null);
                }}
              />
            </div>
          ) : null}

          {polizas.length === 0 && !mostrarFormPoliza ? (
            <EmptyState
              icono={ShieldAlert}
              titulo="Este cliente todavía no tiene pólizas"
              descripcion="Registre la primera póliza para comenzar a gestionar sus renovaciones y documentos."
              accion={
                <Button
                  onClick={() => {
                    setPolizaEditando(null);
                    setPolizaRenovando(null);
                    setExtraccionPoliza(null);
                    setMostrarFormPoliza(true);
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Agregar póliza
                </Button>
              }
            />
          ) : null}

          <div className="grid gap-4">
            {polizas.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-card p-5 shadow-xs transition-shadow duration-150 hover:shadow-sm sm:p-6"
              >
                {/* Cabecera de la Póliza */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg font-bold tracking-tight text-foreground">
                        {p.aseguradora} · {p.tipoSeguro}
                      </h3>
                      <RenovacionBadge vigenciaFin={p.vigenciaFin} />
                    </div>
                    <p className="mt-1 font-mono text-xs font-semibold text-muted-foreground">
                      Póliza N° {p.numeroPoliza}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPolizaEditando(p);
                        setPolizaRenovando(null);
                        setExtraccionPoliza(null);
                        setMostrarFormPoliza(true);
                      }}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleEliminarPoliza(p.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Eliminar
                    </Button>
                  </div>
                </div>

                {/* Grilla de Detalles */}
                <div className="mt-4 grid gap-3 rounded-lg bg-muted/30 p-3.5 text-xs text-foreground sm:grid-cols-3 sm:text-sm">
                  <div>
                    <span className="block text-xs font-medium text-muted-foreground">Bien asegurado</span>
                    <span className="mt-0.5 font-medium">{p.detalleBien || "—"}</span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-muted-foreground">Vigencia</span>
                    <span className="mt-0.5 inline-flex items-center gap-1 font-medium">
                      <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {p.vigenciaInicio} al {p.vigenciaFin}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-muted-foreground">Prima anual</span>
                    <span className="mt-0.5 inline-flex items-center font-semibold text-foreground">
                      <DollarSign className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {p.prima.toLocaleString("es", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {p.observaciones && (
                    <div className="sm:col-span-3 border-t border-border/40 pt-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Observaciones: </span>
                      <span className="text-foreground">{p.observaciones}</span>
                    </div>
                  )}

                  {p.beneficios && (
                    <div className="sm:col-span-3 border-t border-border/40 pt-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Beneficios: </span>
                      <span className="text-foreground">{p.beneficios}</span>
                    </div>
                  )}
                </div>

                {/* Documentos de la póliza */}
                <DocumentosPoliza clienteId={clienteId} polizaId={p.id} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

