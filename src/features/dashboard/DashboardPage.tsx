import { useState } from "react";
import { Archive, Bell, BookOpen, ChevronLeft, DatabaseBackup, LoaderCircle, FireExtinguisher, LogOut, Mic, Package, PanelLeftClose, PanelLeftOpen, Receipt, Smartphone, Users, type LucideIcon } from "lucide-react";
import Notificaciones from "../../components/ui/Notificaciones";
import type { Usuario } from "../../types";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import { useArchivados } from "./administracion/useArchivados";
import { useUsuarios } from "./administracion/useUsuarios";
import { useRespaldo } from "./administracion/useRespaldo";
import UsuariosModal from "./administracion/UsuariosModal";
import ArchivadosModal from "./administracion/ArchivadosModal";
import CatalogosModal from "./administracion/CatalogosModal";
import EmpresasPage from "./empresas/EmpresasPage";
import EmpresaLayout from "./empresas/EmpresaLayout";
import ExtintoresPage from "./extintores/ExtintoresPage";
import HistorialPage from "./historial/HistorialPage";
import HistorialMesPage from "./historial/HistorialMesPage";
import ServicioDetallePage from "./historial/ServicioDetallePage";
import CertificadosPage from "./certificados/CertificadosPage";
import SedesPage from "./sedes/SedesPage";
import InventarioPage from "./inventario/InventarioPage";
import CotizacionesPage from "./cotizaciones/CotizacionesPage";
import AlertasPage from "./alertas/AlertasPage";
import VozAprendizajePage from "./voz/VozAprendizajePage";
import { useAlertasBadge } from "./alertas/useAlertas";

const SIDEBAR_KEY = "fama_dashboard_sidebar";

const botonCabecera = "px-2.5 lg:px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-2";

