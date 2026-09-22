import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { Layout } from "./components/Layout.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { DefinirContrasenaPage } from "./pages/DefinirContrasenaPage.tsx";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage.tsx").then((m) => ({ default: m.DashboardPage })),
);
const ClientesPage = lazy(() =>
  import("./pages/ClientesPage.tsx").then((m) => ({ default: m.ClientesPage })),
);
const ClienteDetailPage = lazy(() =>
  import("./pages/ClienteDetailPage.tsx").then((m) => ({ default: m.ClienteDetailPage })),
);
const ImportarPage = lazy(() =>
  import("./pages/ImportarPage.tsx").then((m) => ({ default: m.ImportarPage })),
);
const PerfilPage = lazy(() =>
  import("./pages/PerfilPage.tsx").then((m) => ({ default: m.PerfilPage })),
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/definir-contrasena" element={<DefinirContrasenaPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/nuevo" element={<ClienteDetailPage />} />
            <Route path="/clientes/:clienteId" element={<ClienteDetailPage />} />
            <Route path="/importar" element={<ImportarPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
