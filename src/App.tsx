import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import WorkerPage from "./features/worker/WorkerPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import LoginPage from "./features/auth/LoginPage";
import { leerSesion, cerrarSesion } from "./config/sesion";
import type { Usuario } from "./types";

export default function App() {
  const [user, setUser] = useState<Usuario | null>(null);

  useEffect(() => {
    setUser(leerSesion());
  }, []);

  const handleLogin = (u: Usuario) => setUser(u);

  const handleLogout = () => {
    cerrarSesion();
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          user.role === "boss"
            ? <Navigate to="/dashboard" replace />
            : <WorkerPage user={user} onLogout={handleLogout} />
        } />
        <Route
          path="/dashboard/*"
          element={
            user.role === "admin" || user.role === "boss"
              ? <DashboardPage user={user} onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />
        <Route path="/app" element={<WorkerPage user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
