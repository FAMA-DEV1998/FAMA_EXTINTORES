import { useState } from "react";
import { ArrowDownUp, ChevronRight, CloudOff, ClipboardList, Plus, ScanQrCode, Search, SearchX, TriangleAlert, X } from "lucide-react";
import { usePreferenciaLocal } from "../../../hooks/usePreferenciaLocal";
import { ordenarEmpresas, OPCIONES_ORDEN_EMPRESAS, type OrdenEmpresas } from "../../../utils/duplicados";
import type { EmpresaItem } from "../../../types";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_FILTROS, esMultisede, filtrarPorClasificacion, type ClasificacionFiltro } from "../../../utils/empresas";
import { EtiquetaClasificacion, IconoEmpresa } from "../../../components/ui/IconosEmpresa";

interface EmpresasInicioViewProps {
  empresas: EmpresaItem[];
  connected: boolean;
  disponiblesSinSenal?: Set<string> | null;
  selectEmpresa: (id: string) => void;
  onCreateNew: () => void;
  onEscanearQR: () => void;
}

export default function EmpresasInicioView({ empresas, connected, disponiblesSinSenal = null, selectEmpresa, onCreateNew, onEscanearQR }: EmpresasInicioViewProps) {
  const [search, setSearch] = useState("");
  const [fTipo, setFTipo] = useState<ClasificacionFiltro>("");
  const [orden, setOrden] = usePreferenciaLocal<OrdenEmpresas>("fama_orden_empresas_app", "az");
  const q = search.trim().toLowerCase();

  const empresasFiltradas = ordenarEmpresas(filtrarPorClasificacion(
    empresas.filter((e) =>
      !q ||
      (e.razonSocial || "").toLowerCase().includes(q) ||
      (e.ruc || "").toLowerCase().includes(q) ||
      (e.nombresApellidos || "").toLowerCase().includes(q)
    ),
    fTipo
  ), orden);

  return (
    <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="text-center pt-6 md:pt-10 pb-4">
        <h1 className="text-2xl md:text-4xl font-black text-zinc-800 tracking-tight">Directorio de Empresas</h1>
        <p className="text-sm md:text-base text-zinc-500 mt-2 font-medium">Selecciona un cliente para gestionar sus extintores</p>
      </div>

      <button
        onClick={onCreateNew}
        className="w-full md:w-auto md:self-center md:px-14 py-4 rounded-2xl bg-red-700 text-white font-black text-sm md:text-base hover:bg-red-600 shadow-lg shadow-red-900/20 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" /> Registrar Nueva Empresa
      </button>

      <button
        onClick={onEscanearQR}
        className="w-full md:w-auto md:self-center md:px-14 py-3.5 rounded-2xl bg-zinc-900 text-white font-black text-sm md:text-base hover:bg-zinc-800 shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
      >
        <ScanQrCode className="w-5 h-5" /> Escanear QR
      </button>

      <div className="relative w-full md:max-w-md md:self-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o RUC..."
          className="w-full border-2 border-zinc-200 rounded-xl pl-9 pr-10 py-2.5 text-sm font-bold text-zinc-800 bg-white placeholder-zinc-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100" aria-label="Limpiar búsqueda">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <label className="self-center flex items-center gap-2 bg-white border-2 border-zinc-200 rounded-xl pl-3 pr-1 text-xs font-bold text-zinc-500">
        <ArrowDownUp className="w-3.5 h-3.5 shrink-0" />
        <span className="sr-only">Ordenar empresas</span>
        <select value={orden} onChange={(e) => setOrden(e.target.value as OrdenEmpresas)} className="bg-transparent py-2 pr-2 text-zinc-700 focus:outline-none">
          {OPCIONES_ORDEN_EMPRESAS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <div className="flex flex-wrap gap-2 justify-center">
        {CLASIFICACION_FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFTipo(f.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${fTipo === f.value ? "bg-red-600 border-red-600 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}
          >
            <EtiquetaClasificacion value={f.value} label={f.label} />
          </button>
        ))}
      </div>

      {disponiblesSinSenal && empresas.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-sm font-bold md:self-center md:max-w-xl">
          <CloudOff className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <span>Sin señal: puedes abrir las empresas que ya abriste antes en este teléfono. Las demás aparecen en gris.</span>
        </div>
      )}

      {empresas.length === 0 && connected && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-zinc-400 bg-white/60 rounded-3xl border-2 border-dashed border-zinc-200 shadow-sm">
          <ClipboardList className="w-16 h-16 text-zinc-300" strokeWidth={1.5} />
          <p className="text-sm md:text-base font-bold text-zinc-500">No hay empresas registradas aún</p>
        </div>
      )}

      {empresas.length > 0 && empresasFiltradas.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl">
          <SearchX className="w-12 h-12 text-zinc-300" strokeWidth={1.5} />
          <p className="text-sm font-bold text-zinc-500">Ninguna empresa coincide con la búsqueda</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6">
        {empresasFiltradas.map((emp) => {
          const noDisponible = !!disponiblesSinSenal && !disponiblesSinSenal.has(emp.id);
          return (
          <button
            key={emp.id}
            onClick={() => selectEmpresa(emp.id)}
            disabled={noDisponible}
            title={noDisponible ? "Ábrela cuando tengas señal para poder usarla sin conexión" : undefined}
            className="flex items-center gap-4 p-5 bg-white border border-zinc-200/80 rounded-2xl text-left hover:border-red-300 hover:shadow-xl active:bg-red-50 transition-all hover:-translate-y-1 group disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:border-zinc-200/80 disabled:cursor-not-allowed"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-500 flex items-center justify-center group-hover:bg-red-100 group-hover:text-red-600 transition-colors shrink-0 shadow-inner">
              <IconoEmpresa empresa={emp} className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-zinc-800 text-sm md:text-base truncate group-hover:text-red-700 transition-colors">
                {emp.razonSocial}
              </p>
              {(() => {
                const faltantes: string[] = [];
                if (!emp.tipoCliente) faltantes.push("clasificación");
                if (!emp.ruc) faltantes.push("RUC/DNI");
                if (faltantes.length > 0) {
                  return (
                    <p className="flex items-center gap-1 text-xs text-amber-600 font-bold mt-0.5">
                      <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Falta {faltantes.join(" y ")}{esMultisede(emp) && " (multisede)"}</span>
                    </p>
                  );
                }
                return esMultisede(emp) ? (
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">Multisede · {emp.ruc}</p>
                ) : (
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">{TIPO_CLIENTE_LABELS[emp.tipoCliente!]} · {emp.ruc}</p>
                );
              })()}
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-red-600 transition-colors shrink-0">
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-white" />
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}
