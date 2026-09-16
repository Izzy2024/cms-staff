import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "../lib/firebase.ts";
import { useAuth } from "../auth/AuthContext.tsx";

function getErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Intente de nuevo más tarde.";
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

  if (!loading && user) {
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
    <div style={{ maxWidth: "420px", margin: "48px auto", padding: "0 20px" }}>
      <h1>CMS Seguros</h1>
      <p>Inicie sesión para continuar.</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          Correo electrónico
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ fontSize: "18px", padding: "12px" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ fontSize: "18px", padding: "12px" }}
          />
        </label>
        {error ? (
          <p role="alert" style={{ color: "#b00020" }}>
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={submitting} style={{ fontSize: "18px", padding: "14px" }}>
          {submitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
      <p style={{ marginTop: "16px" }}>
        <Link to="/dashboard">Ir al dashboard</Link> (requiere sesión)
      </p>
    </div>
  );
}
