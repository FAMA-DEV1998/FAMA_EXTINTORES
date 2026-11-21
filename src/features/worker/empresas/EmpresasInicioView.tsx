import { useState, type ReactNode } from "react";
import { ArrowDownUp, ChevronRight, Clock, CloudOff, ClipboardList, MapPin, Plus, ScanQrCode, Search, SearchX, Tag, X } from "lucide-react";
import { usePreferenciaLocal } from "../../../hooks/usePreferenciaLocal";
import { ordenarEmpresas, OPCIONES_ORDEN_EMPRESAS, type OrdenEmpresas } from "../../../utils/duplicados";
import type { EmpresaItem } from "../../../types";
import { TIPO_CLIENTE_LABELS, CLASIFICACION_FILTROS, esMultisede, filtrarPorClasificacion, type ClasificacionFiltro } from "../../../utils/empresas";
import { EtiquetaClasificacion, IconoEmpresa } from "../../../components/ui/IconosEmpresa";
import { mesAnioLabel } from "../../../utils/fechas";
import type { DatosDirectorio } from "../hooks/useDirectorioEmpresas";

const DIAS_RECIENTE = 30;

interface EmpresasInicioViewProps {
  empresas: EmpresaItem[];
  connected: boolean;
  disponiblesSinSenal?: Set<string> | null;
  directorio?: Record<string, DatosDirectorio>;
  selectEmpresa: (id: string, sedeId?: string | null) => void;
  onCreateNew: () => void;
  onEscanearQR: () => void;
}

