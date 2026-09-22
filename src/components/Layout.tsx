import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  LogOut,
  Menu,
  Shield,
  Upload,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { Button } from "./ui/button.tsx";
import { Cargando } from "./Cargando.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { cn } from "../lib/utils.ts";

const ENLACES = [
  { to: "/dashboard", label: "Renovaciones", Icono: CalendarClock },
  { to: "/clientes", label: "Clientes", Icono: Users },
  { to: "/importar", label: "Importar Excel", Icono: Upload },
  { to: "/perfil", label: "Perfil", Icono: UserIcon },
];

function clasesEnlace(isActive: boolean, tamano: string): string {
  return cn(
    "flex items-center gap-2.5 rounded-lg px-3.5 font-medium transition-all duration-150",
    tamano,
    isActive
      ? "bg-foreground text-background shadow-xs font-semibold"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  async function handleLogout(): Promise<void> {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  function cerrarMenu(): void {
    setMenuAbierto(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50/60 dark:bg-background">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            to="/dashboard"
            onClick={cerrarMenu}
            className="group inline-flex min-h-11 items-center gap-2.5 transition-transform active:scale-98"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs transition-colors group-hover:bg-primary/90">
              <Shield className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-foreground">
                CMS Seguros
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1.5 md:flex" aria-label="Navegación principal">
            {ENLACES.map(({ to, label, Icono }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => clasesEnlace(isActive, "h-10 text-base")}
              >
                <Icono className="size-4.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user?.email ? (
              <Link
                to="/perfil"
                className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={`Perfil: ${user.email}`}
              >
                <UserIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="max-w-40 truncate">{user.user_metadata?.nombre || user.email}</span>
              </Link>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleLogout()}
              className="text-muted-foreground hover:text-foreground"
            >
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
            className="flex size-11 items-center justify-center rounded-lg border border-input bg-background text-foreground shadow-2xs transition-colors hover:bg-muted md:hidden"
          >
            {menuAbierto ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {menuAbierto ? (
          <div id="menu-movil" className="border-t border-border bg-background px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1.5" aria-label="Navegación principal">
              {ENLACES.map(({ to, label, Icono }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={cerrarMenu}
                  className={({ isActive }) => clasesEnlace(isActive, "h-12 text-base")}
                >
                  <Icono className="size-5" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}

              <div className="mt-2 flex flex-col gap-3 border-t border-border/80 pt-3">
                {user?.email ? (
                  <Link
                    to="/perfil"
                    onClick={cerrarMenu}
                    className="flex items-center gap-2 px-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <UserIcon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{user.user_metadata?.nombre || user.email}</span>
                  </Link>
                ) : null}
                <Button variant="outline" className="w-full justify-center" onClick={() => void handleLogout()}>
                  <LogOut aria-hidden="true" />
                  Cerrar sesión
                </Button>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<Cargando mensaje="Cargando…" />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="border-t border-border/60 bg-background/50 py-4 text-center text-xs text-muted-foreground">
        CMS Seguros · Sistema de Gestión de Cartera
      </footer>
    </div>
  );
}
