import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { Lock, LogIn, Shield } from "lucide-react";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";

function getErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "El correo o la contraseña no son correctos.";
    case "email_not_confirmed":
      return "Debe confirmar su correo antes de iniciar sesión.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Demasiados intentos seguidos. Espere unos minutos e intente de nuevo.";
    default:
      return "No se pudo iniciar sesión. Intente de nuevo.";
  }
}

export function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50/50">
        <Cargando mensaje="Iniciando aplicación…" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(getErrorMessage(signInError.code));
      setSubmitting(false);
      return;
    }
    const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    navigate(from, { replace: true });
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen w-full flex-col justify-center bg-zinc-50/60 px-4 py-12 dark:bg-background">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Shield className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
            CMS Seguros
          </h1>
          <p className="mt-1.5 text-base text-muted-foreground">
            Portal de gestión de cartera y renovaciones
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-xs sm:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              <span>Correo electrónico</span>
              <Input
                type="email"
                autoComplete="email"
                required
                placeholder="agente@seguros.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              <span>Contraseña</span>
              <Input
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error ? <MensajeError>{error}</MensajeError> : null}

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-2 w-full font-semibold shadow-xs"
            >
              <LogIn aria-hidden="true" />
              {submitting ? "Iniciando sesión…" : "Ingresar"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            <span>Acceso seguro para agentes autorizados</span>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link
            to="/dashboard"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Ir al panel
          </Link>{" "}
          (requiere iniciar sesión)
        </p>
      </div>
    </div>
  );
}
