import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { Archive, Building, Building2, ChevronRight, FileText, FireExtinguisher, FolderClock, History, Pencil, SearchX, User } from "lucide-react";
import type { Socket } from "socket.io-client";
import type { Catalogs } from "../../../hooks/useSocket";
import { EmpresaScopeProvider, useEmpresaScope } from "./EmpresaScopeContext";
import EmpresaModal from "./EmpresaModal";
import ArchivarEmpresaModal from "./ArchivarEmpresaModal";
import SedeModal from "../../../components/sedes/SedeModal";
import { InfoSection, InfoRow } from "../components/PanelUI";

const claseNav = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-red-500 ${isActive ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`;

function EmpresaLayoutInner({ user }: { user: { role: string } }) {
  const { sedeSlug } = useParams<{ sedeSlug?: string }>();
  const scope = useEmpresaScope() as any;
  const { selectedEmpresa, loadingDetail, empresaForm, sedes, activeSede, empresaNoEncontrada } = scope;

  const {
    editingEmpresa, setEditingEmpresa, empresaForm: form, setEmpresaForm,
    deleteModal, setDeleteModal, setDeleteConfirmText,
    handleDeleteEmpresa, openEditEmpresa, saveEmpresa, saving,
  } = empresaForm;

  if (empresaNoEncontrada) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-28 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
        <SearchX className="w-14 h-14 text-zinc-700" strokeWidth={1.5} />
        <div className="text-center">
          <p className="text-base font-bold text-zinc-300">Esta empresa no existe o fue archivada</p>
          <p className="text-sm text-zinc-500 mt-1">Si fue archivada, puedes restaurarla desde Archivados.</p>
        </div>
        <Link to="/dashboard" className="mt-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-colors">
          Volver al directorio
        </Link>
      </div>
    );
  }

  if (loadingDetail || !selectedEmpresa) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-zinc-500">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold">Cargando información del cliente...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs font-bold text-zinc-500">
        {activeSede ? (
          <Link to={`/dashboard/${selectedEmpresa.slug}/sedes`} className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"><Building2 className="w-3.5 h-3.5" />{selectedEmpresa.razonSocial}</Link>
        ) : (
          <span className="flex items-center gap-1.5 text-zinc-300"><Building2 className="w-3.5 h-3.5" />{selectedEmpresa.razonSocial}</span>
        )}
        {activeSede && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
            <span className="flex items-center gap-1.5 text-red-400"><Building className="w-3.5 h-3.5" />{activeSede.nombre}</span>
          </>
        )}
      </nav>

      {/* Info de la empresa */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-lg">
        <div className="px-6 py-6 border-b border-zinc-800/60 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-linear-to-r from-zinc-900/80 to-transparent">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {selectedEmpresa.razonSocial}
              {activeSede && <span className="text-red-400"> · {activeSede.nombre}</span>}
            </h2>
            <p className="text-sm text-zinc-400 font-medium mt-1">Directorio de Clientes · FAMA Extintores</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 p-1.5 bg-zinc-950/50 rounded-xl border border-zinc-800/50 shadow-inner">
              <button onClick={openEditEmpresa} className="flex items-center gap-2 px-3.5 py-2 rounded-lg hover:bg-zinc-800 text-sm font-bold text-zinc-400 hover:text-white transition-all" title="Editar datos">
                <Pencil className="w-4 h-4" />Editar
              </button>
              {(user.role === "admin" || user.role === "boss") && (
                <button onClick={() => { setDeleteConfirmText(""); setDeleteModal(true); }} className="flex items-center gap-2 px-3.5 py-2 rounded-lg hover:bg-red-950/60 text-sm font-bold text-zinc-400 hover:text-red-400 transition-all" title="Mover a archivados">
                  <Archive className="w-4 h-4" />Archivar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800/60 bg-zinc-900/20">
          <InfoSection title="Empresa" icon={Building2}>
            <InfoRow label="Dirección" value={selectedEmpresa.direccion} />
            <InfoRow label="Distrito" value={selectedEmpresa.distrito} />
            <InfoRow label="RUC" value={selectedEmpresa.ruc} />
          </InfoSection>
          <InfoSection title="Solicitante" icon={User}>
            <InfoRow label="Nombre" value={selectedEmpresa.nombresApellidos} />
            <InfoRow label="Celular" value={selectedEmpresa.celular} />
            <InfoRow label="Orden de Trabajo" value={selectedEmpresa.nOrdenTrabajo} />
          </InfoSection>
        </div>
      </div>

      {/* Navegación */}
      <nav aria-label="Navegación de la empresa" className="flex items-center gap-2 bg-zinc-900/30 p-1.5 rounded-2xl border border-zinc-800/50 w-fit flex-wrap">
        {!sedeSlug ? (
          <>
            <NavLink to="extintores" end className={claseNav}>
              <FireExtinguisher className="w-4 h-4" />Todos los Extintores
            </NavLink>
            <NavLink to="historial" className={claseNav}>
              {sedes.sedes.length === 0 ? <History className="w-4 h-4" /> : <FolderClock className="w-4 h-4" />}
              {sedes.sedes.length === 0 ? "Historial" : "Historial previo a sedes"}
            </NavLink>
            <NavLink to="certificados" className={claseNav}>
              <FileText className="w-4 h-4" />Certificados
            </NavLink>
            <NavLink to="sedes" className={claseNav}>
              <Building className="w-4 h-4" />Sedes
              <span className="px-1.5 py-0.5 rounded-full bg-zinc-950/60 text-[10px]">{sedes.sedes.length}</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to={`sedes/${sedeSlug}/extintores`} end className={claseNav}>
              <FireExtinguisher className="w-4 h-4" />Extintores
            </NavLink>
            <NavLink to={`sedes/${sedeSlug}/historial`} className={claseNav}>
              <History className="w-4 h-4" />Historial
            </NavLink>
            <NavLink to={`sedes/${sedeSlug}/certificados`} className={claseNav}>
              <FileText className="w-4 h-4" />Certificados
            </NavLink>
          </>
        )}
      </nav>

      <Outlet />

      {/* Modales de la empresa */}
      {editingEmpresa && form && (
        <EmpresaModal title="Editar Empresa" icon={Pencil} form={form} setForm={setEmpresaForm} onClose={() => setEditingEmpresa(false)} onSave={saveEmpresa} saving={saving} empresasExistentes={scope.empresas} />
      )}
      <ArchivarEmpresaModal isOpen={deleteModal} onClose={() => setDeleteModal(false)} onArchive={handleDeleteEmpresa} saving={saving} />
      <SedeModal isOpen={sedes.sedeModal} form={sedes.editingSede} setForm={sedes.setEditingSede} onClose={() => sedes.setSedeModal(false)} onSave={sedes.saveSede} saving={sedes.savingSede} />
    </div>
  );
}

export default function EmpresaLayout({ socket, catalogs, user }: { socket: Socket | null; catalogs: Catalogs; user: { role: string } }) {
  return (
    <EmpresaScopeProvider socket={socket} role={user.role} catalogs={catalogs}>
      <EmpresaLayoutInner user={user} />
    </EmpresaScopeProvider>
  );
}
