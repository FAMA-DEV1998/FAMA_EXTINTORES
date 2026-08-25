import { COMP_KEYS, COMP_LABELS, ESTADO_BADGE } from "../../constants";
import type { Extintor } from "../../types";
import { esExtintorIncompleto, estadoRequiereDatosPH, getCamposFaltantes, phVenceEsteAnio, phVencida } from "../../utils/helpers";

interface ExtintorCardProps {
    ext: Extintor;
    index: number;
    context?: "lista" | "historial";
    hasSedes?: boolean;
    sedeNameById?: Record<string, string>;
    onVerHistorial?: (ext: Extintor) => void;
    onEditar?: (ext: Extintor) => void;
    onEliminar?: (ext: Extintor) => void;
    onTrasladar?: (ext: Extintor) => void;
}

export default function ExtintorCard({
    ext,
    index,
    context = "lista",
    hasSedes,
    sedeNameById,
    onVerHistorial,
    onEditar,
    onEliminar,
    onTrasladar,
}: ExtintorCardProps) {
    const esHistorial = context === "historial";
    const componentesInstalados = COMP_KEYS.filter((k) => ext[k] === "SI");
    const sinDefinir = (v?: string | null) => !v || !String(v).trim();
    const datosPHRequeridos = estadoRequiereDatosPH(ext.estadoExtintor || "");
    const SinDefinir = () => <span className="text-amber-600 font-black">⚠️ Sin definir</span>;

    return (
        <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col hover:-translate-y-1">

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
                    {esHistorial && ext.evidencia === "__HAS_EVIDENCIA__" && (
                        <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-sm flex items-center justify-center relative" title={`${ext.evidenciaCount || 1} foto(s)`}>
                            📷
                            {(ext.evidenciaCount || 0) > 1 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">{ext.evidenciaCount}</span>
                            )}
                        </span>
                    )}
                    {onTrasladar && (
                        <button onClick={() => onTrasladar(ext)} className="w-9 h-9 rounded-xl bg-white border border-zinc-200 text-sm hover:bg-amber-50 hover:text-amber-600 transition-colors flex items-center justify-center shadow-sm active:scale-95" title="Trasladar de Sede">
                            🔀
                        </button>
                    )}
                    {onVerHistorial && (
                        <button onClick={() => onVerHistorial(ext)} className="w-9 h-9 rounded-xl bg-white border border-zinc-200 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center shadow-sm active:scale-95" title="Ver Historial">
                            📜
                        </button>
                    )}
                    {onEditar && (
                        <button onClick={() => onEditar(ext)} className="w-9 h-9 rounded-xl bg-white border border-zinc-200 text-sm hover:bg-zinc-100 hover:text-red-600 transition-colors flex items-center justify-center shadow-sm active:scale-95" title="Editar">
                            ✏️
                        </button>
                    )}
                    {onEliminar && (
                        <button onClick={() => onEliminar(ext)} className="w-9 h-9 rounded-xl bg-white border border-zinc-200 text-sm hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center shadow-sm active:scale-95" title={esHistorial ? "Quitar del Servicio" : "Eliminar"}>
                            🗑️
                        </button>
                    )}
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
                {phVencida(ext) ? (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                        <span className="shrink-0">🔴</span>
                        <span className="leading-snug">Prueba hidrostática vencida — realizar urgentemente</span>
                    </div>
                ) : phVenceEsteAnio(ext) && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                        <span className="shrink-0">⚠️</span>
                        <span className="leading-snug">Debe realizarse la prueba hidrostática este año</span>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Marca</span>
                        <span className="font-bold text-zinc-800 text-sm truncate">{sinDefinir(ext.marca) ? <SinDefinir /> : ext.marca}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Agente</span>
                        <span className="font-bold text-zinc-800 text-sm truncate">{sinDefinir(ext.agenteExtintor) ? <SinDefinir /> : ext.agenteExtintor}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Peso</span>
                        <span className="font-black text-zinc-800 text-sm">{ext.peso ? `${ext.peso} ${ext.unidadPeso}` : <SinDefinir />}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estado</span>
                        {sinDefinir(ext.estadoExtintor) ? (
                            <span className="inline-block w-fit font-black text-[11px] px-2 py-0.5 rounded-md border truncate bg-amber-50 text-amber-700 border-amber-200">⚠️ Sin definir</span>
                        ) : (
                            <span className={`inline-block w-fit font-black text-[11px] px-2 py-0.5 rounded-md border truncate ${ESTADO_BADGE[ext.estadoExtintor] || "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
                                {ext.estadoExtintor}
                            </span>
                        )}
                    </div>
                    {hasSedes && (
                        <div className="flex flex-col gap-0.5 col-span-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sede</span>
                            <span className="font-bold text-zinc-800 text-sm truncate">{ext.sedeId ? ((sedeNameById || {})[ext.sedeId] || "—") : "Sin sede"}</span>
                        </div>
                    )}
                    {ext.motivoBaja && (
                        <div className="flex flex-col gap-0.5 col-span-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Motivo Baja</span>
                            <span className="font-bold text-red-700 text-sm truncate">{ext.motivoBaja}</span>
                        </div>
                    )}
                    {esHistorial && ext.servicioExtra && (
                        <div className="flex flex-col gap-1 col-span-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Servicio Extra</span>
                            <div className="flex flex-wrap gap-1.5">
                                {ext.servicioExtra.split(",").map(s => s.trim()).filter(Boolean).map((s) => (
                                    <span key={s} className="bg-purple-50 text-purple-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-purple-100">✨ {s}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {esHistorial && componentesInstalados.length > 0 && (
                        <div className="flex flex-col gap-1 col-span-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Componentes Instalados</span>
                            <div className="flex flex-wrap gap-1.5">
                                {componentesInstalados.map((k) => (
                                    <span key={k} className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-blue-100">🔩 {COMP_LABELS[k]}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400 font-semibold">
                    {(ext.fechaFabricacion || datosPHRequeridos) && <span>Fab.: <b className="text-zinc-600">{sinDefinir(ext.fechaFabricacion) ? <SinDefinir /> : ext.fechaFabricacion}</b></span>}
                    {(ext.realizadoPH || datosPHRequeridos) && <span>PH Realiz.: <b className="text-zinc-600">{sinDefinir(ext.realizadoPH) ? <SinDefinir /> : ext.realizadoPH}</b></span>}
                    {(ext.vencimPH || datosPHRequeridos) && <span>PH Venc.: <b className="text-zinc-600">{sinDefinir(ext.vencimPH) ? <SinDefinir /> : ext.vencimPH}</b></span>}
                </div>

                {ext.observaciones && (
                    <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observaciones</span>
                        <span className="text-xs text-zinc-600 leading-snug">{ext.observaciones}</span>
                    </div>
                )}

                {esHistorial && (
                    <>
                        <div className="w-full h-px bg-zinc-100 my-1" />
                        <div className="flex flex-wrap gap-2 mt-auto">
                            {ext.ma === "SI" && <span className="bg-red-50 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-red-100 shadow-sm">MA</span>}
                            {ext.recarga && <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-amber-100 shadow-sm">RE: {ext.recarga}</span>}
                            {ext.ph === "SI" && <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-blue-100 shadow-sm">PH</span>}
                            {!ext.ma && !ext.recarga && !ext.ph && <span className="text-[10px] font-medium text-zinc-400 italic">Sin servicios registrados</span>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
