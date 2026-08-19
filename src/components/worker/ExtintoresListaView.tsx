import type { Dispatch, SetStateAction } from "react";
import { ESTADO_BADGE } from "../../constants";
import type { EmpresaData, Extintor, FormData, WorkerView as View } from "../../types";
import { emptyForm, esExtintorIncompleto, getCamposFaltantes } from "../../utils/helpers";

interface ExtintoresListaViewProps {
    empresa: EmpresaData;
    activeId: string;
    setView: (v: View) => void;
    extintores: Extintor[];

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
    extintoresOrdenados: Extintor[];

    handleEdit: (ext: Extintor) => void;
    handleDelete: (rowIndex: number) => void;
    setForm: (f: FormData) => void;
    setEditingRow: (r: number | null) => void;
}

export default function ExtintoresListaView({
    empresa,
    activeId,
    setView,
    extintores,
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
    extintoresOrdenados,
    handleEdit,
    handleDelete,
    setForm,
    setEditingRow,
}: ExtintoresListaViewProps) {
    return (
        <>
            <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-5 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-4 p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-2xl shrink-0">🏢</div>
                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Empresa Activa</span>
                        <h2 className="text-base md:text-xl font-black text-zinc-800 truncate leading-tight">
                            {empresa.razonSocial || activeId}
                        </h2>
                    </div>
                    <button onClick={() => setView("home")} className="hidden sm:block text-xs font-bold text-zinc-500 hover:text-red-600 transition-colors bg-zinc-100 px-4 py-2 rounded-xl">
                        Cambiar
                    </button>
                </div>

                {extintores.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-24 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl mt-2">
                        <span className="text-6xl md:text-7xl drop-shadow-sm opacity-80">🧯</span>
                        <p className="text-base font-bold text-zinc-500">Sin extintores registrados</p>
                        <button onClick={() => setView("form")} className="px-8 py-3.5 mt-2 bg-red-700 text-white font-bold rounded-xl text-sm hover:bg-red-600 transition-all shadow-md active:scale-95">
                            Agregar el primero
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Búsqueda y filtros de visualización */}
                        <div className="flex flex-col gap-3 p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-sm mt-2">
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
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                                {incompletosCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSoloIncompletos((v) => {
                                            const next = !v;
                                            if (next) { setFMarca(""); setFAgente(""); setFPeso(""); setFEstado(""); }
                                            return next;
                                        })}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all active:scale-95 ${soloIncompletos ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-zinc-50 border-zinc-200 text-zinc-400"}`}
                                    >
                                        ⚠️ Solo incompletos ({incompletosCount})
                                    </button>
                                )}
                                {(fMarca || fAgente || fPeso || fEstado || soloIncompletos) && (
                                    <button
                                        type="button"
                                        onClick={() => { setFMarca(""); setFAgente(""); setFPeso(""); setFEstado(""); setSoloIncompletos(false); }}
                                        className="text-xs font-bold text-red-600 hover:text-red-700 px-1"
                                    >
                                        ✕ Limpiar filtros
                                    </button>
                                )}
                            </div>
                        </div>

                        {extintoresOrdenados.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl mt-2">
                                <span className="text-5xl drop-shadow-sm opacity-80">🔍</span>
                                <p className="text-sm font-bold text-zinc-500">Ningún extintor coincide con los filtros aplicados</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6 mt-2">
                                {extintoresOrdenados.map((ext, index) => (
                                    <div key={ext.rowIndex} className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col hover:-translate-y-1">

                                        <div className="flex items-center justify-between px-5 py-4 bg-zinc-50/80 border-b border-zinc-100">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-700 font-black text-sm shrink-0">
                                                    {index + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <span className="block text-base md:text-lg font-black text-zinc-800 truncate">
                                                        {ext.nSerie || "S/N"}
                                                    </span>
                                                    {ext.nInterno && (
                                                        <span className="block text-[10px] font-bold text-zinc-400 truncate">N° Interno: {ext.nInterno}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0 ml-2">
                                                {ext.evidencia === "__HAS_EVIDENCIA__" && (
                                                    <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-sm flex items-center justify-center relative" title={`${ext.evidenciaCount || 1} foto(s)`}>
                                                        📷
                                                        {(ext.evidenciaCount || 0) > 1 && (
                                                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">{ext.evidenciaCount}</span>
                                                        )}
                                                    </span>
                                                )}
                                                <button onClick={() => handleEdit(ext)} className="w-9 h-9 rounded-xl bg-white border border-zinc-200 text-sm hover:bg-zinc-100 hover:text-red-600 transition-colors flex items-center justify-center shadow-sm active:scale-95" title="Editar">
                                                    ✏️
                                                </button>
                                                <button onClick={() => handleDelete(ext.rowIndex)} className="w-9 h-9 rounded-xl bg-white border border-zinc-200 text-sm hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center shadow-sm active:scale-95" title="Eliminar">
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>

                                        <div className="px-5 py-5 flex flex-col gap-3 flex-1">
                                            {esExtintorIncompleto(ext) && (
                                                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                                                    <span className="shrink-0">⚠️</span>
                                                    <span className="leading-snug">
                                                        Falta: {getCamposFaltantes(ext).join(", ")}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Marca</span>
                                                    <span className="font-bold text-zinc-800 text-sm truncate">{ext.marca || "—"}</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Agente</span>
                                                    <span className="font-bold text-zinc-800 text-sm truncate">{ext.agenteExtintor || "—"}</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Peso</span>
                                                    <span className="font-black text-zinc-800 text-sm">{ext.peso ? `${ext.peso} ${ext.unidadPeso}` : "—"}</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estado</span>
                                                    <span className={`inline-block w-fit font-black text-[11px] px-2 py-0.5 rounded-md border truncate ${ESTADO_BADGE[ext.estadoExtintor] || "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
                                                        {ext.estadoExtintor || "—"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400 font-semibold">
                                                {ext.fechaFabricacion && <span>Fabricación: <b className="text-zinc-600">{ext.fechaFabricacion}</b></span>}
                                                {ext.realizadoPH && <span>PH Realizado: <b className="text-zinc-600">{ext.realizadoPH}</b></span>}
                                                {ext.vencimPH && <span>Vence PH: <b className="text-zinc-600">{ext.vencimPH}</b></span>}
                                            </div>

                                            <div className="w-full h-px bg-zinc-100 my-1" />

                                            <div className="flex flex-wrap gap-2 mt-auto">
                                                {ext.ma === "SI" && <span className="bg-red-50 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-red-100 shadow-sm">MA</span>}
                                                {ext.recarga && <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-amber-100 shadow-sm">RE: {ext.recarga}</span>}
                                                {ext.ph === "SI" && <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-blue-100 shadow-sm">PH</span>}
                                                {ext.servicioExtra && ext.servicioExtra.split(",").map(s => s.trim()).filter(Boolean).map((s) => (
                                                    <span key={s} className="bg-purple-50 text-purple-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-purple-100 shadow-sm">✨ {s}</span>
                                                ))}
                                                {!ext.ma && !ext.recarga && !ext.ph && !ext.servicioExtra && <span className="text-[10px] font-medium text-zinc-400 italic">Sin servicios registrados</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
                <div className="min-h-28 w-full shrink-0" />
            </div>

            <button
                onClick={() => { setForm(emptyForm()); setEditingRow(null); setView("form"); }}
                className="absolute bottom-6 right-6 md:bottom-8 md:right-8 w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-700 hover:bg-red-600 text-white text-4xl md:text-5xl font-light shadow-[0_10px_40px_rgba(185,28,28,0.5)] flex items-center justify-center hover:scale-105 active:scale-90 transition-all z-40"
                title="Agregar Extintor"
            >
                <span className="leading-none -mt-1 md:-mt-2">+</span>
            </button>
        </>
    );
}