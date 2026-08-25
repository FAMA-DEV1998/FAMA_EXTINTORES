import { useState } from "react";
import type { EmpresaItem } from "../../types";
import { TIPO_CLIENTE_LABELS, esMultisede, iconoEmpresa } from "../../utils/helpers";

interface HomeViewProps {
  empresas: EmpresaItem[];
  connected: boolean;
  selectEmpresa: (id: string) => void;
  onCreateNew: () => void;
  onEscanearQR: () => void;
}

type FiltroTipo = "" | "persona" | "ruc10" | "ruc20" | "multisede" | "sin_clasificar";

const FILTROS: { value: FiltroTipo; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "persona", label: "👤 Persona" },
  { value: "ruc10", label: "🏪 RUC 10" },
  { value: "ruc20", label: "🏢 RUC 20" },
  { value: "multisede", label: "🏬 Multisede" },
  { value: "sin_clasificar", label: "⚠️ Sin clasificar" },
];

export default function HomeView({ empresas, connected, selectEmpresa, onCreateNew, onEscanearQR }: HomeViewProps) {
  const [search, setSearch] = useState("");
  const [fTipo, setFTipo] = useState<FiltroTipo>("");
  const q = search.trim().toLowerCase();

  const empresasFiltradas = empresas
    .filter((e) =>
      !q ||
      (e.razonSocial || "").toLowerCase().includes(q) ||
      (e.ruc || "").toLowerCase().includes(q) ||
      (e.nombresApellidos || "").toLowerCase().includes(q)
    )
    .filter((e) => {
      if (!fTipo) return true;
      if (fTipo === "multisede") return esMultisede(e);
      if (fTipo === "sin_clasificar") return !e.tipoCliente;
      return e.tipoCliente === fTipo;
    });

  return (
    <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="text-center pt-6 md:pt-10 pb-4">
        <h1 className="text-2xl md:text-4xl font-black text-zinc-800 tracking-tight">Directorio de Empresas</h1>
        <p className="text-sm md:text-base text-zinc-500 mt-2 font-medium">Selecciona un cliente para gestionar sus extintores</p>
      </div>

      <button
        onClick={onEscanearQR}
        className="w-full md:w-auto md:self-center md:px-14 py-3.5 rounded-2xl bg-zinc-900 text-white font-black text-sm md:text-base hover:bg-zinc-800 shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
      >
        <span className="text-lg leading-none">📷</span> Escanear QR
      </button>

      <div className="relative w-full md:max-w-md md:self-center">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">🔎</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o RUC..."
          className="w-full border-2 border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-zinc-800 bg-white placeholder-zinc-400 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
        />
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFTipo(f.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${fTipo === f.value ? "bg-red-600 border-red-600 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {empresas.length === 0 && connected && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-zinc-400 bg-white/60 rounded-3xl border-2 border-dashed border-zinc-200 shadow-sm">
          <span className="text-6xl drop-shadow-sm opacity-80">📋</span>
          <p className="text-sm md:text-base font-bold text-zinc-500">No hay empresas registradas aún</p>
        </div>
      )}

      {empresas.length > 0 && empresasFiltradas.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl">
          <span className="text-5xl opacity-80">🔍</span>
          <p className="text-sm font-bold text-zinc-500">Ninguna empresa coincide con la búsqueda</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6">
        {empresasFiltradas.map((emp) => (
          <button
            key={emp.id}
            onClick={() => selectEmpresa(emp.id)}
            className="flex items-center gap-4 p-5 bg-white border border-zinc-200/80 rounded-2xl text-left hover:border-red-300 hover:shadow-xl active:bg-red-50 transition-all hover:-translate-y-1 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-3xl group-hover:bg-red-100 transition-colors shrink-0 shadow-inner">
              {iconoEmpresa(emp)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-zinc-800 text-sm md:text-base truncate group-hover:text-red-700 transition-colors">
                {emp.razonSocial}
              </p>
              {esMultisede(emp) ? (
                <p className="text-xs text-zinc-400 font-medium mt-0.5 truncate">Multisede · {emp.ruc || ""}</p>
              ) : emp.tipoCliente ? (
                <p className="text-xs text-zinc-400 font-medium mt-0.5 truncate">{TIPO_CLIENTE_LABELS[emp.tipoCliente]} · {emp.ruc || ""}</p>
              ) : (
                <p className="text-xs text-amber-600 font-bold mt-0.5 truncate">⚠️ Falta definir clasificación de cliente</p>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-red-600 transition-colors shrink-0">
              <span className="text-zinc-400 group-hover:text-white text-lg font-bold">›</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCreateNew}
        className="w-full md:w-auto md:self-center md:px-14 py-4 rounded-2xl bg-red-700 text-white font-black text-sm md:text-base hover:bg-red-600 shadow-lg shadow-red-900/20 transition-all hover:-translate-y-0.5 active:scale-95 mt-4 flex items-center justify-center gap-2"
      >
        <span className="text-xl leading-none">+</span> Registrar Nueva Empresa
      </button>
    </div>
  );
}