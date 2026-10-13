import type { Dispatch, SetStateAction } from "react";
import { Eye, List, TriangleAlert } from "lucide-react";

interface AvisoIncompletosProps {
    cantidad: number;
    soloIncompletos: boolean;
    setSoloIncompletos: Dispatch<SetStateAction<boolean>>;
}

export default function AvisoIncompletos({ cantidad, soloIncompletos, setSoloIncompletos }: AvisoIncompletosProps) {
    if (cantidad === 0) return null;
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-amber-400 text-amber-950 shadow-lg shadow-amber-500/20">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="relative flex w-11 h-11 shrink-0 items-center justify-center rounded-xl bg-amber-950/10">
                    <span className="absolute inset-0 rounded-xl bg-amber-50/40 animate-ping" />
                    <TriangleAlert className="relative w-6 h-6" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm md:text-base font-black leading-tight">
                        {cantidad} {cantidad === 1 ? "extintor tiene" : "extintores tienen"} información incompleta
                    </p>
                    <p className="text-xs font-bold text-amber-900/80 mt-0.5">Están marcados en amarillo. Puedes completarlos ahora o más tarde.</p>
                </div>
            </div>
            <button
                type="button"
                onClick={() => setSoloIncompletos((v) => !v)}
                className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-950 text-amber-50 text-xs font-black active:scale-95 transition-all hover:bg-amber-900"
            >
                {soloIncompletos ? <List className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {soloIncompletos ? "Ver todos" : "Ver solo incompletos"}
            </button>
        </div>
    );
}
