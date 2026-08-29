import { useState } from "react";
import type { Extintor, Servicio, TrasladoSede } from "../../types";
import { agruparCambios, diffSnapshots, mesAnioLabel, ordinalServicio, ordinalTraslado, parseEvidencias } from "../../utils/helpers";

interface ExtintorHistorialModalProps {
    extintor: Extintor | null;
    servicios: Servicio[];
    traslados?: TrasladoSede[];
    sedeNameById?: Record<string, string>;
    onClose: () => void;
    onIrAlServicio?: (servicio: Servicio) => void;
}

type Evento =
    | { tipo: "servicio"; fecha: string; secuencia: number; servicio: Servicio; anterior: Partial<Extintor> | null }
    | { tipo: "traslado"; fecha: string; secuencia: number; traslado: TrasladoSede };

export default function ExtintorHistorialModal({ extintor, servicios, traslados = [], sedeNameById = {}, onClose, onIrAlServicio }: ExtintorHistorialModalProps) {
    const [fotoZoom, setFotoZoom] = useState<string | null>(null);

    if (!extintor) return null;

    const sedeLabel = (id: string | null) => id ? (sedeNameById[id] || "—") : "Sin sede";

    const eventosServicio = servicios
        .filter((s) => s.extintorUids.includes(extintor.uid))
        .sort((a, b) => (a.secuencia ?? 0) - (b.secuencia ?? 0));
    const eventosTraslado = [...traslados].sort((a, b) => (a.secuencia ?? 0) - (b.secuencia ?? 0));

    const eventos: Evento[] = [
        ...eventosServicio.map((s, idx) => ({
            tipo: "servicio" as const,
            fecha: s.fechaRetiro,
            secuencia: s.secuencia ?? 0,
            servicio: s,
            anterior: idx > 0 ? (eventosServicio[idx - 1].extintorEstados?.[extintor.uid] || null) : null,
        })),
        ...eventosTraslado.map((t) => ({ tipo: "traslado" as const, fecha: t.fecha, secuencia: t.secuencia ?? 0, traslado: t })),
    ].sort((a, b) => a.secuencia - b.secuencia);

    const gruposPorMes: { key: string; label: string; items: Evento[] }[] = [];
    const indicePorKey = new Map<string, number>();
    eventos.forEach((ev) => {
        const key = ev.fecha ? ev.fecha.slice(0, 7) : "sin-fecha";
        if (!indicePorKey.has(key)) {
            indicePorKey.set(key, gruposPorMes.length);
            gruposPorMes.push({ key, label: ev.fecha ? mesAnioLabel(ev.fecha) : "Sin fecha", items: [] });
        }
        gruposPorMes[indicePorKey.get(key)!].items.push(ev);
    });

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-3xl max-h-[85vh] flex flex-col">
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-base font-black text-zinc-800">📜 {extintor.nSerie || "S/N"}</h3>
                        <p className="text-[11px] font-bold text-zinc-400 mt-0.5">{eventos.length} evento{eventos.length === 1 ? "" : "s"} · orden cronológico</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">✕</button>
                </div>
                <div className="px-5 py-4 overflow-y-auto flex flex-col gap-5">
                    {eventos.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-6">Sin eventos registrados</p>
                    ) : (
                        gruposPorMes.map((grupo) => {
                            let nServicio = 0;
                            let nTraslado = 0;
                            return (
                                <div key={grupo.key} className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{grupo.label}</span>
                                        <div className="flex-1 h-px bg-zinc-200" />
                                    </div>
                                    {grupo.items.map((ev) => {
                                        if (ev.tipo === "traslado") {
                                            nTraslado++;
                                            const t = ev.traslado;
                                            return (
                                                <div key={`t-${t.id}`} className="flex flex-col gap-1.5 p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60">
                                                    <span className="text-xs font-black text-amber-700">{ordinalTraslado(nTraslado)} Traslado — {grupo.label}</span>
                                                    <p className="text-xs font-bold text-zinc-700">{sedeLabel(t.sedeOrigenId)} → {sedeLabel(t.sedeDestinoId)}</p>
                                                    {t.motivo && <p className="text-xs text-zinc-500 italic">{t.motivo}</p>}
                                                </div>
                                            );
                                        }

                                        nServicio++;
                                        const s = ev.servicio;
                                        const snap = s.extintorEstados?.[extintor.uid] || {};
                                        const grupos = agruparCambios(diffSnapshots(ev.anterior, snap));
                                        const fotos = parseEvidencias(snap.evidencia);
                                        const esPrimero = ev.anterior === null;
                                        return (
                                            <div key={s.id} className="flex flex-col gap-2.5 p-3.5 rounded-2xl border border-zinc-100 bg-zinc-50/60">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-black text-red-700">{ordinalServicio(nServicio)} Servicio de {grupo.label}{Object.keys(sedeNameById).length > 0 ? ` — ${s.sedeId ? sedeLabel(s.sedeId) : "Antes de tener sedes"}` : ""}</span>
                                                    {onIrAlServicio && (
                                                        <button
                                                            onClick={() => onIrAlServicio(s)}
                                                            className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 shrink-0"
                                                        >
                                                            Ir al Servicio ›
                                                        </button>
                                                    )}
                                                </div>

                                                {s.notas && <p className="text-xs text-zinc-400 italic">{s.notas}</p>}

                                                {grupos.length > 0 && (
                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 pt-1">
                                                        {grupos.map((g) => (
                                                            <div key={g.grupo} className="flex flex-col gap-1 min-w-0">
                                                                <span className="text-[10px] font-black text-zinc-400 uppercase">{g.grupo}</span>
                                                                {g.items.map((c) => (
                                                                    <div key={c.campo} className="flex flex-col text-xs min-w-0">
                                                                        <span className="font-bold text-zinc-600 truncate">{c.campo}</span>
                                                                        <span className="text-zinc-500 wrap-break-word">{esPrimero ? c.nuevo : `${c.anterior} → ${c.nuevo}`}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {fotos.length > 0 && (
                                                    <div className="flex flex-col gap-1.5 pt-1">
                                                        <span className="text-[10px] font-black text-zinc-400 uppercase">📷 Evidencia ({fotos.length} foto{fotos.length === 1 ? "" : "s"})</span>
                                                        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-0.5">
                                                            {fotos.map((b64, fi) => (
                                                                <button
                                                                    key={fi}
                                                                    onClick={() => setFotoZoom(b64)}
                                                                    className="w-16 h-16 rounded-xl overflow-hidden border-2 border-zinc-200 shrink-0 hover:border-red-400 transition-all active:scale-95"
                                                                >
                                                                    <img src={`data:image/jpeg;base64,${b64}`} alt={`Evidencia foto ${fi + 1}`} className="w-full h-full object-cover" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {fotoZoom && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4" onClick={() => setFotoZoom(null)}>
                    <img src={`data:image/jpeg;base64,${fotoZoom}`} alt="Evidencia" className="max-w-full max-h-full object-contain rounded-xl" />
                    <button onClick={() => setFotoZoom(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center">✕</button>
                </div>
            )}
        </div>
    );
}