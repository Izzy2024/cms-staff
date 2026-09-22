import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, Lock, Shield } from "lucide-react";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";

type EstadoEnlace = "verificando" | "listo" | "invalido";

export function DefinirContrasenaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const { user, loading } = useAuth();

  const [estado, setEstado] = useState<EstadoEnlace>("verificando");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const verificacionIniciada = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (tokenHash && (type === "invite" || type === "recovery")) {
      // El token es de un solo uso: en StrictMode el efecto corre dos veces, así que
      // garantizamos una sola llamada a verifyOtp con este ref.
      if (verificacionIniciada.current) return;
      verificacionIniciada.current = true;
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type })
        .then(({ error: verifyError }) => {
          if (!verifyError) {
            setEstado("listo");
            return;
          }
          supabase.auth
            .getSession()
            .then(({ data }) => setEstado(data.session ? "listo" : "invalido"))
            .catch(() => setEstado("invalido"));
        })
        .catch(() => setEstado("invalido"));
      return;
    }

    setEstado(user ? "listo" : "invalido");
  }, [loading, tokenHash, type, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden. Verifique ambas.");
      return;
    }

    setEnviando(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      if (updateError.code === "same_password") {
        setError("La nueva contraseña debe ser distinta a la anterior.");
      } else if (updateError.code === "weak_password") {
        setError("La contraseña es muy débil. Use al menos 8 caracteres combinando letras y números.");
      } else {
        setError("No se pudo actualizar la contraseña. Intente de nuevo.");
      }
      setEnviando(false);
      return;
    }

    navigate("/dashboard", { replace: true });
  }

  if (loading || estado === "verificando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50/50">
        <Cargando mensaje="Verificando el enlace…" />
      </div>
    );
  }

  const esInvalido = estado === "invalido";

  return (
    <div className="flex min-h-screen w-full flex-col justify-center bg-zinc-50/60 px-4 py-12 dark:bg-background">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Shield className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
            {esInvalido ? "Enlace no disponible" : "Definir contraseña"}
          </h1>
          <p className="mt-1.5 text-base text-muted-foreground">
            {esInvalido
              ? "No pudimos validar su enlace de acceso."
              : "Cree una contraseña segura para acceder a su cuenta."}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-xs sm:p-8">
          {esInvalido ? (
            <div className="flex flex-col gap-5">
              <MensajeError>
                El enlace no es válido o ya venció. Pida uno nuevo desde «¿Olvidó su contraseña?» en la
                pantalla de inicio de sesión.
              </MensajeError>
              <Button
                size="lg"
                nativeButton={false}
                render={<Link to="/login" />}
                className="w-full font-semibold shadow-xs"
              >
                Volver a iniciar sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                <span>Nueva contraseña</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                <span>Confirmar contraseña</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </label>

              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres. Recomendamos combinar letras y números.
              </p>

              {error ? <MensajeError>{error}</MensajeError> : null}

              <Button
                type="submit"
                size="lg"
                disabled={enviando}
                className="mt-2 w-full font-semibold shadow-xs"
              >
                <KeyRound aria-hidden="true" />
                {enviando ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </form>
          )}

          {!esInvalido ? (
            <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <Lock className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Acceso seguro para agentes autorizados</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
