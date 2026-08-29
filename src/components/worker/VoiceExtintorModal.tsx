import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { FormData } from "../../types";
import { ESTADOS, MESES, PESOS_KG, PESOS_LB, PESOS_LT, PESOS_GAL } from "../../constants";
import { SiNo } from "../ui/WorkerUI";
import { useVoiceDictado, parsearComandoVoz, type DeteccionVoz } from "../../hooks/worker/useVoiceDictado";

interface VoiceExtintorModalProps {
    open: boolean;
    onClose: () => void;
    onAplicar: (campos: Partial<FormData>) => void;
    marcas: string[];
    agentes: string[];
    recargas: string[];
    serviciosExtra: string[];
    unidadActual: "KG" | "LB" | "LT" | "GAL";
    socket: Socket | null;
}

const PESOS_POR_UNIDAD_GUIA: Record<"KG" | "LB" | "LT" | "GAL", readonly string[]> = {
    KG: PESOS_KG, LB: PESOS_LB, LT: PESOS_LT, GAL: PESOS_GAL,
};

interface CategoriaGuia {
    id: string;
    icono: string;
    titulo: string;
    campos: { label: string; ejemplo: string; opciones?: string }[];
}

const CATEGORIAS_GUIA: CategoriaGuia[] = [
    {
        id: "identificacion", icono: "🧯", titulo: "Identificación",
        campos: [
            { label: "N° Serie", ejemplo: "serie ABC123" },
            { label: "N° Interno", ejemplo: "interno T045" },
            { label: "Marca", ejemplo: "marca Amerex" },
            { label: "Año fabricación", ejemplo: "año de fabricación 2020" },
        ],
    },
    {
        id: "caracteristicas", icono: "⚗️", titulo: "Características",
        campos: [
            { label: "Estado", ejemplo: "estado aprobado" },
            { label: "Agente", ejemplo: "agente PQS" },
        ],
    },
    {
        id: "peso", icono: "⚖️", titulo: "Peso y Unidad",
        campos: [{ label: "Peso", ejemplo: "peso 6 kilos" }],
    },
    {
        id: "ph", icono: "🔬", titulo: "Prueba Hidrostática",
        campos: [{ label: "PH", ejemplo: "ph realizado mayo 2024" }],
    },
    {
        id: "servicios", icono: "🔧", titulo: "Servicio",
        campos: [
            { label: "Tipo", ejemplo: "servicio mantenimiento" },
            { label: "Recarga", ejemplo: "recarga 75 por ciento" },
        ],
    },
    {
        id: "componentes", icono: "🔩", titulo: "Componentes",
        campos: [{ label: "Cambiado", ejemplo: "válvula bien, manguera mal" }],
    },
    {
        id: "extra", icono: "✨", titulo: "Adicionales",
        campos: [{ label: "Extra", ejemplo: "adicional soporte de pared" }],
    },
    {
        id: "correccion", icono: "↩️", titulo: "Corregir",
        campos: [{ label: "Corrección", ejemplo: "no, es CO2" }],
    },
];

const COMPONENTES = [
    { key: "valvula", label: "Válvula" },
    { key: "manguera", label: "Manguera" },
    { key: "manometro", label: "Manómetro" },
    { key: "tobera", label: "Tobera" },
] as const;

function Tarjeta({ icono, titulo, children, dudoso }: { icono: string; titulo: string; children: React.ReactNode; dudoso?: boolean }) {
    return (
        <div className={`rounded-xl border-2 bg-white p-3 flex flex-col gap-2 ${dudoso ? "border-amber-300" : "border-zinc-200"}`}>
            <p className="text-[11px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>{icono}</span> {titulo}
                {dudoso && <span className="text-amber-600 normal-case font-bold">· verificar</span>}
            </p>
            {children}
        </div>
    );
}

