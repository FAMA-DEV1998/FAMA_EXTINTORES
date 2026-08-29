interface CoincidenciaDuplicado {
    rowIndex: number;
    nSerie: string;
    nInterno: string;
    marca: string;
    agenteExtintor: string;
    peso: string;
    unidadPeso: string;
    fechaFabricacion: string;
    mesRealizadoPH?: string;
    realizadoPH?: string;
    estadoExtintor: string;
    nivel: "fuerte" | "sospechosa";
    camposCoincidentes: string[];
}

interface NuevoExtintorComparado {
    nSerie?: string;
    nInterno?: string;
    marca?: string;
    agenteExtintor?: string;
    peso?: string;
    unidadPeso?: string;
    fechaFabricacion?: string;
    mesRealizadoPH?: string;
    realizadoPH?: string;
}

interface DuplicadoComparacionModalProps {
    coincidencia: CoincidenciaDuplicado;
    nuevo: NuevoExtintorComparado;
    saving?: boolean;
    onUsarExistente: () => void;
    onConfirmarNuevo: () => void;
    onSeguirEditando: () => void;
}

const CAMPO_LABEL: Record<string, string> = {
    nSerie: "N° Serie",
    nInterno: "N° Interno",
    ph: "PH Realizado",
    marca: "Marca",
    agenteExtintor: "Agente",
    peso: "Peso",
    fechaFabricacion: "Año de Fabricación",
};

const soloPH = (mes?: string, anio?: string) => (anio ? [mes, anio].filter(Boolean).join("/") : "");

const normalizarSerie = (v: string) => (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export default function DuplicadoComparacionModal({ coincidencia, nuevo, saving, onUsarExistente, onConfirmarNuevo, onSeguirEditando }: DuplicadoComparacionModalProps) {
    const esFuerte = coincidencia.nivel === "fuerte";
    const coincide = (campo: string) => coincidencia.camposCoincidentes.includes(campo);

    const filas: { campo: string; label: string; existente: string; nuevo: string }[] = [
        { campo: "nSerie", label: "N° Serie", existente: coincidencia.nSerie, nuevo: nuevo.nSerie || "" },
        { campo: "nInterno", label: "N° Interno", existente: coincidencia.nInterno, nuevo: nuevo.nInterno || "" },
        { campo: "ph", label: "PH Realizado", existente: soloPH(coincidencia.mesRealizadoPH, coincidencia.realizadoPH), nuevo: soloPH(nuevo.mesRealizadoPH, nuevo.realizadoPH) },
        { campo: "marca", label: "Marca", existente: coincidencia.marca, nuevo: nuevo.marca || "" },
        { campo: "agenteExtintor", label: "Agente", existente: coincidencia.agenteExtintor, nuevo: nuevo.agenteExtintor || "" },
        { campo: "peso", label: "Peso", existente: [coincidencia.peso, coincidencia.unidadPeso].filter(Boolean).join(" "), nuevo: [nuevo.peso, nuevo.unidadPeso].filter(Boolean).join(" ") },
        { campo: "fechaFabricacion", label: "Año de Fabricación", existente: coincidencia.fechaFabricacion, nuevo: nuevo.fechaFabricacion || "" },
    ];

    return (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                <div className={`px-5 py-4 border-b-2 flex items-start gap-3 shrink-0 ${esFuerte ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                    <span className="text-2xl shrink-0">{esFuerte ? "🚨" : "⚠️"}</span>
                    <div className="flex flex-col gap-1">
                        <h3 className={`text-sm font-black ${esFuerte ? "text-red-800" : "text-amber-800"}`}>
                            Posible duplicado de extintores
                        </h3>
                        <p className={`text-xs leading-relaxed ${esFuerte ? "text-red-700" : "text-amber-700"}`}>
                            Coincide en {coincidencia.camposCoincidentes.map((c) => CAMPO_LABEL[c] || c).join(", ")} con un extintor ya registrado en esta misma sede.
                        </p>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4">
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-black text-zinc-400 uppercase tracking-wider px-1 mb-1.5">
                        <span>Campo</span><span>Existente</span><span>Nuevo</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        {filas.map((f) => {
                            const igual = f.campo === "nSerie" ? !!f.existente && normalizarSerie(f.existente) === normalizarSerie(f.nuevo) : f.existente === f.nuevo;
                            const match = coincide(f.campo) && !!f.existente && igual;
                            return (
                                <div key={f.campo} className={`grid grid-cols-3 gap-2 px-3 py-2 rounded-lg text-xs ${match ? (esFuerte ? "bg-red-50" : "bg-amber-50") : "bg-zinc-50"}`}>
                                    <span className="font-bold text-zinc-500">{f.label}</span>
                                    <span className={`font-bold truncate ${match ? (esFuerte ? "text-red-700" : "text-amber-700") : "text-zinc-700"}`}>{f.existente || "—"}</span>
                                    <span className={`font-bold truncate ${match ? (esFuerte ? "text-red-700" : "text-amber-700") : "text-zinc-700"}`}>{f.nuevo || "—"}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-3 px-1">Estado del extintor existente: {coincidencia.estadoExtintor || "sin estado"}</p>
                </div>

                <div className="px-5 py-4 border-t border-zinc-200 flex flex-wrap gap-2 shrink-0">
                    <button type="button" onClick={onUsarExistente} className={`px-3.5 py-2.5 rounded-xl text-xs font-black text-white ${esFuerte ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}>Usar extintor existente</button>
                    <button type="button" onClick={onConfirmarNuevo} disabled={saving} className={`px-3.5 py-2.5 rounded-xl border-2 text-xs font-black disabled:opacity-50 ${esFuerte ? "border-red-300 text-red-700 hover:bg-red-50" : "border-amber-300 text-amber-700 hover:bg-amber-50"}`}>Sí, es un extintor diferente</button>
                    <button type="button" onClick={onSeguirEditando} className="px-3.5 py-2.5 rounded-xl text-xs font-black text-zinc-500 hover:text-zinc-700">Seguir editando</button>
                </div>
            </div>
        </div>
    );
}