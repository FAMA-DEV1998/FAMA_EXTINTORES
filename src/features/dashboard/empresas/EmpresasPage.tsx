import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownUp, ArrowRight, Building2, Clock, Copy, FireExtinguisher, GitMerge, MapPin, Plus, Search, TriangleAlert, X } from "lucide-react";
import type { Socket } from "socket.io-client";
import { useFiltrosDashboard } from "../hooks/useFiltrosDashboard";
import { useEmpresaForm } from "./useEmpresaForm";
import { useServiciosRecientes } from "./useServiciosRecientes";
import { useEmpresaSeleccionada } from "./useEmpresaSeleccionada";
import EmpresaModal from "./EmpresaModal";
import FusionEmpresasModal from "./FusionEmpresasModal";
import ScrollableRow from "../../../components/ui/ScrollableRow";
import { TIPO_CLIENTE_LABELS, esMultisede, CLASIFICACION_FILTROS, filtrarPorClasificacion, type ClasificacionFiltro } from "../../../utils/empresas";
import { EtiquetaClasificacion, IconoEmpresa } from "../../../components/ui/IconosEmpresa";
import { ordinalServicio } from "../../../utils/historial";
import { MESES } from "../../../constants";
import type { Catalogs } from "../../../hooks/useSocket";
import { usePreferenciaLocal } from "../../../hooks/usePreferenciaLocal";
import { detectarDuplicados, ordenarEmpresas, OPCIONES_ORDEN_EMPRESAS, TEXTO_MOTIVO_DUPLICADO, type OrdenEmpresas } from "../../../utils/duplicados";
import ResumenPanel from "../resumen/ResumenPanel";

const rutaServicioReciente = (s: any): string => {
  const [anio, mesNum] = (s.fechaRetiro || "").split("-");
  const mesLabel = MESES.find((m) => m.value === String(Number(mesNum)))?.label.toLowerCase();
  const base = s.sedeSlug ? `/dashboard/${s.empresaSlug}/sedes/${s.sedeSlug}` : `/dashboard/${s.empresaSlug}`;
  if (!anio || !mesLabel) return base;
  return `${base}/historial/${anio}/${mesLabel}/${s.id}`;
};

const mesAnioServicioReciente = (fechaRetiro: string): { mes: string; anio: string } => {
  const [anio, mesNum] = (fechaRetiro || "").split("-");
  const mes = MESES.find((m) => m.value === String(Number(mesNum)))?.label || "Sin fecha";
  return { mes, anio: anio || "" };
};

