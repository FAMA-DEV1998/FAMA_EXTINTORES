import { MESES } from "../../constants";
import type { Servicio } from "../../types";
import { ordinalServicio } from "../../utils/helpers";

interface HistorialMesViewProps {
    anio: number;
    mes: number;
    servicios: Servicio[];
    savingServicio: boolean;
    onCrear: (fechaRetiro: string, fechaEntrega: string) => void;
    onSelectServicio: (id: string) => void;
}

export default function HistorialMesView({ anio, mes, servicios, savingServicio, onCrear, onSelectServicio }: HistorialMesViewProps) {
    const mesLabel = MESES.find((m) => parseInt(m.value) === mes)?.label || "";
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const hoy = new Date();
    const diaDefault = hoy.getFullYear() === anio && hoy.getMonth() + 1 === mes ? hoy.getDate() : 1;
    const fechaDefault = `${anio}-${pad2(mes)}-${pad2(diaDefault)}`;

    const registros = servicios
        .filter((s) => s.fechaRetiro?.startsWith(`${anio}-${pad2(mes)}`))
        .sort((a, b) => (a.secuencia ?? 0) - (b.secuencia ?? 0));

    return (
        <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-5 max-w-3xl mx-auto w-full">
            <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-black text-zinc-800">📜 {mesLabel} {anio}</h2>
                <button
                    onClick={() => onCrear(fechaDefault, fechaDefault)}
                    disabled={savingServicio}
                    className="px-4 py-2.5 rounded-xl bg-red-700 text-white font-bold text-sm hover:bg-red-600 shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                    <span className="text-lg leading-none">+</span> Registrar Servicio
                </button>
            </div>

            {registros.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl">
                    <span className="text-5xl opacity-80">📜</span>
                    <p className="text-sm font-bold text-zinc-500">Sin servicios en {mesLabel}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {registros.map((s, index) => (
                        <button
                            key={s.id}
                            onClick={() => onSelectServicio(s.id)}
                            className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl text-left hover:border-red-300 transition-all"
                        >
                            <div>
                                <p className="text-sm font-bold text-zinc-800">{ordinalServicio(index + 1)} Servicio de {mesLabel} {anio}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{s.extintorUids.length} extintor{s.extintorUids.length === 1 ? "" : "es"}</p>
                            </div>
                            <span className="text-zinc-400">›</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}