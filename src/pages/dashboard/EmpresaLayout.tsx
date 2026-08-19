import { NavLink, Outlet, useParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import type { Catalogs } from "../../hooks/useSocket";
import { EmpresaScopeProvider, useEmpresaScope } from "../../context/EmpresaScopeContext";
import { EmpresaModal, ArchiveModal, SedeModal } from "../../components/modals";
import { InfoSection, InfoRow } from "../../components/ui/DashboardUI";

function EmpresaLayoutInner({ user }: { user: { role: string } }) {
    const { sedeSlug } = useParams<{ sedeSlug?: string }>();
    const scope = useEmpresaScope() as any;
    const { selectedEmpresa, loadingDetail, empresaForm, sedes, activeSede } = scope;

    const {
        editingEmpresa, setEditingEmpresa, empresaForm: form, setEmpresaForm,
        deleteModal, setDeleteModal, setDeleteConfirmText,
        handleDeleteEmpresa, openEditEmpresa, saveEmpresa, saving,
    } = empresaForm;

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
            {/* ── Info de la empresa (siempre visible en todas las páginas internas) ── */}
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
                            <button onClick={openEditEmpresa} className="px-3.5 py-2 rounded-lg hover:bg-zinc-800 text-sm font-bold text-zinc-400 hover:text-white transition-all" title="Editar datos">
                                ✏️ Editar
                            </button>
                            {(user.role === "admin" || user.role === "boss") && (
                                <button onClick={() => { setDeleteConfirmText(""); setDeleteModal(true); }} className="px-3.5 py-2 rounded-lg hover:bg-red-950/60 text-sm font-bold text-zinc-400 hover:text-red-400 transition-all" title="Mover a archivados">
                                    🗑️ Archivar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800/60 bg-zinc-900/20">
                    <InfoSection title="🏢 Empresa">
                        <InfoRow label="Dirección" value={selectedEmpresa.direccion} />
                        <InfoRow label="Distrito" value={selectedEmpresa.distrito} />
                        <InfoRow label="RUC" value={selectedEmpresa.ruc} />
                    </InfoSection>
                    <InfoSection title="👤 Solicitante">
                        <InfoRow label="Nombre" value={selectedEmpresa.nombresApellidos} />
                        <InfoRow label="Celular" value={selectedEmpresa.celular} />
                        <InfoRow label="Orden de Trabajo" value={selectedEmpresa.nOrdenTrabajo} />
                    </InfoSection>
                    <InfoSection title="📅 Fechas de Servicio">
                        <InfoRow label="Retiro de Extintores" value={selectedEmpresa.fechaRetiro ? selectedEmpresa.fechaRetiro.split("-").reverse().join("/") : ""} />
                        <InfoRow label="Entrega Programada" value={selectedEmpresa.fechaEntrega ? selectedEmpresa.fechaEntrega.split("-").reverse().join("/") : ""} />
                    </InfoSection>
                </div>
            </div>

            {/* ── Sedes (solo si la empresa tiene alguna) ── */}
            {sedes.sedes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-zinc-900/20 p-4 rounded-2xl border border-zinc-800/40">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">Sedes:</span>
                    <NavLink to="extintores" end className={({ isActive }) => `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive && !sedeSlug ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
                        🏢 Todos
                    </NavLink>
                    {sedes.sedes.map((s: any) => (
                        <NavLink key={s.id} to={`${s.slug}/extintores`} className={({ isActive }) => `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
                            🏬 {s.nombre}
                        </NavLink>
                    ))}
                    <button onClick={sedes.openCreateSede} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/30 hover:bg-red-900/40 transition-all ml-auto">
                        + Agregar Sede
                    </button>
                </div>
            )}

            {/* ── Tabs de navegación interna ── */}
            <nav className="flex items-center gap-2 bg-zinc-900/30 p-1.5 rounded-2xl border border-zinc-800/50 w-fit">
                <NavLink to={sedeSlug ? `${sedeSlug}/extintores` : "extintores"} end className={({ isActive }) => `px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                    🧯 Extintores
                </NavLink>
                <NavLink to={sedeSlug ? `${sedeSlug}/historial` : "historial"} className={({ isActive }) => `px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                    📜 Historial
                </NavLink>
                {!sedeSlug && (
                    <NavLink to="sedes" className={({ isActive }) => `px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                        🏬 Sedes
                    </NavLink>
                )}
            </nav>

            <Outlet />

            {/* ════ MODALES DE LA EMPRESA ════ */}
            {editingEmpresa && form && (
                <EmpresaModal title="✏️ Editar Empresa" form={form} setForm={setEmpresaForm} onClose={() => setEditingEmpresa(false)} onSave={saveEmpresa} saving={saving} />
            )}
            <ArchiveModal isOpen={deleteModal} onClose={() => setDeleteModal(false)} onArchive={handleDeleteEmpresa} saving={saving} />
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