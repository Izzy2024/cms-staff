import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { CalendarClock, LogOut, Menu, Upload, Users, X } from "lucide-react";
import { auth } from "../lib/firebase.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { Button } from "./ui/button.tsx";
import { cn } from "../lib/utils.ts";

const ENLACES = [
  { to: "/dashboard", label: "Renovaciones", Icono: CalendarClock },
  { to: "/clientes", label: "Clientes", Icono: Users },
  { to: "/importar", label: "Importar Excel", Icono: Upload },
];

function clasesEnlace(isActive: boolean, tamano: string): string {
  return cn(
    "flex items-center gap-3 rounded-lg px-4 font-medium transition-colors",
    tamano,
    isActive
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  async function handleLogout(): Promise<void> {
    await signOut(auth);
    navigate("/login", { replace: true });
  }

  function cerrarMenu(): void {
    setMenuAbierto(false);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/dashboard"
            onClick={cerrarMenu}
            className="inline-flex min-h-11 items-center text-xl font-bold text-foreground"
          >
            CMS Seguros
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
            {ENLACES.map(({ to, label, Icono }) => (
              <NavLink key={to} to={to} className={({ isActive }) => clasesEnlace(isActive, "h-11 text-base")}>
                <Icono className="size-5" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user?.email ? (
              <span className="hidden max-w-48 truncate text-base text-muted-foreground lg:inline" title={user.email}>
                {user.email}
              </span>
            ) : null}
            <Button variant="outline" onClick={() => void handleLogout()}>
              <LogOut aria-hidden="true" />
              Cerrar sesión
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            className="flex size-12 items-center justify-center rounded-lg border border-input text-foreground transition-colors hover:bg-muted md:hidden"
          >
            {menuAbierto ? (
              <X className="size-6" aria-hidden="true" />
            ) : (
              <Menu className="size-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {menuAbierto ? (
          <div id="menu-movil" className="border-t border-border md:hidden">
            <nav className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-3" aria-label="Navegación principal">
              {ENLACES.map(({ to, label, Icono }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={cerrarMenu}
                  className={({ isActive }) => clasesEnlace(isActive, "h-12 text-lg")}
                >
                  <Icono className="size-5" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}

              <div className="mt-2 flex flex-col gap-3 border-t border-border pt-3">
                {user?.email ? (
                  <span className="truncate px-4 text-base text-muted-foreground">{user.email}</span>
                ) : null}
                <Button variant="outline" className="w-full" onClick={() => void handleLogout()}>
                  <LogOut aria-hidden="true" />
                  Cerrar sesión
                </Button>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
