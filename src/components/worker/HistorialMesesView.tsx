import { useState } from "react";
import { MESES } from "../../constants";
import type { Servicio } from "../../types";
import { anioFromFecha, mesFromFecha } from "../../utils/helpers";

const ANIO_DEFAULT = 2026;

interface HistorialMesesViewProps {
    servicios: Servicio[];
    onSelectMes: (anio: number, mes: number) => void;
    esHistorialPrevioASedes?: boolean;
}

export default function HistorialMesesView({ servicios, onSelectMes, esHistorialPrevioASedes }: HistorialMesesViewProps) {
    const [anio, setAnio] = useState(ANIO_DEFAULT);

    const aniosDisponibles = [...new Set([ANIO_DEFAULT, ...servicios.map((s) => anioFromFecha(s.fechaRetiro)).filter((y): y is number => y !== null)])]
        .sort((a, b) => b - a);

    const serviciosDelAnio = servicios.filter((s) => anioFromFecha(s.fechaRetiro) === anio);

    const countByMes: Record<number, number> = {};
    serviciosDelAnio.forEach((s) => {
        const m = mesFromFecha(s.fechaRetiro);
        if (m) countByMes[m] = (countByMes[m] || 0) + 1;
    });

    return (
        <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-5 max-w-3xl mx-auto w-full">
            {esHistorialPrevioASedes && (
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-sky-50 border-2 border-sky-200">
                    <span className="text-lg shrink-0">📁</span>
                    <p className="text-xs font-bold text-sky-700 leading-relaxed">Servicios registrados antes de que la empresa tuviera sedes. No pertenecen a ninguna sede específica.</p>
                </div>
            )}
            <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-black text-zinc-800">{esHistorialPrevioASedes ? "📁 Historial previo a sedes" : "📜 Historial"}</h2>
                <select
                    value={anio}
                    onChange={(e) => setAnio(parseInt(e.target.value))}
                    className="border-2 border-zinc-200 rounded-xl px-3.5 py-2 text-sm font-bold text-zinc-700 bg-white"
                >
                    {aniosDisponibles.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MESES.map((m) => {
                    const count = countByMes[parseInt(m.value)] || 0;
                    const hasRecord = count > 0;
                    return (
                        <button
                            key={m.value}
                            onClick={() => onSelectMes(anio, parseInt(m.value))}
                            className={`flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${hasRecord ? "bg-red-50 border-red-300" : "bg-white border-zinc-200"}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`font-black text-sm ${hasRecord ? "text-red-700" : "text-zinc-500"}`}>{m.label}</span>
                                <span className={`w-2 h-2 rounded-full ${hasRecord ? "bg-red-500" : "bg-zinc-300"}`} />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-500">{hasRecord ? `${count} servicio${count === 1 ? "" : "s"}` : "Sin registros"}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}