const normal = (t: string) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function EmpresasInicioView({ empresas, connected, disponiblesSinSenal = null, directorio = {}, selectEmpresa, onCreateNew, onEscanearQR }: EmpresasInicioViewProps) {
  const [search, setSearch] = useState("");
  const [fTipo, setFTipo] = useState<ClasificacionFiltro>("");
  const [orden, setOrden] = usePreferenciaLocal<OrdenEmpresas>("fama_orden_empresas_app", "az");
  const q = normal(search.trim());

  const coincidencia = (e: EmpresaItem): { sede?: { id: string; nombre: string }; area?: string } | null => {
    if (!q) return {};
    if (normal(e.razonSocial).includes(q) || normal(e.ruc || "").includes(q) || normal(e.nombresApellidos || "").includes(q)) return {};
    const sede = (e.sedes || []).find((s) => normal(s.nombre).includes(q));
    if (sede) return { sede: { id: sede.id, nombre: sede.nombre } };
    const area = (directorio[e.id]?.areas || []).find((a) => normal(a).includes(q));
    return area ? { area } : null;
  };

  const encontradas = empresas.map((e) => ({ e, m: coincidencia(e) })).filter((x) => x.m !== null);
  const porId = new Map(encontradas.map((x) => [x.e.id, x.m!]));
  const filtradas = ordenarEmpresas(filtrarPorClasificacion(encontradas.map((x) => x.e), fTipo), orden);

  const limite = new Date(Date.now() - DIAS_RECIENTE * 864e5).toISOString().slice(0, 10);
  const ultimo = (e: EmpresaItem) => directorio[e.id]?.ultimoServicio || "";
  const recientes = filtradas.filter((e) => ultimo(e) >= limite).sort((a, b) => ultimo(b).localeCompare(ultimo(a)));
  const idsRecientes = new Set(recientes.map((e) => e.id));
  const resto = filtradas.filter((e) => !idsRecientes.has(e.id));

  const fila = (emp: EmpresaItem) => {
    const noDisponible = !!disponiblesSinSenal && !disponiblesSinSenal.has(emp.id);
    const d = directorio[emp.id];
    const m = porId.get(emp.id) || {};
    const sedes = (emp.sedes || []).length;
    const tipo = esMultisede(emp) ? "Multisede" : emp.tipoCliente ? TIPO_CLIENTE_LABELS[emp.tipoCliente] : null;
    const detalle = [
      sedes > 0 ? `${sedes} sede${sedes === 1 ? "" : "s"}` : null,
      d ? `${d.extintores} extintor${d.extintores === 1 ? "" : "es"}` : null,
      d?.ultimoServicio ? `Últ. servicio ${mesAnioLabel(d.ultimoServicio)}` : null,
    ].filter(Boolean).join(" · ");
    return (
      <button
        key={emp.id}
        onClick={() => selectEmpresa(emp.id, m.sede?.id ?? null)}
        disabled={noDisponible}
        title={noDisponible ? "Ábrela cuando tengas señal para poder usarla sin conexión" : undefined}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-zinc-100 last:border-0 active:bg-red-50 hover:bg-zinc-50 transition-colors group disabled:opacity-45 disabled:cursor-not-allowed"
      >
        <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center group-hover:bg-red-100 group-hover:text-red-600 transition-colors shrink-0">
          <IconoEmpresa empresa={emp} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-zinc-800 text-sm md:text-base leading-snug line-clamp-2 group-hover:text-red-700">{emp.razonSocial}</p>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            {[tipo, emp.ruc].filter(Boolean).join(" · ") || <span className="text-zinc-400">Sin clasificar</span>}
            {detalle && <span className="text-zinc-400"> · {detalle}</span>}
          </p>
          {(m.sede || m.area) && (
            <p className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[11px] font-black text-sky-700">
              {m.sede ? <><MapPin className="w-3 h-3" />Sede {m.sede.nombre}</> : <><Tag className="w-3 h-3" />Área {m.area}</>}
            </p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-red-600 shrink-0" />
      </button>
    );
  };

  const seccion = (titulo: string, lista: EmpresaItem[], icono?: ReactNode) => (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 px-1 text-xs font-black text-zinc-500 uppercase tracking-widest">{icono}{titulo}<span className="text-zinc-400">{lista.length}</span></h2>
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">{lista.map(fila)}</div>
    </section>
  );

  return (
    <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-5 max-w-3xl mx-auto w-full">
      <div className="text-center pt-4 md:pt-8">
        <h1 className="text-2xl md:text-4xl font-black text-zinc-800 tracking-tight">Directorio de Empresas</h1>
        <p className="text-sm md:text-base text-zinc-500 mt-1.5 font-medium">Selecciona un cliente para gestionar sus extintores</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={onCreateNew} className="py-4 rounded-2xl bg-red-700 text-white font-black text-sm md:text-base hover:bg-red-600 shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Registrar Nueva Empresa
        </button>
        <button onClick={onEscanearQR} className="py-4 rounded-2xl bg-zinc-900 text-white font-black text-sm md:text-base hover:bg-zinc-800 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
          <ScanQrCode className="w-5 h-5" /> Escanear QR
        </button>
      </div>

      <div className="flex flex-col gap-2.5 sticky top-0 z-10 -mx-4 px-4 py-2 bg-zinc-100/90 backdrop-blur md:static md:mx-0 md:px-0 md:bg-transparent">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUC, sede o área..."
            className="w-full border-2 border-zinc-200 rounded-xl pl-9 pr-10 py-3 text-sm font-bold text-zinc-800 bg-white placeholder-zinc-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100" aria-label="Limpiar búsqueda">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <label className="flex items-center gap-1.5 bg-white border-2 border-zinc-200 rounded-xl pl-2.5 pr-1 text-xs font-bold text-zinc-500 shrink-0">
            <ArrowDownUp className="w-3.5 h-3.5 shrink-0" />
            <span className="sr-only">Ordenar empresas</span>
            <select value={orden} onChange={(e) => setOrden(e.target.value as OrdenEmpresas)} className="bg-transparent py-1.5 pr-1 text-zinc-700 focus:outline-none">
              {OPCIONES_ORDEN_EMPRESAS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          {CLASIFICACION_FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFTipo(f.value)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${fTipo === f.value ? "bg-red-600 border-red-600 text-white" : "bg-white border-zinc-200 text-zinc-500"}`}
            >
              <EtiquetaClasificacion value={f.value} label={f.label} />
            </button>
          ))}
        </div>
      </div>

      {disponiblesSinSenal && empresas.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-sm font-bold">
          <CloudOff className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <span>Sin señal: puedes abrir las empresas que ya abriste antes en este teléfono. Las demás aparecen en gris.</span>
        </div>
      )}

      {empresas.length === 0 && connected && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-zinc-400 bg-white/60 rounded-3xl border-2 border-dashed border-zinc-200">
          <ClipboardList className="w-16 h-16 text-zinc-300" strokeWidth={1.5} />
          <p className="text-sm md:text-base font-bold text-zinc-500">No hay empresas registradas aún</p>
        </div>
      )}

      {empresas.length > 0 && filtradas.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl">
          <SearchX className="w-12 h-12 text-zinc-300" strokeWidth={1.5} />
          <p className="text-sm font-bold text-zinc-500">Ninguna empresa coincide con la búsqueda</p>
        </div>
      )}

      {recientes.length > 0 && seccion("Atendidas recientemente", recientes, <Clock className="w-3.5 h-3.5" />)}
      {resto.length > 0 && seccion(recientes.length > 0 ? "Todas las demás" : "Empresas", resto)}
      <div className="h-4 shrink-0" />
    </div>
  );
}
