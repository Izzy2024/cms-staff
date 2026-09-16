import { Link, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase.ts";
import { useAuth } from "../auth/AuthContext.tsx";

export function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await signOut(auth);
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid #e5e4e7",
        }}
      >
        <nav style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <strong>CMS Seguros</strong>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {user?.email ? <span>{user.email}</span> : null}
          <button type="button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main style={{ padding: "24px 20px", maxWidth: "960px", width: "100%", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
