import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { LogIn } from "lucide-react";
import { auth } from "../lib/firebase.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Cargando } from "../components/Cargando.tsx";
import { MensajeError } from "../components/MensajeError.tsx";

function getErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "El correo o la contraseña no son correctos.";
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/too-many-requests":
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
      <div className="flex min-h-screen items-center justify-center">
        <Cargando mensaje="Cargando…" />
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
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err.code));
      } else {
        setError("No se pudo iniciar sesión. Intente de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <h1 className="text-3xl font-bold text-foreground">CMS Seguros</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Escriba su correo y contraseña para entrar.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-base font-medium text-foreground">
            Correo electrónico
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-base font-medium text-foreground">
            Contraseña
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? <MensajeError>{error}</MensajeError> : null}

          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            <LogIn aria-hidden="true" />
            {submitting ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>

      <p className="mt-3 text-center text-base text-muted-foreground">
        <Link
          to="/dashboard"
          className="inline-flex min-h-11 items-center px-2 font-medium text-foreground underline underline-offset-4"
        >
          Ir a renovaciones
        </Link>{" "}
        (requiere iniciar sesión)
      </p>
    </div>
  );
}
