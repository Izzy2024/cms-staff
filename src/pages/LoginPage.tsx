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
import familia from "../assets/familia.webp";

// Grano de papel en SVG (feTurbulence) para que el dibujo parezca hecho sobre papel
const GRANO_PAPEL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .28 0 0 0 0 .18 0 0 0 .45 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

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
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modo, setModo] = useState<"ingresar" | "recuperar">("ingresar");
  const [mensajeEnvio, setMensajeEnvio] = useState("");

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
    setMensajeEnvio(
      "Si el correo está registrado, recibirá un enlace para definir una nueva contraseña.",
    );
  }

  return (
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-2">
      {/* Mitad ilustrada: el dibujo a lápiz sobre papel cálido, como página de álbum */}
      <aside className="sticky top-0 hidden h-screen flex-col overflow-hidden bg-[#efe6d5] text-[#3b2f24] lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-50 mix-blend-multiply"
          style={{ backgroundImage: GRANO_PAPEL }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_50%,rgb(110_80_45/0.22))]" />
        <div className="pointer-events-none absolute inset-6 rounded-[3px] border border-[#3b2f24]/15" />

        <div className="relative px-14 pt-16 animate-in fade-in duration-700 motion-reduce:animate-none xl:px-20 xl:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3b2f24]/60">
            Empresa familiar
          </p>
          <p className="mt-5 font-serif text-4xl leading-[1.15] font-normal">
            Cuidamos a su familia <em className="block italic">como a la nuestra.</em>
          </p>
        </div>

        <div className="relative min-h-0 flex-1 px-12 pt-6 pb-10">
          <div className="absolute inset-x-[18%] bottom-9 h-8 rounded-[50%] bg-[#3b2f24]/20 blur-xl" />
          <img
            src={familia}
            alt="Dibujo a lápiz de la familia"
            className="relative h-full w-full object-contain object-bottom mix-blend-multiply animate-in fade-in slide-in-from-bottom-4 duration-1000 motion-reduce:animate-none"
          />
        </div>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield className="size-5" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Staff Seguros
            </h1>
          </div>

          <div className="mt-12">
            {modo === "ingresar" ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
                <div className="mb-2">
                  <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground">
                    Le damos la bienvenida
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ingrese para gestionar su cartera y renovaciones.
                  </p>
                </div>

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

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMensajeEnvio("");
                    setModo("recuperar");
                  }}
                  className="self-center text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  ¿Olvidó su contraseña?
                </button>
              </form>
            ) : (
              <form onSubmit={handleEnviarEnlace} className="flex flex-col gap-4.5">
                <div className="mb-2">
                  <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground">
                    Recuperar contraseña
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Le enviaremos un enlace a su correo para definir una nueva contraseña.
                  </p>
                </div>

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

                {mensajeEnvio ? (
                  <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/50 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">{mensajeEnvio}</p>
                  </div>
                ) : null}

                {error ? <MensajeError>{error}</MensajeError> : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="mt-2 w-full font-semibold shadow-xs"
                >
                  <Send aria-hidden="true" />
                  {submitting ? "Enviando…" : "Enviar enlace"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setError("");
                    setMensajeEnvio("");
                    setModo("ingresar");
                  }}
                  className="w-full font-medium"
                >
                  Volver a iniciar sesión
                </Button>
              </form>
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
