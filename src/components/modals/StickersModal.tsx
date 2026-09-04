import { useState } from "react";
import type { Extintor } from "../../types";
import { descargarBlob, generarStickersZip, type StickerData } from "../../utils/stickers";
import { formatRealizadoPH, formatVencimPH } from "../../utils/helpers";

type Props = {
    isOpen: boolean;
    extintores: Extintor[];
    empresaNombre?: string;
    sedeNombreById?: Record<string, string>;
    onClose: () => void;
};

export default function StickersModal({ isOpen, extintores, empresaNombre, sedeNombreById, onClose }: Props) {
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [busqueda, setBusqueda] = useState("");
    const [generando, setGenerando] = useState(false);
    const [progreso, setProgreso] = useState({ hecho: 0, total: 0 });

    if (!isOpen) return null;

    const q = busqueda.trim().toLowerCase();
    const filtrados = q
        ? extintores.filter((e) =>
            (e.nSerie || "").toLowerCase().includes(q) ||
            (e.nInterno || "").toLowerCase().includes(q)
        )
        : extintores;

    const toggle = (uid: string) => {
        setSeleccionados((prev) => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid); else next.add(uid);
            return next;
        });
    };

    const todosFiltradosSeleccionados = filtrados.length > 0 && filtrados.every((e) => seleccionados.has(e.uid));

    const toggleTodos = () => {
        setSeleccionados((prev) => {
            const next = new Set(prev);
            if (todosFiltradosSeleccionados) {
                filtrados.forEach((e) => next.delete(e.uid));
            } else {
                filtrados.forEach((e) => next.add(e.uid));
            }
            return next;
        });
    };

    const handleClose = () => {
        if (generando) return;
        setSeleccionados(new Set());
        setBusqueda("");
        setProgreso({ hecho: 0, total: 0 });
        onClose();
    };

    const armarEmpresaReceptora = (ext: Extintor): string => {
        const empresa = empresaNombre || "";
        const sede = ext.sedeId ? sedeNombreById?.[ext.sedeId] : undefined;
        return sede ? `${empresa}-${sede}` : empresa;
    };

    const handleGenerar = async () => {
        const elegidos = extintores.filter((e) => seleccionados.has(e.uid));
        if (elegidos.length === 0) return;
        setGenerando(true);
        setProgreso({ hecho: 0, total: elegidos.length });
        try {
            const datos: StickerData[] = elegidos.map((e) => ({
                uid: e.uid,
                nSerie: e.nSerie,
                nInterno: e.nInterno,
                empresaReceptora: armarEmpresaReceptora(e),
                capacidad: [e.peso, e.unidadPeso].filter(Boolean).join(" "),
                marca: e.marca,
                fechaFab: e.fechaFabricacion,
                ultimoPh: formatRealizadoPH(e.mesRealizadoPH, e.realizadoPH),
                proximoPh: formatVencimPH(e.vencimPH),
            }));
            const zip = await generarStickersZip(datos, (hecho, total) => setProgreso({ hecho, total }));
            descargarBlob(zip, `stickers-extintores-${Date.now()}.zip`);
            handleClose();
        } catch (err) {
            alert(err instanceof Error ? err.message : "No se pudieron generar los stickers");
        } finally {
            setGenerando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-white">🏷️ Generar Stickers</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Se genera un PNG con QR por cada extintor seleccionado.</p>
                    </div>
                    <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 shrink-0">✕</button>
                </div>

                <div className="px-6 pt-4 shrink-0 flex flex-col gap-3">
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">🔎</span>
                        <input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por N° Serie o N° Interno..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
                        />
                    </div>
                    <label className="flex items-center gap-2.5 text-sm font-bold text-zinc-300 cursor-pointer select-none">
                        <input type="checkbox" checked={todosFiltradosSeleccionados} onChange={toggleTodos} className="accent-red-600 w-4 h-4" />
                        Seleccionar todos {q ? "(filtrados)" : ""}
                    </label>
                </div>

                <div className="px-6 py-4 flex-1 overflow-y-auto">
                    {filtrados.length === 0 ? (
                        <p className="text-sm text-zinc-500 px-2 py-6 text-center">Ningún extintor coincide con la búsqueda.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {filtrados.map((ext) => {
                                const checked = seleccionados.has(ext.uid);
                                return (
                                    <label
                                        key={ext.uid}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? "bg-red-950/20 border-red-700" : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-600"}`}
                                    >
                                        <input type="checkbox" checked={checked} onChange={() => toggle(ext.uid)} className="accent-red-600 w-4 h-4 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-white text-sm leading-tight truncate">{ext.nSerie || "S/N"}</p>
                                            <p className="text-[11px] text-zinc-500 truncate">N° Interno: {ext.nInterno || "—"}</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-zinc-800 flex items-center gap-3 justify-between shrink-0 bg-zinc-900/50">
                    <span className="text-xs font-bold text-zinc-500">
                        {seleccionados.size > 0 ? `${seleccionados.size} seleccionado${seleccionados.size === 1 ? "" : "s"}` : ""}
                        {generando && progreso.total > 0 ? ` · generando ${progreso.hecho}/${progreso.total}` : ""}
                    </span>
                    <div className="flex gap-3">
                        <button onClick={handleClose} disabled={generando} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">Cancelar</button>
                        <button onClick={handleGenerar} disabled={seleccionados.size === 0 || generando} className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50">
                            {generando ? "Generando..." : `Generar Stickers (${seleccionados.size})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}