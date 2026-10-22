import { useState } from "react";
import { CircleCheck } from "lucide-react";
import type { ExtintorFormData } from "../../../types";
import { COMP_KEYS, COMP_LABELS, ESTADOS, MESES, PESOS_GAL, PESOS_KG, PESOS_LB, PESOS_LT } from "../../../constants";
import { GUIA_SECCION, type SeccionVoz } from "./seccionesVoz";

interface Props {
    seccion: SeccionVoz;
    form: ExtintorFormData;
    opciones: { marcas: string[]; agentes: string[]; recargas: string[]; serviciosExtra: string[]; motivosBaja: string[] };
    detectados: Set<string>;
}

const PESOS = { KG: PESOS_KG, LB: PESOS_LB, LT: PESOS_LT, GAL: PESOS_GAL };
const VISIBLES = 8;

function valorActual(id: string, f: ExtintorFormData): string {
    switch (id) {
        case "peso": return f.peso ? `${f.peso} ${f.unidadPeso}` : "";
        case "servicio": return f.ma ? "Mantenimiento" : f.ph ? "Prueba hidrostática" : "";
        case "phFecha": return [MESES.find((m) => m.value === f.mesRealizadoPH)?.label, f.realizadoPH].filter(Boolean).join(" ");
        case "componentes": return COMP_KEYS.filter((k) => f[k] === "SI").map((k) => COMP_LABELS[k]).join(", ");
        default: return String((f as Record<string, unknown>)[id] ?? "");
    }
}

function Opciones({ lista }: { lista: string[] }) {
    const [todas, setTodas] = useState(false);
    if (!lista.length) return null;
    const vistas = todas ? lista : lista.slice(0, VISIBLES);
    return (
        <div className="flex flex-wrap gap-1">
            {vistas.map((o) => <span key={o} className="px-2 py-0.5 rounded-full bg-zinc-100 text-[11px] font-bold text-zinc-600">{o}</span>)}
            {lista.length > VISIBLES && (
                <button type="button" onClick={() => setTodas((t) => !t)} className="px-2 py-0.5 rounded-full text-[11px] font-black text-red-700 hover:bg-red-50">
                    {todas ? "Ver menos" : `+${lista.length - VISIBLES} más`}
                </button>
            )}
        </div>
    );
}

export default function GuiaDictado({ seccion, form, opciones, detectados }: Props) {
    const listas: Record<string, string[]> = {
        marca: opciones.marcas,
        estadoExtintor: ESTADOS,
        agenteExtintor: opciones.agentes,
        peso: PESOS[form.unidadPeso].map((p) => `${p} ${form.unidadPeso}`),
        motivoBaja: opciones.motivosBaja,
        servicio: ["Mantenimiento", "Prueba hidrostática"],
        recarga: opciones.recargas,
        servicioExtra: opciones.serviciosExtra,
        componentes: COMP_KEYS.map((k) => COMP_LABELS[k]),
    };
    const avisos: Record<string, string> = {
        recarga: opciones.recargas.length ? "" : "Primero elige el agente en el paso Tipo: la recarga depende de él.",
    };
    return (
        <>
        <ul className="divide-y divide-zinc-100">
            {GUIA_SECCION[seccion].campos.map((c) => {
                const actual = valorActual(c.id, form);
                const detectado = detectados.has(c.id);
                return (
                    <li key={c.id} className="py-2.5 flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-black text-zinc-800">{c.etiqueta}</p>
                                <p className="text-xs text-zinc-600">Di: <b className="text-zinc-800">«{c.decir}»</b></p>
                            </div>
                            <span className={`shrink-0 max-w-[45%] truncate px-2 py-0.5 rounded-md text-[11px] font-black ${detectado ? "bg-emerald-100 text-emerald-800" : actual ? "bg-zinc-100 text-zinc-600" : "bg-amber-100 text-amber-800"}`}>
                                {detectado ? <><CircleCheck className="w-3 h-3 inline -mt-0.5 mr-1" />Dictado</> : actual ? `Ahora: ${actual}` : "Vacío"}
                            </span>
                        </div>
                        <Opciones lista={listas[c.id] ?? []} />
                        {(avisos[c.id] || c.nota) && <p className="text-[11px] font-bold text-zinc-500">{avisos[c.id] || c.nota}</p>}
                    </li>
                );
            })}
        </ul>
        <p className="pt-2 pb-1 border-t border-zinc-100 text-[11px] font-bold text-zinc-500">
            ¿Te equivocaste? Sigue hablando: «no, …», «perdón, …» o «me equivoqué, …». Se queda lo último que digas.
        </p>
        </>
    );
}
