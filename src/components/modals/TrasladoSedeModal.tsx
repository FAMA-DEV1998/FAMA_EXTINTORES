import { useState } from "react";

type Props = {
    isOpen: boolean;
    extintorNombre: string;
    sedeOrigenNombre: string;
    sedesDisponibles: { id: string; nombre: string }[];
    onClose: () => void;
    onConfirm: (data: { sedeDestinoId: string; fecha: string; motivo?: string }) => void;
    saving?: boolean;
};

export default function TrasladoSedeModal({ isOpen, extintorNombre, sedeOrigenNombre, sedesDisponibles, onClose, onConfirm, saving }: Props) {
    const [sedeDestinoId, setSedeDestinoId] = useState("");
    const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
    const [motivo, setMotivo] = useState("");

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!sedeDestinoId) return;
        onConfirm({ sedeDestinoId, fecha, motivo: motivo || undefined });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">🔀 Trasladar de Sede</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300">✕</button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Extintor</span>
                        <span className="text-sm font-bold text-zinc-100">{extintorNombre}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sede actual</span>
                        <span className="text-sm text-zinc-300">{sedeOrigenNombre}</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sede destino</label>
                        <select
                            value={sedeDestinoId}
                            onChange={(e) => setSedeDestinoId(e.target.value)}
                            className="rounded-xl px-3.5 py-2.5 text-sm font-bold border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                        >
                            <option value="">Seleccionar...</option>
                            {sedesDisponibles.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha de traslado</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="rounded-xl px-3.5 py-2.5 text-sm font-bold border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Motivo (opcional)</label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="rounded-xl px-3.5 py-2.5 text-sm border border-zinc-800 bg-zinc-950 text-white resize-none min-h-20 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end bg-zinc-900/50">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!sedeDestinoId || saving} className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50">
                        {saving ? "Trasladando..." : "Trasladar"}
                    </button>
                </div>
            </div>
        </div>
    );
}