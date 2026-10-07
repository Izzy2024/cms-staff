import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, Navigate, Link } from "react-router-dom";
import { CheckCircle2, Lock, LogIn, Send, Shield } from "lucide-react";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";
import { PanelIlustrado } from "../components/PanelIlustrado.tsx";

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

function CampoCorreo({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      <span>Correo electrónico</span>
      <Input
        type="email"
        autoComplete="email"
        required
        placeholder="agente@seguros.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FormularioIngreso({
  email,
  onEmailChange,
  onSwitchRecuperar,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  onSwitchRecuperar: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
      <div className="mb-2">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground">Le damos la bienvenida</h2>
        <p className="mt-2 text-sm text-muted-foreground">Ingrese para gestionar su cartera y renovaciones.</p>
      </div>

      <CampoCorreo value={email} onChange={onEmailChange} />

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

      <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full font-semibold shadow-xs">
        <LogIn aria-hidden="true" />
        {submitting ? "Iniciando sesión…" : "Ingresar"}
      </Button>

      <button
        type="button"
        onClick={onSwitchRecuperar}
        className="self-center text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        ¿Olvidó su contraseña?
      </button>
    </form>
  );
}

function FormularioRecuperar({
  email,
  onEmailChange,
  onSwitchIngresar,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  onSwitchIngresar: () => void;
}) {
  const [error, setError] = useState("");
  const [mensajeEnvio, setMensajeEnvio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleEnviarEnlace(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setMensajeEnvio("");
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/definir-contrasena`,
    });
    setSubmitting(false);
    if (resetError && resetError.code === "over_email_send_rate_limit") {
      setError(getErrorMessage(resetError.code));
      return;
    }
    setMensajeEnvio("Si el correo está registrado, recibirá un enlace para definir una nueva contraseña.");
  }

  return (
    <form onSubmit={handleEnviarEnlace} className="flex flex-col gap-4.5">
      <div className="mb-2">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground">Recuperar contraseña</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le enviaremos un enlace a su correo para definir una nueva contraseña.
        </p>
      </div>

      <CampoCorreo value={email} onChange={onEmailChange} />

      {mensajeEnvio ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">{mensajeEnvio}</p>
        </div>
      ) : null}

      {error ? <MensajeError>{error}</MensajeError> : null}

      <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full font-semibold shadow-xs">
        <Send aria-hidden="true" />
        {submitting ? "Enviando…" : "Enviar enlace"}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onSwitchIngresar}
        className="w-full font-medium"
      >
        Volver a iniciar sesión
      </Button>
    </form>
  );
}

export function LoginPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [modo, setModo] = useState<"ingresar" | "recuperar">("ingresar");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Cargando mensaje="Iniciando aplicación…" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-2">
      <PanelIlustrado />

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield className="size-5" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Staff Seguros</h1>
          </div>

          <div className="mt-12">
            {modo === "ingresar" ? (
              <FormularioIngreso
                email={email}
                onEmailChange={setEmail}
                onSwitchRecuperar={() => setModo("recuperar")}
              />
            ) : (
              <FormularioRecuperar
                email={email}
                onEmailChange={setEmail}
                onSwitchIngresar={() => setModo("ingresar")}
              />
            )}

            <div className="mt-8 flex items-center justify-center gap-1.5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
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
      </main>
    </div>
  );
}