function ChipSelector({ opciones, valor, onSeleccionar }: { opciones: string[]; valor: string; onSeleccionar: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {opciones.map((o) => (
                <button
                    key={o}
                    type="button"
                    onClick={() => onSeleccionar(o)}
                    className={`px-3 py-1.5 rounded-full text-xs font-black transition-colors ${valor === o ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                >
                    {o}
                </button>
            ))}
        </div>
    );
}

export default function VoiceExtintorModal({ open, onClose, onAplicar, marcas, agentes, recargas, serviciosExtra, unidadActual, socket }: VoiceExtintorModalProps) {
    const { soportado, escuchando, transcripcion, transcripcionFinal, iniciar, detener, reiniciar, correcciones, registrarCorreccion } = useVoiceDictado(socket);
    const [detecciones, setDetecciones] = useState<DeteccionVoz[]>([]);
    const [camposBase, setCamposBase] = useState<Partial<FormData>>({});
    const aprendidoRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!open) { reiniciar(); setDetecciones([]); setCamposBase({}); aprendidoRef.current = new Set(); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const parsearYActualizar = (texto: string) => {
        if (!texto.trim()) return;
        const resultado = parsearComandoVoz(texto, { marcas, agentes, recargas, serviciosExtra, unidadActual: camposBase.unidadPeso || unidadActual, agenteActual: camposBase.agenteExtintor, correcciones });
        setDetecciones((prev) => {
            const combinadas = new Map(prev.map((d) => [d.campo, d]));
            resultado.detecciones.forEach((d) => combinadas.set(d.campo, d));
            return Array.from(combinadas.values());
        });
        setCamposBase((prev) => ({ ...prev, ...resultado.campos }));
    };

    useEffect(() => {
        if (!escuchando || !transcripcion) return;
        const timeout = setTimeout(() => parsearYActualizar(transcripcion), 600);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transcripcion, escuchando]);

    useEffect(() => {
        if (!transcripcionFinal.trim()) return;
        const resultado = parsearComandoVoz(transcripcionFinal, { marcas, agentes, recargas, serviciosExtra, unidadActual: camposBase.unidadPeso || unidadActual, agenteActual: camposBase.agenteExtintor, correcciones });
        resultado.detecciones.forEach((d) => {
            if (!d.tipoCorreccion || !d.textoOido || !d.valor) return;
            const clave = `${d.tipoCorreccion}:${d.textoOido}:${d.valor}`;
            if (aprendidoRef.current.has(clave)) return;
            aprendidoRef.current.add(clave);
            registrarCorreccion(d.tipoCorreccion, d.textoOido, d.valor, false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transcripcionFinal]);

    if (!open) return null;

    const procesar = () => {
        detener();
        parsearYActualizar(transcripcion);
    };

    const tiene = (campo: string) => detecciones.some((d) => d.campo === campo);
    const detFor = (campo: string) => detecciones.find((d) => d.campo === campo);

    const setCampo = <K extends keyof FormData>(campo: K, valor: FormData[K]) => setCamposBase((p) => ({ ...p, [campo]: valor }));

    const aplicar = () => {
        const detMarca = detFor("marca");
        if (detMarca && camposBase.marca) registrarCorreccion("marca", detMarca.textoOido, camposBase.marca, camposBase.marca !== detMarca.valor);
        const detAgente = detFor("agenteExtintor");
        if (detAgente && camposBase.agenteExtintor) registrarCorreccion("agenteExtintor", detAgente.textoOido, camposBase.agenteExtintor, camposBase.agenteExtintor !== detAgente.valor);
        const detEstado = detFor("estadoExtintor");
        if (detEstado && camposBase.estadoExtintor) registrarCorreccion("estadoExtintor", detEstado.textoOido, camposBase.estadoExtintor, camposBase.estadoExtintor !== detEstado.valor);
        const detPeso = detFor("peso");
        if (detPeso && camposBase.peso && camposBase.unidadPeso) {
            const valorActual = `${camposBase.peso} ${camposBase.unidadPeso}`;
            registrarCorreccion("peso", detPeso.textoOido, valorActual, valorActual !== detPeso.valor);
        }
        const detRecarga = detFor("recarga");
        if (detRecarga && camposBase.recarga) registrarCorreccion("recarga", detRecarga.textoOido, camposBase.recarga, camposBase.recarga !== detRecarga.valor);
        onAplicar(camposBase);
        onClose();
    };

    const hayDatos = detecciones.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-50 rounded-2xl w-full max-w-5xl h-[94vh] flex flex-col shadow-2xl">
                <div className="px-5 py-4 border-b border-zinc-200 bg-white rounded-t-2xl flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-black text-zinc-800">🎤 Registro por Voz</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">✕</button>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3 flex-1 min-h-0">
                    {!soportado ? (
                        <div className="px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 text-sm font-bold shrink-0">
                            Este dispositivo no soporta reconocimiento de voz.
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 bg-white rounded-xl border-2 border-zinc-200 px-4 py-3 shrink-0">
                            <button
                                onClick={() => (escuchando ? procesar() : iniciar())}
                                className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all active:scale-90 ${escuchando ? "bg-red-600 animate-pulse text-white" : "bg-zinc-900 text-white"}`}
                            >
                                🎤
                            </button>
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <p className="text-xs font-black text-zinc-600">{escuchando ? "Escuchando… las tarjetas se actualizan solas" : "Toca para dictar"}</p>
                                <p className="text-xs text-zinc-500 truncate">{transcripcion || "Di los datos y luego corrige diciendo \"no, es...\""}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1 gap-3 flex-1 min-h-0">
                        <div className="flex flex-col min-h-0 rounded-xl border-2 border-zinc-200 bg-white overflow-hidden">
                            <p className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 shrink-0 text-xs font-black text-zinc-600 uppercase tracking-wider">📋 Guía de Dictado</p>
                            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {CATEGORIAS_GUIA.map((c) => (
                                        <div key={c.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 flex flex-col gap-1.5">
                                            <p className="text-[11px] font-black text-zinc-700 flex items-center gap-1"><span>{c.icono}</span>{c.titulo}</p>
                                            <div className="flex flex-col gap-1">
                                                {c.campos.map((g) => (
                                                    <p key={g.label} className="text-[10px] leading-snug text-zinc-500">
                                                        <span className="font-black text-zinc-700">{g.label}:</span> "{g.ejemplo}"
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-2 pt-1 border-t border-zinc-100">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">🏭 Marcas</p>
                                        <div className="flex flex-wrap gap-1">
                                            {marcas.length > 0 ? marcas.map((m) => <span key={m} className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">{m}</span>) : <span className="text-[10px] text-zinc-400">Sin registrar aún</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">🧪 Agentes</p>
                                        <div className="flex flex-wrap gap-1">
                                            {agentes.length > 0 ? agentes.map((a) => <span key={a} className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">{a}</span>) : <span className="text-[10px] text-zinc-400">Sin registrar aún</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">✨ Adicionales</p>
                                        <div className="flex flex-wrap gap-1">
                                            {serviciosExtra.length > 0 ? serviciosExtra.map((s) => <span key={s} className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">{s}</span>) : <span className="text-[10px] text-zinc-400">Sin registrar aún</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">⚖️ Pesos por unidad</p>
                                        <div className="flex flex-col gap-1">
                                            {(["KG", "LB", "LT", "GAL"] as const).map((u) => (
                                                <div key={u} className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] font-black text-white bg-zinc-700 px-1.5 py-0.5 rounded">{u}</span>
                                                    {PESOS_POR_UNIDAD_GUIA[u].map((p) => <span key={p} className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">{p}</span>)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col min-h-0 rounded-xl border-2 border-zinc-200 bg-white overflow-hidden">
                            <p className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 shrink-0 text-xs font-black text-zinc-600 uppercase tracking-wider">🎯 Detectado en vivo — revisa y corrige antes de guardar</p>
                            <div className="flex-1 overflow-y-auto px-3 py-3">
                                {!hayDatos ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4 py-8">
                                        <span className="text-3xl opacity-60">🎙️</span>
                                        <p className="text-xs font-bold text-zinc-400">Los datos detectados aparecerán aquí mientras dictas</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {tiene("nSerie") && (
                                            <Tarjeta icono="🔖" titulo="N° Serie">
                                                <input className="w-full border-2 border-zinc-200 rounded-lg px-2.5 py-2 text-sm font-bold text-zinc-800" value={camposBase.nSerie || ""} onChange={(e) => setCampo("nSerie", e.target.value.toUpperCase())} />
                                            </Tarjeta>
                                        )}
                                        {tiene("nInterno") && (
                                            <Tarjeta icono="🏷️" titulo="N° Interno">
                                                <input className="w-full border-2 border-zinc-200 rounded-lg px-2.5 py-2 text-sm font-bold text-zinc-800" value={camposBase.nInterno || ""} onChange={(e) => setCampo("nInterno", e.target.value.toUpperCase())} />
                                            </Tarjeta>
                                        )}
                                        {tiene("marca") && (
                                            <Tarjeta icono="🏭" titulo="Marca" dudoso={(detFor("marca")?.confianza ?? 1) < 0.5}>
                                                <input list="voz-marcas" className="w-full border-2 border-zinc-200 rounded-lg px-2.5 py-2 text-sm font-bold text-zinc-800" value={camposBase.marca || ""} onChange={(e) => setCampo("marca", e.target.value)} />
                                                <datalist id="voz-marcas">{marcas.map((m) => <option key={m} value={m} />)}</datalist>
                                            </Tarjeta>
                                        )}
                                        {tiene("fechaFabricacion") && (
                                            <Tarjeta icono="📅" titulo="Año de Fabricación">
                                                <input className="w-full border-2 border-zinc-200 rounded-lg px-2.5 py-2 text-sm font-bold text-zinc-800" value={camposBase.fechaFabricacion || ""} onChange={(e) => setCampo("fechaFabricacion", e.target.value)} inputMode="numeric" maxLength={4} />
                                            </Tarjeta>
                                        )}
                                        {tiene("ph") && (
                                            <Tarjeta icono="🔬" titulo="PH Realizado">
                                                <div className="flex gap-2">
                                                    <select className="flex-1 border-2 border-zinc-200 rounded-lg px-2 py-2 text-sm font-bold text-zinc-800" value={camposBase.mesRealizadoPH || ""} onChange={(e) => setCampo("mesRealizadoPH", e.target.value)}>
                                                        <option value="">Mes</option>
                                                        {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                    </select>
                                                    <input className="w-24 border-2 border-zinc-200 rounded-lg px-2.5 py-2 text-sm font-bold text-zinc-800" value={camposBase.realizadoPH || ""} onChange={(e) => setCampo("realizadoPH", e.target.value)} placeholder="Año" inputMode="numeric" maxLength={4} />
                                                </div>
                                            </Tarjeta>
                                        )}
                                        {tiene("estadoExtintor") && (
                                            <Tarjeta icono="⚗️" titulo="Estado">
                                                <ChipSelector opciones={ESTADOS} valor={camposBase.estadoExtintor || ""} onSeleccionar={(v) => setCampo("estadoExtintor", v)} />
                                            </Tarjeta>
                                        )}
                                        {tiene("agenteExtintor") && (
                                            <Tarjeta icono="🧪" titulo="Agente" dudoso={(detFor("agenteExtintor")?.confianza ?? 1) < 0.5}>
                                                <input list="voz-agentes" className="w-full border-2 border-zinc-200 rounded-lg px-2.5 py-2 text-sm font-bold text-zinc-800" value={camposBase.agenteExtintor || ""} onChange={(e) => setCampo("agenteExtintor", e.target.value)} />
                                                <datalist id="voz-agentes">{agentes.map((a) => <option key={a} value={a} />)}</datalist>
                                            </Tarjeta>
                                        )}
                                        {tiene("peso") && (
                                            <Tarjeta icono="⚖️" titulo="Peso y Unidad">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex gap-1.5">
                                                        {(["KG", "LB", "LT", "GAL"] as const).map((u) => (
                                                            <button
                                                                key={u}
                                                                type="button"
                                                                onClick={() => setCamposBase((p) => ({ ...p, unidadPeso: u, peso: PESOS_POR_UNIDAD_GUIA[u][0] }))}
                                                                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-colors ${camposBase.unidadPeso === u ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}
                                                            >
                                                                {u}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <ChipSelector opciones={[...PESOS_POR_UNIDAD_GUIA[camposBase.unidadPeso || unidadActual]]} valor={camposBase.peso || ""} onSeleccionar={(v) => setCampo("peso", v)} />
                                                </div>
                                            </Tarjeta>
                                        )}
                                        {tiene("servicios") && (
                                            <Tarjeta icono="🔧" titulo="Servicio">
                                                <div className="flex gap-1.5">
                                                    <button type="button" onClick={() => setCamposBase((p) => ({ ...p, ma: true, ph: false }))} className={`flex-1 py-2 rounded-lg text-xs font-black transition-colors ${camposBase.ma ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}>Mantenimiento</button>
                                                    <button type="button" onClick={() => setCamposBase((p) => ({ ...p, ph: true, ma: false }))} className={`flex-1 py-2 rounded-lg text-xs font-black transition-colors ${camposBase.ph ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}>Prueba Hidrostática</button>
                                                </div>
                                            </Tarjeta>
                                        )}
                                        {tiene("recarga") && (
                                            <Tarjeta icono="♻️" titulo="Recarga">
                                                <ChipSelector opciones={recargas} valor={camposBase.recarga || ""} onSeleccionar={(v) => setCampo("recarga", v)} />
                                            </Tarjeta>
                                        )}
                                        {(tiene("valvula") || tiene("manguera") || tiene("manometro") || tiene("tobera")) && (
                                            <Tarjeta icono="🔩" titulo="Componentes Cambiados">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {COMPONENTES.map((c) => (
                                                        <div key={c.key} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-100">
                                                            <span className="text-xs font-bold text-zinc-600">{c.label}</span>
                                                            <SiNo value={(camposBase as any)[c.key] || ""} onChange={(v) => setCampo(c.key as keyof FormData, v as any)} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </Tarjeta>
                                        )}
                                        {tiene("servicioExtra") && (
                                            <Tarjeta icono="✨" titulo="Adicionales">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {serviciosExtra.map((s) => {
                                                        const activos = (camposBase.servicioExtra || "").split(",").map((v) => v.trim()).filter(Boolean);
                                                        const activo = activos.includes(s);
                                                        return (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                onClick={() => {
                                                                    const nuevos = activo ? activos.filter((v) => v !== s) : [...activos, s];
                                                                    setCampo("servicioExtra", nuevos.join(", "));
                                                                }}
                                                                className={`px-3 py-1.5 rounded-full text-xs font-black transition-colors ${activo ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                                                            >
                                                                {activo ? "✓ " : "+ "}{s}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </Tarjeta>
                                        )}
                                        {tiene("observaciones") && (
                                            <Tarjeta icono="📝" titulo="Observaciones">
                                                <textarea className="w-full border-2 border-zinc-200 rounded-lg px-2.5 py-2 text-sm font-bold text-zinc-800 resize-none" rows={2} value={camposBase.observaciones || ""} onChange={(e) => setCampo("observaciones", e.target.value)} />
                                            </Tarjeta>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-zinc-200 bg-white rounded-b-2xl flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-zinc-300 text-zinc-600 font-black text-sm hover:bg-zinc-100">Cancelar</button>
                    <button onClick={aplicar} disabled={!hayDatos} className="flex-1 py-3 rounded-xl bg-red-700 text-white font-black text-sm hover:bg-red-600 disabled:opacity-50">Confirmar y Aplicar al Formulario</button>
                </div>
            </div>
        </div>
    );
}