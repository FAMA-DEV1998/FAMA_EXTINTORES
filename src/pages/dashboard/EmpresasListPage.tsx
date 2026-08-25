import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Socket } from "socket.io-client";
import { useDashboardFilters, useEmpresaForm } from "../../hooks/dashboard";
import { useEmpresaSelection } from "../../hooks/dashboard";
import { EmpresaModal } from "../../components/modals";
import { TIPO_CLIENTE_LABELS, esMultisede, iconoEmpresa } from "../../utils/helpers";
import type { Catalogs } from "../../hooks/useSocket";

type FiltroTipo = "" | "persona" | "ruc10" | "ruc20" | "multisede" | "sin_clasificar";

const FILTROS: { value: FiltroTipo; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "persona", label: "👤 Persona" },
  { value: "ruc10", label: "🏪 RUC 10" },
  { value: "ruc20", label: "🏢 RUC 20" },
  { value: "multisede", label: "🏬 Multisede" },
  { value: "sin_clasificar", label: "⚠️ Sin clasificar" },
];

/**
 * Vista raíz del Dashboard: listado/búsqueda de empresas. Extraído del
 * bloque `view === "list"` que antes vivía inline en DashboardPage.tsx.
 */
export default function EmpresasListPage({ socket, role }: { socket: Socket | null; role: string; catalogs: Catalogs }) {
  const navigate = useNavigate();

  // Esta página no necesita seleccionar/cargar el detalle de una empresa
  // (eso lo hace EmpresaScopeProvider al entrar a /dashboard/:empresaSlug),
  // solo el listado — pero reutiliza useEmpresaSelection para obtener
  // `empresas` (ya vive suscrito a "empresa:list").
  const { empresas } = useEmpresaSelection(socket);

  const [saving, setSaving] = useState(false);
  const noop = () => {};
  const empresaFormHook = useEmpresaForm(socket, role, null, noop, saving, setSaving, (slug) => navigate(`/dashboard/${slug}/sedes`));
  const {
    empresaForm, setEmpresaForm, createEmpresaModal, setCreateEmpresaModal,
    openCreateEmpresa, saveNewEmpresa,
  } = empresaFormHook;

  const filters = useDashboardFilters(empresas, [], [], [], []);
  const { search, setSearch, filtered } = filters;

  const [fTipo, setFTipo] = useState<FiltroTipo>("");
  const filteredFinal = filtered.filter((e) => {
    if (!fTipo) return true;
    if (fTipo === "multisede") return esMultisede(e);
    if (fTipo === "sin_clasificar") return !e.tipoCliente;
    return e.tipoCliente === fTipo;
  });

  return (
    <>
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    {/* Cabecera y Filtros */}
    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
        <div className="relative flex-1 min-w-60 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar empresa por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all shadow-inner"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFTipo(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${fTipo === f.value ? "bg-red-600 border-red-600 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {(search || fTipo) && (
          <button
            onClick={() => { setSearch(""); setFTipo(""); }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 transition-all"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      <button
        onClick={openCreateEmpresa}
        className="w-full md:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(220,38,38,0.3)] active:scale-95 shrink-0 flex items-center justify-center gap-2"
      >
        <span className="text-lg leading-none">+</span> Nueva Empresa
      </button>
    </div>

    {/* Grid de Empresas */}
    {filteredFinal.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800 mt-4">
        <span className="text-6xl drop-shadow-md">🏢</span>
        <p className="text-base font-medium">
          {search || fTipo ? "No se encontraron resultados para tu búsqueda." : "Aún no hay empresas registradas en el sistema."}
        </p>
        {!search && !fTipo && (
          <button onClick={openCreateEmpresa} className="mt-2 text-sm font-bold text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4 transition-colors">
            Comenzar creando la primera
          </button>
        )}
      </div>
    ) : (
      <>
        <p className="text-sm font-bold text-zinc-500 mb-4 px-1">{filteredFinal.length} Empresas encontradas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredFinal.map((emp) => (
            <button
              key={emp.id}
              onClick={() => navigate(`/dashboard/${emp.slug}/extintores`)}
              className="group flex flex-col text-left bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-600 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-red-950/50 flex items-center justify-center text-lg shrink-0 transition-colors">
                    {iconoEmpresa(emp)}
                  </div>
                  <p className="font-black text-zinc-200 text-base truncate group-hover:text-white transition-colors">
                    {emp.razonSocial}
                  </p>
                </div>
                <span className="text-zinc-600 group-hover:text-red-400 text-xl transition-all transform group-hover:translate-x-1 shrink-0">→</span>
              </div>

              {!emp.tipoCliente && (
                <p className="text-[11px] font-bold text-amber-500 mb-3 -mt-2">⚠️ Falta definir clasificación de cliente</p>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs w-full bg-zinc-950/30 p-3 rounded-xl border border-zinc-800/30">
                <span className="text-zinc-500 font-medium">RUC</span>
                <span className="text-zinc-300 font-semibold text-right truncate">{emp.ruc || "—"}</span>
                <span className="text-zinc-500 font-medium">Tipo</span>
                <span className="text-zinc-300 font-semibold text-right truncate">{esMultisede(emp) ? "Multisede" : emp.tipoCliente ? TIPO_CLIENTE_LABELS[emp.tipoCliente] : "—"}</span>
                <span className="text-zinc-500 font-medium">Distrito</span>
                <span className="text-zinc-300 font-semibold text-right truncate">{emp.distrito || "—"}</span>
                <span className="text-zinc-500 font-medium">Solicitante</span>
                <span className="text-zinc-300 font-semibold text-right truncate">{emp.nombresApellidos || "—"}</span>
              </div>
            </button>
          ))}
        </div>
      </>
    )}
  </div>

      {createEmpresaModal && empresaForm && (
        <EmpresaModal title="🏢 Nueva Empresa" form={empresaForm} setForm={setEmpresaForm} onClose={() => setCreateEmpresaModal(false)} onSave={saveNewEmpresa} saving={saving} />
      )}
    </>
  );
}