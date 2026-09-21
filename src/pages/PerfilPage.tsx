import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Mail, Save, User as UserIcon, Shield } from "lucide-react";
import { useAuth } from "../auth/AuthContext.tsx";
import { supabase } from "../lib/supabase.ts";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { MensajeError } from "../components/MensajeError.tsx";

export function PerfilPage() {
  const { user } = useAuth();
  const [nombre, setNombre] = useState(
    (user?.user_metadata?.nombre as string) ?? "",
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.nombre) {
      setNombre(user.user_metadata.nombre as string);
    }
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setExito(false);
    setGuardando(true);
    try {
      const { error: err } = await supabase.auth.updateUser({
        data: { nombre: nombre.trim() },
      });
      if (err) throw err;
      setExito(true);
    } catch {
      setError("No se pudo actualizar el perfil. Intente de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserIcon className="size-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Perfil de usuario
              </h1>
              <Badge variant="secondary">Corredor</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Datos personales y de contacto de su cuenta en el CRM.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2.5">
            <Shield className="size-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Información de la cuenta
              </h2>
              <p className="text-xs text-muted-foreground">
                Actualice su nombre visible y consulte su rol asignado.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <span>
              Nombre para mostrar <span className="text-destructive">*</span>
            </span>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                required
                className="pl-9"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setExito(false);
                }}
                placeholder="Ej. Isaac Castillo"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <span>Correo electrónico (solo lectura)</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                readOnly
                tabIndex={-1}
                className="cursor-not-allowed bg-muted/50 pl-9 text-muted-foreground"
                value={user?.email ?? ""}
                placeholder="correo@ejemplo.com"
                aria-label="Correo electrónico del usuario"
              />
            </div>
          </label>

          <div className="flex flex-col gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
            <span>Rol en el sistema</span>
            <div>
              <Badge variant="secondary" className="px-3 py-1 font-semibold">
                Corredor
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Cuenta individual con acceso de Corredor de seguros.
            </p>
          </div>
        </div>

        {error ? <MensajeError className="mt-4">{error}</MensajeError> : null}

        {exito ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            Perfil actualizado correctamente. Los cambios han sido guardados.
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end border-t border-border/60 pt-4">
          <Button type="submit" disabled={guardando}>
            <Save className="size-4" aria-hidden="true" />
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </section>
  );
}
