import type { Dispatch, SetStateAction } from "react";

interface ExtintorFiltrosBarProps {
    search: string;
    setSearch: (v: string) => void;
    fMarca: string;
    setFMarca: (v: string) => void;
    fAgente: string;
    setFAgente: (v: string) => void;
    fPeso: string;
    setFPeso: (v: string) => void;
    fEstado: string;
    setFEstado: (v: string) => void;
    soloIncompletos: boolean;
    setSoloIncompletos: Dispatch<SetStateAction<boolean>>;
    incompletosCount: number;
    marcasDisponibles: string[];
    agentesDisponibles: string[];
    pesosDisponibles: string[];
    estadosDisponibles: string[];
    fSede?: string;
    setFSede?: (v: string) => void;
    sedesFiltroDisponibles?: { value: string; label: string }[];
}

export default function ExtintorFiltrosBar({
    search, setSearch,
    fMarca, setFMarca,
    fAgente, setFAgente,
    fPeso, setFPeso,
    fEstado, setFEstado,
    soloIncompletos, setSoloIncompletos,
    incompletosCount,
    marcasDisponibles,
    agentesDisponibles,
    pesosDisponibles,
    estadosDisponibles,
    fSede,
    setFSede,
    sedesFiltroDisponibles,
}: ExtintorFiltrosBarProps) {
    return (
        <div className="flex flex-col gap-3 p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-sm">
            <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">🔎</span>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por N° Serie o N° Interno..."
                    className="w-full border-2 border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-zinc-800 bg-zinc-50 placeholder-zinc-400 focus:outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-600/10 transition-all"
                />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={fMarca} onChange={(e) => setFMarca(e.target.value)} className="border-2 border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 bg-zinc-50 focus:outline-none focus:border-red-600">
                    <option value="">Marca (todas)</option>
                    {marcasDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={fAgente} onChange={(e) => setFAgente(e.target.value)} className="border-2 border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 bg-zinc-50 focus:outline-none focus:border-red-600">
                    <option value="">Agente (todos)</option>
                    {agentesDisponibles.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={fPeso} onChange={(e) => setFPeso(e.target.value)} className="border-2 border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 bg-zinc-50 focus:outline-none focus:border-red-600">
                    <option value="">Peso (todos)</option>
                    {pesosDisponibles.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="border-2 border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 bg-zinc-50 focus:outline-none focus:border-red-600">
                    <option value="">Estado (todos)</option>
                    {estadosDisponibles.map((es) => <option key={es} value={es}>{es}</option>)}
                </select>
                {setFSede && sedesFiltroDisponibles && sedesFiltroDisponibles.length > 0 && (
                    <select value={fSede || ""} onChange={(e) => setFSede(e.target.value)} className="border-2 border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 bg-zinc-50 focus:outline-none focus:border-red-600">
                        <option value="">Sede (todas)</option>
                        {sedesFiltroDisponibles.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                {incompletosCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setSoloIncompletos((v) => {
                            const next = !v;
                            if (next) { setFMarca(""); setFAgente(""); setFPeso(""); setFEstado(""); setFSede?.(""); }
                            return next;
                        })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all active:scale-95 ${soloIncompletos ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-zinc-50 border-zinc-200 text-zinc-400"}`}
                    >
                        ⚠️ Solo incompletos ({incompletosCount})
                    </button>
                )}
                {(fMarca || fAgente || fPeso || fEstado || fSede || soloIncompletos) && (
                    <button
                        type="button"
                        onClick={() => { setFMarca(""); setFAgente(""); setFPeso(""); setFEstado(""); setFSede?.(""); setSoloIncompletos(false); }}
                        className="text-xs font-bold text-red-600 hover:text-red-700 px-1"
                    >
                        ✕ Limpiar filtros
                    </button>
                )}
            </div>
        </div>
    );
}