export default function EmpresasPage({ socket, role }: { socket: Socket | null; role: string; catalogs: Catalogs }) {
  const navigate = useNavigate();

  const { empresas, empresasCargadas } = useEmpresaSeleccionada(socket);
  const { recientes } = useServiciosRecientes(socket, 8);

  const [saving, setSaving] = useState(false);
  const noop = () => {};
  const empresaFormHook = useEmpresaForm(socket, role, null, noop, saving, setSaving, (slug) => navigate(`/dashboard/${slug}/sedes`));
  const {
    empresaForm, setEmpresaForm, createEmpresaModal, setCreateEmpresaModal,
    openCreateEmpresa, saveNewEmpresa,
  } = empresaFormHook;

  const filters = useFiltrosDashboard(empresas, [], [], [], []);
  const { search, setSearch, filtered } = filters;

  const [fTipo, setFTipo] = useState<ClasificacionFiltro>("");
  const [orden, setOrden] = usePreferenciaLocal<OrdenEmpresas>("fama_orden_empresas", "recientes");
  const [soloDuplicados, setSoloDuplicados] = useState(false);
  const duplicados = useMemo(() => detectarDuplicados(empresas), [empresas]);
  const filteredFinal = ordenarEmpresas(
    filtrarPorClasificacion(filtered, fTipo).filter((e) => !soloDuplicados || duplicados.has(e.id)),
    orden,
  );
  const [fusionModal, setFusionModal] = useState(false);
  const [fusionPar, setFusionPar] = useState<{ origen: string; destino: string } | null>(null);
  const puedeFusionar = role === "admin" || role === "boss";
  const hayFiltros = !!(search || fTipo || soloDuplicados);
  const limpiarFiltros = () => { setSearch(""); setFTipo(""); setSoloDuplicados(false); };
  const abrirFusion = (par: { origen: string; destino: string } | null) => {
    setFusionPar(par);
    setFusionModal(true);
  };

  return (
    <>
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    {puedeFusionar && <ResumenPanel socket={socket} />}
    {recientes.length > 0 && (
      <div className="mb-8 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Clock className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-black text-zinc-300 uppercase tracking-wider">Últimos servicios creados</h2>
        </div>
        <ScrollableRow className="gap-3" botonesSiempreVisibles={recientes.length > 4}>
          {recientes.slice(0, 8).map((s: any) => {
            const { mes, anio } = mesAnioServicioReciente(s.fechaRetiro);
            return (
              <button
                key={s.id}
                onClick={() => navigate(rutaServicioReciente(s))}
                className="shrink-0 w-60 flex flex-col gap-2.5 bg-zinc-950/50 hover:bg-zinc-900 border border-zinc-800/60 hover:border-red-800/60 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
              >
                <span className="w-9 h-9 rounded-xl bg-red-950/40 text-red-400 flex items-center justify-center shrink-0"><FireExtinguisher className="w-4 h-4" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-zinc-100 truncate leading-tight">{s.razonSocial}</p>
                  {s.sedeNombre && <p className="flex items-center gap-1 text-[11px] text-zinc-500 truncate mt-0.5"><MapPin className="w-3 h-3 shrink-0" />{s.sedeNombre}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-800/60">
                  <span className="px-2 py-1 rounded-md bg-red-950/30 border border-red-900/30 text-[10px] font-bold text-red-300 whitespace-nowrap">
                    {ordinalServicio(s.posicionEnMes || 1)} servicio del mes
                  </span>
                  <span className="px-2 py-1 rounded-md bg-zinc-800/80 text-[10px] font-bold text-zinc-300 whitespace-nowrap">
                    {mes} {anio}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-zinc-800/80 text-[10px] font-bold text-zinc-300 whitespace-nowrap">
                    {s.extintoresCount ?? 0} extintor{s.extintoresCount === 1 ? "" : "es"}
                  </span>
                </div>
              </button>
            );
          })}
        </ScrollableRow>
      </div>
    )}

    {/* Cabecera y Filtros */}
    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
        <div className="relative flex-1 min-w-60 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUC o solicitante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all shadow-inner"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" aria-label="Limpiar búsqueda">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-1 py-1 text-xs font-bold text-zinc-400">
          <ArrowDownUp className="w-3.5 h-3.5 shrink-0" />
          <span className="sr-only">Ordenar empresas</span>
          <select value={orden} onChange={(e) => setOrden(e.target.value as OrdenEmpresas)} className="bg-transparent py-1.5 pr-2 text-zinc-200 focus:outline-none cursor-pointer">
            {OPCIONES_ORDEN_EMPRESAS.map((o) => <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {CLASIFICACION_FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFTipo(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${fTipo === f.value ? "bg-red-600 border-red-600 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
            >
              <EtiquetaClasificacion value={f.value} label={f.label} />
            </button>
          ))}
        </div>

        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
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
        <Plus className="w-4 h-4" /> Nueva Empresa
      </button>
      {puedeFusionar && (
        <button
          onClick={() => abrirFusion(null)}
          className="w-full md:w-auto px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-bold text-zinc-200 transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2"
        >
          <GitMerge className="w-4 h-4" /> Unificar Empresas
        </button>
      )}
    </div>

    {empresasCargadas && duplicados.size > 0 && (
      <div className={`mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border ${soloDuplicados ? "bg-amber-950/40 border-amber-700/60" : "bg-amber-950/20 border-amber-900/40"}`}>
        <div className="flex items-start gap-3">
          <Copy className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-200">{duplicados.size} empresas podrían estar registradas dos veces</p>
            <p className="text-xs text-amber-400/80 mt-0.5">Tienen el mismo RUC/DNI o un nombre igual o muy parecido.{puedeFusionar ? " Revísalas y unifícalas para no partir su historial." : ""}</p>
          </div>
        </div>
        <button
          onClick={() => setSoloDuplicados(!soloDuplicados)}
          className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-colors"
        >
          {soloDuplicados ? "Ver todas las empresas" : "Revisar posibles duplicados"}
        </button>
      </div>
    )}

    {/* Empresas */}
    {!empresasCargadas ? (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-zinc-500">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold">Cargando empresas...</p>
      </div>
    ) : filteredFinal.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800 mt-4">
        <Building2 className="w-16 h-16 text-zinc-700" strokeWidth={1.5} />
        <p className="text-base font-medium">
          {hayFiltros ? "No se encontraron resultados para tu búsqueda." : "Aún no hay empresas registradas en el sistema."}
        </p>
        {hayFiltros && (
          <button onClick={limpiarFiltros} className="mt-2 text-sm font-bold text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4 transition-colors">
            Limpiar filtros
          </button>
        )}
        {!hayFiltros && (
          <button onClick={openCreateEmpresa} className="mt-2 text-sm font-bold text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4 transition-colors">
            Comenzar creando la primera
          </button>
        )}
      </div>
    ) : (
      <>
        <p className="text-sm font-bold text-zinc-500 mb-4 px-1">{filteredFinal.length} {filteredFinal.length === 1 ? "empresa encontrada" : "empresas encontradas"}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredFinal.map((emp) => {
            const parecidas = duplicados.get(emp.id) || [];
            return (
            <div
              key={emp.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/dashboard/${emp.slug}/extintores`)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/dashboard/${emp.slug}/extintores`); } }}
              className="group cursor-pointer flex flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-600 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-red-950/50 group-hover:text-red-400 flex items-center justify-center shrink-0 transition-colors">
                    <IconoEmpresa empresa={emp} className="w-5 h-5" />
                  </div>
                  <p className="font-black text-zinc-200 text-base truncate group-hover:text-white transition-colors">
                    {emp.razonSocial}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-red-400 transition-all transform group-hover:translate-x-1 shrink-0" />
              </div>

              {!emp.tipoCliente && (
                <p className="flex items-center gap-1 text-[11px] font-bold text-amber-500 mb-3 -mt-2"><TriangleAlert className="w-3.5 h-3.5" />Falta definir clasificación de cliente</p>
              )}

              {parecidas.length > 0 && (
                <div className="mb-3 -mt-1 flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-amber-950/30 border border-amber-900/50">
                  <p className="flex items-start gap-1.5 text-[11px] font-bold text-amber-300">
                    <Copy className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span className="min-w-0">Posible duplicado de <span className="text-amber-100">{parecidas[0].razonSocial}</span> ({TEXTO_MOTIVO_DUPLICADO[parecidas[0].motivo]}){parecidas.length > 1 ? ` y ${parecidas.length - 1} más` : ""}</span>
                  </p>
                  {puedeFusionar && (
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirFusion({ origen: emp.id, destino: parecidas[0].id }); }}
                      className="self-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-zinc-950 text-[11px] font-black"
                    >
                      <GitMerge className="w-3.5 h-3.5" />Unificar
                    </button>
                  )}
                </div>
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
            </div>
            );
          })}
        </div>
      </>
    )}
  </div>

      {createEmpresaModal && empresaForm && (
        <EmpresaModal title="Nueva Empresa" icon={Building2} form={empresaForm} setForm={setEmpresaForm} onClose={() => setCreateEmpresaModal(false)} onSave={saveNewEmpresa} saving={saving} empresasExistentes={empresas} />
      )}
      {puedeFusionar && (
        <FusionEmpresasModal isOpen={fusionModal} onClose={() => setFusionModal(false)} socket={socket} empresas={empresas} origenInicial={fusionPar?.origen} destinoInicial={fusionPar?.destino} />
      )}
    </>
  );
}