export default function DashboardPage({ user, onLogout }: { user: Usuario; onLogout: () => void }) {
  const { socket, connected, catalogs } = useSocket(user.id, onLogout);
  const location = useLocation();

  const [catalogModal, setCatalogModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) !== "0"; } catch { return true; }
  });
  const alternarSidebar = () => setSidebarOpen((v) => {
    try { localStorage.setItem(SIDEBAR_KEY, v ? "0" : "1"); } catch { }
    return !v;
  });

  const archived = useArchivados(socket, user.role);
  const respaldo = useRespaldo(socket);
  const {
    archivedView, setArchivedView, archivedEmpresas, archivedExtintores, archivedInventario, archivedCotizaciones,
    archivedTab, setArchivedTab, loadingArchived, expandedArchived, setExpandedArchived,
    openArchivedView, restoreEmpresa, hardDeleteEmpresa, restoreExtintor, hardDeleteExtintor,
    restoreInventario, hardDeleteInventario, restoreCotizacion, hardDeleteCotizacion,
  } = archived;

  const usersManagement = useUsuarios(socket, user.role);
  const {
    usersModal, setUsersModal, usersList, userForm, setUserForm,
    editingUserId, setEditingUserId, savingUser, userError,
    openUsersModal, saveUser, deleteUser,
  } = usersManagement;

  const enSeccionAlterna = location.pathname.startsWith("/dashboard/inventario") || location.pathname.startsWith("/dashboard/cotizaciones") || location.pathname.startsWith("/dashboard/alertas") || location.pathname.startsWith("/dashboard/voz");

  const totalAlertas = useAlertasBadge(socket);

  const enRuta = (ruta: string) => location.pathname.startsWith(ruta);
  const itemsMenu: { to: string; label: string; icono: LucideIcon; activo: boolean; badge?: number }[] = [
    { to: "/dashboard", label: "Registro Extintores", icono: FireExtinguisher, activo: !enSeccionAlterna },
    { to: "/dashboard/inventario", label: "Inventario", icono: Package, activo: enRuta("/dashboard/inventario") },
    { to: "/dashboard/cotizaciones", label: "Cotizaciones", icono: Receipt, activo: enRuta("/dashboard/cotizaciones") },
    { to: "/dashboard/alertas", label: "Alertas", icono: Bell, activo: enRuta("/dashboard/alertas"), badge: totalAlertas },
    ...(user.role === "boss" ? [{ to: "/dashboard/voz", label: "Dictado por Voz", icono: Mic, activo: enRuta("/dashboard/voz") }] : []),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-500/30 pb-10"
      style={{ fontFamily: "'Instrument Sans', 'SF Pro Display', system-ui, sans-serif" }}>

      <Notificaciones tema="oscuro" />

      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-zinc-950/80 border-b border-zinc-800/60 shadow-sm">
        <div className="max-w-480 mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            {location.pathname !== "/dashboard" && (
              <Link to="/dashboard"
                className="w-9 h-9 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center transition-all text-zinc-400 hover:text-white shadow-sm hover:shadow-md active:scale-95"
                title="Volver al directorio" aria-label="Volver al directorio">
                <ChevronLeft className="w-5 h-5" />
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
            <div className="flex items-center gap-1.5 sm:gap-2">
              {user.role === "boss" && (
                <button onClick={openUsersModal} className={botonCabecera} title="Usuarios">
                  <Users className="w-4 h-4" />
                  <span className="hidden lg:inline">Usuarios</span>
                </button>
              )}

              {(user.role === "boss" || user.role === "admin") && (
                <button onClick={() => setCatalogModal(true)} className={botonCabecera} title="Catálogos">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden lg:inline">Catálogos</span>
                </button>
              )}

              {(user.role === "boss" || user.role === "admin") && (
                <button onClick={openArchivedView} className={botonCabecera} title="Archivados">
                  <Archive className="w-4 h-4" />
                  <span className="hidden lg:inline">Archivados</span>
                </button>
              )}

              {user.role === "boss" && (
                <button onClick={respaldo.descargar} disabled={respaldo.descargando} className={`${botonCabecera} disabled:opacity-60`} title="Descargar respaldo">
                  {respaldo.descargando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <DatabaseBackup className="w-4 h-4" />}
                  <span className="hidden lg:inline">Respaldo</span>
                </button>
              )}
              <Link to="/app" title="Ir a App Móvil"
                className="px-2.5 lg:px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 hover:border-red-800/50 transition-all flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <span className="hidden lg:inline">Ir a App Móvil</span>
              </Link>
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
                className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-900/50 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all active:scale-95 shadow-sm"
                title="Cerrar sesión" aria-label="Cerrar sesión">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-480 mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row gap-6">
        <aside className={`shrink-0 flex md:flex-col gap-2 transition-all md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-7rem)] md:overflow-y-auto overflow-x-auto scrollbar-hide ${sidebarOpen ? "md:w-56" : "md:w-14"}`}>
          <button
            onClick={alternarSidebar}
            className="hidden md:flex px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-white hover:bg-zinc-900/50 border border-transparent items-center gap-2"
            title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
            aria-label={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4 shrink-0" /> : <PanelLeftOpen className="w-4 h-4 shrink-0" />}
            {sidebarOpen && "Ocultar"}
          </button>
          {itemsMenu.map(({ to, label, icono: Icono, activo, badge }) => (
            <Link
              key={to}
              to={to}
              title={label}
              className={`flex-1 md:flex-none whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 ${activo ? "bg-red-950/30 text-red-400 border border-red-900/50" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50 border border-transparent"}`}
            >
              <Icono className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="hidden sm:inline md:inline">{label}</span>}
              {!!badge && (
                <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          ))}
        </aside>
        <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<EmpresasPage socket={socket} role={user.role} catalogs={catalogs} />} />
          <Route path="inventario" element={<InventarioPage socket={socket} catalogs={catalogs} userRole={user.role} />} />
          <Route path="cotizaciones" element={<CotizacionesPage socket={socket} />} />
          <Route path="alertas" element={<AlertasPage socket={socket} />} />
          {user.role === "boss" && <Route path="voz" element={<VozAprendizajePage socket={socket} catalogs={catalogs} role={user.role} />} />}
          <Route path=":empresaSlug" element={<EmpresaLayout socket={socket} catalogs={catalogs} user={user} />}>
            <Route index element={<Navigate to="extintores" replace />} />
            <Route path="extintores" element={<ExtintoresPage />} />
            <Route path="historial" element={<HistorialPage />} />
            <Route path="historial/:anio/:mes" element={<HistorialMesPage />} />
            <Route path="historial/:anio/:mes/:registroId" element={<ServicioDetallePage />} />
            <Route path="certificados" element={<CertificadosPage />} />
            <Route path="sedes" element={<SedesPage />} />
            <Route path="sedes/:sedeSlug">
              <Route index element={<Navigate to="extintores" replace />} />
              <Route path="extintores" element={<ExtintoresPage />} />
              <Route path="historial" element={<HistorialPage />} />
              <Route path="historial/:anio/:mes" element={<HistorialMesPage />} />
              <Route path="historial/:anio/:mes/:registroId" element={<ServicioDetallePage />} />
              <Route path="certificados" element={<CertificadosPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <UsuariosModal isOpen={usersModal} onClose={() => setUsersModal(false)} usersList={usersList} userForm={userForm} setUserForm={setUserForm} editingUserId={editingUserId} setEditingUserId={setEditingUserId} savingUser={savingUser} userError={userError} onSave={saveUser} onDelete={deleteUser} />
        <ArchivadosModal
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
        <CatalogosModal
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
