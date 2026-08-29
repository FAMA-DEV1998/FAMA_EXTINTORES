import { useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import { useArchivedManager, useUsersManagement } from "../hooks/dashboard";
import { UsersModal, ArchivedModal, CatalogModal } from "../components/modals";
import EmpresasListPage from "./dashboard/EmpresasListPage";
import EmpresaLayout from "./dashboard/EmpresaLayout";
import ExtintoresView from "./dashboard/ExtintoresView";
import HistorialMesesView from "./dashboard/HistorialMesesView";
import HistorialMesRegistrosView from "./dashboard/HistorialMesRegistrosView";
import HistorialRegistroView from "./dashboard/HistorialRegistroView";
import SedesView from "./dashboard/SedesView";
import InventarioPage from "./dashboard/InventarioPage";
import CotizacionesPage from "./dashboard/CotizacionesPage";
import AlertasPage from "./dashboard/AlertasPage";
import VozAprendizajePage from "./dashboard/VozAprendizajePage";
import { useAlertasBadge } from "../hooks/dashboard/useAlertas";

export default function DashboardPage({ user, onLogout }: { user: { id: string; username: string; role: string; displayName: string }; onLogout: () => void }) {
  const { socket, connected, catalogs } = useSocket(user.id, onLogout);
  const location = useLocation();

  const [catalogModal, setCatalogModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const archived = useArchivedManager(socket, user.role);
  const {
    archivedView, setArchivedView, archivedEmpresas, archivedExtintores, archivedInventario, archivedCotizaciones,
    archivedTab, setArchivedTab, loadingArchived, expandedArchived, setExpandedArchived,
    openArchivedView, restoreEmpresa, hardDeleteEmpresa, restoreExtintor, hardDeleteExtintor,
    restoreInventario, hardDeleteInventario, restoreCotizacion, hardDeleteCotizacion,
  } = archived;

  const usersManagement = useUsersManagement(socket, user.role);
  const {
    usersModal, setUsersModal, usersList, userForm, setUserForm,
    editingUserId, setEditingUserId, savingUser, userError,
    openUsersModal, saveUser, deleteUser,
  } = usersManagement;

  const enSeccionAlterna = location.pathname.startsWith("/dashboard/inventario") || location.pathname.startsWith("/dashboard/cotizaciones") || location.pathname.startsWith("/dashboard/alertas") || location.pathname.startsWith("/dashboard/voz");

  const totalAlertas = useAlertasBadge(socket);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-500/30 pb-10"
      style={{ fontFamily: "'Instrument Sans', 'SF Pro Display', system-ui, sans-serif" }}>

      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-zinc-950/80 border-b border-zinc-800/60 shadow-sm">
        <div className="max-w-480 mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {location.pathname !== "/dashboard" && (
              <Link to="/dashboard"
                className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center transition-all text-zinc-400 hover:text-white shadow-sm hover:shadow-md active:scale-95"
                title="Volver al directorio">
                ‹
              </Link>
            )}
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-[3px] text-white leading-none">FAMA</h1>
                <p className="text-[9px] font-bold tracking-[4px] uppercase text-red-500 mt-0.5">Dashboard</p>
              </div>
              <div className="h-7 w-px bg-zinc-800 mx-1 sm:mx-2 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-zinc-600"}`} />
                <span className="text-[11px] text-zinc-400 font-semibold tracking-wide">
                  {connected ? "En línea" : "Desconectado"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 mr-2">
              {user.role === "boss" && (
                <button onClick={openUsersModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-2">
                  👥 Usuarios
                </button>
              )}

              {(user.role === "boss" || user.role === "admin") && (
                <button onClick={() => setCatalogModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-2">
                  📖 Catálogos
                </button>
              )}

              {(user.role === "boss" || user.role === "admin") && (
                <button onClick={openArchivedView}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-2">
                  🗂️ Archivados
                </button>
              )}
              <a href="/app"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 hover:border-red-800/50 transition-all flex items-center gap-2">
                🧯 Ir a App Móvil
              </a>
            </div>

            <div className="h-7 w-px bg-zinc-800 mx-1 hidden sm:block" />

            <div className="flex items-center gap-3 pl-1 sm:pl-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-zinc-200 leading-none">{user.displayName}</p>
                <p className="text-[10px] font-black uppercase tracking-widest mt-1 leading-none" style={{
                  color: user.role === "boss" ? "#f87171" : "#fbbf24"
                }}>{user.role}</p>
              </div>
              <button onClick={onLogout}
                className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-900/50 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all text-sm active:scale-95 shadow-sm"
                title="Cerrar sesión">
                ⏻
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-480 mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row gap-6">
        <aside className={`shrink-0 flex md:flex-col gap-2 transition-all md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-7rem)] md:overflow-y-auto ${sidebarOpen ? "md:w-56" : "md:w-14"}`}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden md:flex px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-white hover:bg-zinc-900/50 border border-transparent items-center gap-2"
            title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
          >
            {sidebarOpen ? "« Ocultar" : "»"}
          </button>
          <Link
            to="/dashboard"
            title="Registro Extintores"
            className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${!enSeccionAlterna ? "bg-red-950/30 text-red-400 border border-red-900/50" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50 border border-transparent"}`}
          >
            🧯 {sidebarOpen && "Registro Extintores"}
          </Link>
          <Link
            to="/dashboard/inventario"
            title="Inventario"
            className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${location.pathname.startsWith("/dashboard/inventario") ? "bg-red-950/30 text-red-400 border border-red-900/50" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50 border border-transparent"}`}
          >
            📦 {sidebarOpen && "Inventario"}
          </Link>
          <Link
            to="/dashboard/cotizaciones"
            title="Cotizaciones"
            className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${location.pathname.startsWith("/dashboard/cotizaciones") ? "bg-red-950/30 text-red-400 border border-red-900/50" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50 border border-transparent"}`}
          >
            🧾 {sidebarOpen && "Cotizaciones"}
          </Link>
          <Link
            to="/dashboard/alertas"
            title="Alertas de Vencimiento"
            className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${location.pathname.startsWith("/dashboard/alertas") ? "bg-red-950/30 text-red-400 border border-red-900/50" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50 border border-transparent"}`}
          >
            🔔 {sidebarOpen && "Alertas"}
            {totalAlertas > 0 && (
              <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                {totalAlertas > 99 ? "99+" : totalAlertas}
              </span>
            )}
          </Link>
          <Link
            to="/dashboard/voz"
            title="Aprendizaje de Dictado por Voz"
            className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${location.pathname.startsWith("/dashboard/voz") ? "bg-red-950/30 text-red-400 border border-red-900/50" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50 border border-transparent"}`}
          >
            🎤 {sidebarOpen && "Dictado por Voz"}
          </Link>
        </aside>
        <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<EmpresasListPage socket={socket} role={user.role} catalogs={catalogs} />} />
          <Route path="inventario" element={<InventarioPage socket={socket} catalogs={catalogs} userRole={user.role} />} />
          <Route path="cotizaciones" element={<CotizacionesPage socket={socket} />} />
          <Route path="alertas" element={<AlertasPage socket={socket} />} />
          <Route path="voz" element={<VozAprendizajePage socket={socket} catalogs={catalogs} />} />
          <Route path=":empresaSlug" element={<EmpresaLayout socket={socket} catalogs={catalogs} user={user} />}>
            <Route index element={<Navigate to="extintores" replace />} />
            <Route path="extintores" element={<ExtintoresView />} />
            <Route path="historial" element={<HistorialMesesView />} />
            <Route path="historial/:anio/:mes" element={<HistorialMesRegistrosView />} />
            <Route path="historial/:anio/:mes/:registroId" element={<HistorialRegistroView />} />
            <Route path="sedes" element={<SedesView />} />
            <Route path="sedes/:sedeSlug">
              <Route index element={<Navigate to="extintores" replace />} />
              <Route path="extintores" element={<ExtintoresView />} />
              <Route path="historial" element={<HistorialMesesView />} />
              <Route path="historial/:anio/:mes" element={<HistorialMesRegistrosView />} />
              <Route path="historial/:anio/:mes/:registroId" element={<HistorialRegistroView />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <UsersModal isOpen={usersModal} onClose={() => setUsersModal(false)} usersList={usersList} userForm={userForm} setUserForm={setUserForm} editingUserId={editingUserId} setEditingUserId={setEditingUserId} savingUser={savingUser} userError={userError} onSave={saveUser} onDelete={deleteUser} />
        <ArchivedModal
          isOpen={archivedView}
          onClose={() => setArchivedView(false)}
          tab={archivedTab}
          setTab={setArchivedTab}
          empresas={archivedEmpresas}
          extintores={archivedExtintores}
          inventario={archivedInventario}
          cotizaciones={archivedCotizaciones}
          loading={loadingArchived}
          expanded={expandedArchived}
          setExpanded={setExpandedArchived}
          onRestoreEmpresa={restoreEmpresa}
          onHardDeleteEmpresa={hardDeleteEmpresa}
          onRestoreExtintor={restoreExtintor}
          onHardDeleteExtintor={hardDeleteExtintor}
          onRestoreInventario={restoreInventario}
          onHardDeleteInventario={hardDeleteInventario}
          onRestoreCotizacion={restoreCotizacion}
          onHardDeleteCotizacion={hardDeleteCotizacion}
          userRole={user.role}
        />
        <CatalogModal
          isOpen={catalogModal}
          onClose={() => setCatalogModal(false)}
          catalogs={catalogs}
          socket={socket}
          userRole={user.role}
        />
        </div>
      </main>
    </div>
  );
}