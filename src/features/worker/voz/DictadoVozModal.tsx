import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Check, ChevronDown, ChevronUp, CircleAlert, ListChecks, LoaderCircle, Mic, RotateCcw, Square, TriangleAlert, Wand2, X } from "lucide-react";
import type { ExtintorFormData } from "../../../types";
import { COMP_KEYS, COMP_LABELS, ESTADOS, MESES, PESOS_GAL, PESOS_KG, PESOS_LB, PESOS_LT } from "../../../constants";
import { useDictadoVoz, type ModoDictado } from "./useDictadoVoz";
import GuiaDictado from "./GuiaDictado";
import { GUIA_SECCION, normalizarVoz, type DeteccionVoz, type EstadoServicioVoz, type ResultadoVoz, type SeccionVoz } from "./seccionesVoz";

interface Catalogos { marcas: string[]; agentes: string[]; recargas: string[]; serviciosExtra: string[]; motivosBaja: string[] }

interface DictadoVozModalProps {
    open: boolean;
    seccion: SeccionVoz;
    form: ExtintorFormData;
    catalogos: Catalogos;
    socket: Socket | null;
    onClose: () => void;
    onAplicar: (cambios: Partial<ExtintorFormData>) => void;
}

interface Item { det: DeteccionVoz; cambios: Partial<ExtintorFormData>; incluir: boolean }

const PESOS: Record<ExtintorFormData["unidadPeso"], readonly string[]> = { KG: PESOS_KG, LB: PESOS_LB, LT: PESOS_LT, GAL: PESOS_GAL };

const ORDEN: Record<SeccionVoz, string[]> = {
    datos: ["nSerie", "nInterno", "marca", "fechaFabricacion"],
    tipo: ["estadoExtintor", "agenteExtintor", "peso", "motivoBaja"],
    servicio: ["servicio", "recarga", "phFecha", "servicioExtra"],
    piezas: [...COMP_KEYS, "observaciones"],
};

const DUDOSO = 0.8;

const chip = (activo: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-black transition-colors ${activo ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`;

const campoCls = "border-2 border-zinc-200 rounded-lg px-2.5 py-2 text-sm font-bold text-zinc-800 focus:border-red-400 outline-none";
const inputCls = `w-full ${campoCls}`;

function valorAprendido(campo: string, c: Partial<ExtintorFormData>): string {
    if (campo === "peso") return c.peso && c.unidadPeso ? `${c.peso} ${c.unidadPeso}` : "";
    if (campo === "phFecha") return MESES.find((m) => m.value === c.mesRealizadoPH)?.label || "";
    return String((c as Record<string, unknown>)[campo] ?? "");
}

export default function DictadoVozModal({ open, seccion, form, catalogos, socket, onClose, onAplicar }: DictadoVozModalProps) {
    const voz = useDictadoVoz();
    const [servicio, setServicio] = useState<EstadoServicioVoz | null>(null);
    const [fase, setFase] = useState<"listo" | "grabando" | "procesando" | "resultado">("listo");
    const [items, setItems] = useState<Record<string, Item>>({});
    const [ultimo, setUltimo] = useState<ResultadoVoz | null>(null);
    const [error, setError] = useState("");
    const [verGuia, setVerGuia] = useState(true);
    const modo = useRef<ModoDictado>("audio");

    useEffect(() => {
        if (!open) {
            voz.cancelar();
            setFase("listo");
            setItems({});
            setUltimo(null);
            setError("");
            setVerGuia(true);
            return;
        }
        setServicio(null);
        socket?.timeout(4000).emit("voz:estado", {}, (err: unknown, r: EstadoServicioVoz & { success: boolean }) => {
            setServicio(err || !r ? { disponible: false, listo: false, cargando: false, error: "Sin respuesta" } : r);
        });
    }, [open, seccion]);

    const contexto = useMemo(() => ({
        marcas: catalogos.marcas,
        agentes: catalogos.agentes,
        estados: ESTADOS,
        recargas: catalogos.recargas,
        serviciosExtra: catalogos.serviciosExtra,
        motivosBaja: catalogos.motivosBaja,
        meses: MESES,
        pesos: PESOS,
        componentes: Object.fromEntries(COMP_KEYS.map((k) => [k, COMP_LABELS[k]])),
        unidadActual: form.unidadPeso,
        anioActual: new Date().getFullYear(),
        servicioExtraActual: form.servicioExtra,
        motivoBajaActual: form.motivoBaja,
    }), [catalogos, form.unidadPeso, form.servicioExtra, form.motivoBaja]);

    useEffect(() => {
        voz.autoDetener.current = () => { void terminar(); };
    });

    if (!open) return null;

    const guia = GUIA_SECCION[seccion];
    const avanzado = !!servicio?.listo && voz.soporte.audio;
    const puedeDictar = !!socket && !!servicio?.disponible && (avanzado || voz.soporte.navegador);

    const empezar = async () => {
        setError("");
        modo.current = avanzado ? "audio" : "navegador";
        if (await voz.iniciar(modo.current)) setFase("grabando");
    };

    async function terminar() {
        if (fase !== "grabando" && !voz.grabando) return;
        setFase("procesando");
        const g = await voz.detener();
        if (!g.audio?.size && !g.textoNavegador) {
            setError("No se escuchó nada. Acércate al micrófono e inténtalo de nuevo.");
            return setFase(Object.keys(items).length ? "resultado" : "listo");
        }
        const audio = g.audio?.size ? await g.audio.arrayBuffer() : null;
        socket!.timeout(95000).emit("voz:reconocer", { seccion, audio, mime: g.mime, textoNavegador: g.textoNavegador, contexto }, (err: unknown, r: { success: boolean; resultado?: ResultadoVoz; error?: string }) => {
            if (err || !r?.success || !r.resultado) {
                setError(err ? "El servidor tardó demasiado en responder." : r?.error || "No se pudo interpretar el dictado.");
                return setFase(Object.keys(items).length ? "resultado" : "listo");
            }
            const res = r.resultado;
            setUltimo(res);
            setItems((prev) => {
                const next = { ...prev };
                res.detecciones.forEach((d) => {
                    next[d.campo] = { det: d, cambios: { ...d.cambios }, incluir: !!d.valor && d.confianza >= 0.55 };
                });
                return next;
            });
            if (!res.detecciones.length) setError("Entendí el audio, pero no reconocí ningún dato de esta sección. Revisa qué decir en la lista de abajo.");
            setVerGuia(!res.detecciones.length);
            setFase("resultado");
        });
    }

    const editar = (campo: string, cambios: Partial<ExtintorFormData>) =>
        setItems((p) => ({ ...p, [campo]: { ...p[campo], cambios: { ...p[campo].cambios, ...cambios }, incluir: true } }));

    const reemplazar = (campo: string, cambios: Partial<ExtintorFormData>) =>
        setItems((p) => ({ ...p, [campo]: { ...p[campo], cambios, incluir: true } }));

    const alternar = (campo: string) => setItems((p) => ({ ...p, [campo]: { ...p[campo], incluir: !p[campo].incluir } }));

    const aplicar = () => {
        const cambios: Partial<ExtintorFormData> = {};
        Object.values(items).forEach(({ det, cambios: c, incluir }) => {
            if (!incluir) return;
            Object.assign(cambios, c);
            if (!det.tipoCorreccion || !det.textoOido) return;
            const final = valorAprendido(det.campo, c);
            if (!final || normalizarVoz(final) === normalizarVoz(det.textoOido)) return;
            const corregido = normalizarVoz(final) !== normalizarVoz(det.valor);
            if (!corregido && det.confianza >= 0.95) return;
            socket?.emit("voz:correcciones:save", { tipo: det.tipoCorreccion, clave: det.textoOido, valor: final, esCorreccion: corregido });
        });
        onAplicar(cambios);
        onClose();
    };

    const orden = ORDEN[seccion].filter((c) => items[c]);
    const detectados = new Set(Object.keys(items).map((c) => ((COMP_KEYS as readonly string[]).includes(c) ? "componentes" : c)));
    const incluidos = orden.filter((c) => items[c].incluir).length;

    const editor = (campo: string, it: Item) => {
        const c = it.cambios;
        const alternativas = it.det.alternativas.filter((a) => a.valor);
        switch (campo) {
            case "nSerie":
            case "nInterno":
                return (
                    <div className="flex flex-col gap-2">
                        {alternativas.length > 1 && (
                            <div className="flex flex-wrap gap-1.5">
                                {alternativas.map((a) => <button key={a.valor} type="button" className={chip(c[campo] === a.valor)} onClick={() => editar(campo, { [campo]: a.valor })}>{a.valor}</button>)}
                            </div>
                        )}
                        <input className={inputCls} value={(c[campo] as string) || ""} onChange={(e) => editar(campo, { [campo]: e.target.value.toUpperCase() })} />
                    </div>
                );
            case "fechaFabricacion":
                return <input className={inputCls} value={c.fechaFabricacion || ""} inputMode="numeric" maxLength={4} onChange={(e) => editar(campo, { fechaFabricacion: e.target.value.replace(/\D/g, "") })} />;
            case "marca":
            case "agenteExtintor": {
                const opciones = campo === "marca" ? catalogos.marcas : catalogos.agentes;
                return (
                    <div className="flex flex-col gap-2">
                        {alternativas.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {alternativas.map((a) => <button key={a.valor} type="button" className={chip(c[campo] === a.valor)} onClick={() => editar(campo, { [campo]: a.valor })}>{a.valor}</button>)}
                            </div>
                        )}
                        <select className={inputCls} value={(c[campo] as string) || ""} onChange={(e) => editar(campo, { [campo]: e.target.value })}>
                            <option value="">Elegir…</option>
                            {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                );
            }
            case "estadoExtintor":
                return <div className="flex flex-wrap gap-1.5">{ESTADOS.map((o) => <button key={o} type="button" className={chip(c.estadoExtintor === o)} onClick={() => editar(campo, { estadoExtintor: o })}>{o}</button>)}</div>;
            case "peso": {
                const unidad = c.unidadPeso || form.unidadPeso;
                return (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-1.5">
                            {(["KG", "LB", "LT", "GAL"] as const).map((u) => <button key={u} type="button" className={`flex-1 ${chip(unidad === u)}`} onClick={() => editar(campo, { unidadPeso: u, peso: PESOS[u].includes(c.peso || "") ? c.peso : "" })}>{u}</button>)}
                        </div>
                        <div className="flex flex-wrap gap-1.5">{PESOS[unidad].map((p) => <button key={p} type="button" className={chip(c.peso === p)} onClick={() => editar(campo, { peso: p, unidadPeso: unidad })}>{p}</button>)}</div>
                    </div>
                );
            }
            case "motivoBaja":
            case "servicioExtra": {
                const opciones = campo === "motivoBaja" ? catalogos.motivosBaja : catalogos.serviciosExtra;
                const activos = String(c[campo] || "").split(",").map((v) => v.trim()).filter(Boolean);
                return (
                    <div className="flex flex-wrap gap-1.5">
                        {opciones.map((o) => {
                            const valor = o.toUpperCase().trim();
                            const activo = activos.includes(valor);
                            return <button key={o} type="button" className={chip(activo)} onClick={() => editar(campo, { [campo]: (activo ? activos.filter((v) => v !== valor) : [...activos, valor]).join(", ") })}>{activo && <Check className="w-3 h-3 inline -mt-0.5 mr-1" />}{o}</button>;
                        })}
                    </div>
                );
            }
            case "servicio":
                return (
                    <div className="flex gap-1.5">
                        <button type="button" className={`flex-1 ${chip(!!c.ma)}`} onClick={() => reemplazar(campo, { ma: true, ph: false, recarga: "" })}>Mantenimiento</button>
                        <button type="button" className={`flex-1 ${chip(!!c.ph)}`} onClick={() => reemplazar(campo, { ph: true, ma: false })}>Prueba hidrostática</button>
                    </div>
                );
            case "recarga":
                return catalogos.recargas.length
                    ? <div className="flex flex-wrap gap-1.5">{catalogos.recargas.map((r) => <button key={r} type="button" className={chip(c.recarga === r)} onClick={() => editar(campo, { recarga: r, ma: false })}>{r}</button>)}</div>
                    : <p className="text-xs font-bold text-zinc-500">Primero elige el agente: la recarga depende de él.</p>;
            case "phFecha":
                return (
                    <div className="flex gap-2">
                        <select className={`${campoCls} flex-1 min-w-0`} value={c.mesRealizadoPH || ""} onChange={(e) => editar(campo, { mesRealizadoPH: e.target.value })}>
                            <option value="">Mes</option>
                            {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <input className={`${campoCls} w-24 shrink-0`} placeholder="Año" inputMode="numeric" maxLength={4} value={c.realizadoPH || ""} onChange={(e) => editar(campo, { realizadoPH: e.target.value.replace(/\D/g, "") })} />
                    </div>
                );
            case "observaciones":
                return <textarea className={`${inputCls} resize-none`} rows={3} value={c.observaciones || ""} onChange={(e) => editar(campo, { observaciones: e.target.value })} />;
            default:
                return (
                    <div className="flex gap-1.5">
                        <button type="button" className={`flex-1 ${chip((c as Record<string, unknown>)[campo] === "SI")}`} onClick={() => editar(campo, { [campo]: "SI" })}>Sí</button>
                        <button type="button" className={`flex-1 ${chip((c as Record<string, unknown>)[campo] === "")}`} onClick={() => editar(campo, { [campo]: "" })}>No</button>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label={`Dictado por voz: ${guia.titulo}`}>
            <div className="bg-zinc-50 w-full sm:max-w-2xl max-h-[96vh] sm:max-h-[92vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl">
                <div className="px-5 py-4 border-b border-zinc-200 bg-white rounded-t-2xl flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                        <h3 className="text-lg font-black text-zinc-800 flex items-center gap-2"><Mic className="w-5 h-5 text-red-600" />Dictar: {guia.titulo}</h3>
                        <p className="text-[11px] font-bold text-zinc-500 mt-0.5">
                            {!servicio ? "Comprobando el servicio de voz…"
                                : !servicio.disponible ? "Servicio de voz apagado"
                                    : avanzado ? "Reconocimiento avanzado activo"
                                        : servicio.cargando ? "Preparando el reconocimiento avanzado… se usará el del teléfono" : "Se usará el reconocimiento del teléfono"}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500" aria-label="Cerrar"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-4">
                    {servicio && !puedeDictar && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 text-sm font-bold">
                            <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                            {!servicio.disponible ? "El servicio de reconocimiento de voz no está encendido. Avisa al administrador." : "Este teléfono no permite grabar audio."}
                        </div>
                    )}

                    <div className="flex items-center gap-4 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3">
                        <button
                            type="button"
                            disabled={!puedeDictar || fase === "procesando"}
                            onClick={() => (fase === "grabando" ? terminar() : empezar())}
                            className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-40 ${fase === "grabando" ? "bg-red-600 text-white" : "bg-zinc-900 text-white"}`}
                            aria-label={fase === "grabando" ? "Terminar de dictar" : "Empezar a dictar"}
                        >
                            {fase === "procesando" ? <LoaderCircle className="w-7 h-7 animate-spin" /> : fase === "grabando" ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-7 h-7" />}
                        </button>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <p className="text-sm font-black text-zinc-700">
                                {fase === "grabando" ? `Escuchando… ${voz.segundos}s · toca para terminar` : fase === "procesando" ? "Interpretando lo que dijiste…" : fase === "resultado" ? "Toca el micrófono para dictar más o corregir" : "Toca el micrófono y habla"}
                            </p>
                            {fase === "grabando" && modo.current === "audio" && (
                                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full bg-red-500 transition-[width] duration-75" style={{ width: `${Math.round(voz.nivel * 100)}%` }} /></div>
                            )}
                            {fase === "grabando" && modo.current === "navegador" && <p className="text-xs text-zinc-500 line-clamp-2">{voz.textoVivo || "…"}</p>}
                            {ultimo && fase !== "grabando" && <p className="text-xs text-zinc-500 line-clamp-3">Entendí: «{ultimo.texto}»</p>}
                        </div>
                    </div>

                    <div className="rounded-xl border-2 border-zinc-200 bg-white">
                        <button type="button" onClick={() => setVerGuia((v) => !v)} aria-expanded={verGuia} className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left">
                            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" />Qué decir en esta sección</span>
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                                {guia.campos.length} datos<span className="hidden sm:inline"> · puedes decirlos en cualquier orden</span>
                                {verGuia ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                        </button>
                        {verGuia && (
                            <div className="px-3.5 pb-2 border-t border-zinc-100">
                                <GuiaDictado seccion={seccion} form={form} opciones={catalogos} detectados={detectados} />
                            </div>
                        )}
                    </div>

                    {(error || voz.error || ultimo?.aviso) && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                            <TriangleAlert className="w-4 h-4 shrink-0" />{error || voz.error || ultimo?.aviso}
                        </div>
                    )}

                    {orden.length > 0 && (
                        <div className="flex flex-col gap-2.5">
                            <p className="text-[11px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5" />Revisa antes de aplicar</p>
                            {orden.map((campo) => {
                                const it = items[campo];
                                const dudoso = it.det.confianza < DUDOSO || !it.det.valor;
                                return (
                                    <div key={campo} className={`rounded-xl border-2 bg-white p-3 flex flex-col gap-2 ${!it.incluir ? "border-zinc-200 opacity-60" : dudoso ? "border-amber-300" : "border-emerald-200"}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="flex items-center gap-2 text-sm font-black text-zinc-700">
                                                <input type="checkbox" className="w-4 h-4 accent-red-600" checked={it.incluir} onChange={() => alternar(campo)} />
                                                {it.det.etiqueta}
                                            </label>
                                            {dudoso && <span className="text-[11px] font-black text-amber-700">{it.det.valor ? "Verifica" : "No estoy seguro: elige"}</span>}
                                        </div>
                                        {editor(campo, it)}
                                        <p className="text-[11px] text-zinc-400">Oído: «{it.det.textoOido}»</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-zinc-200 bg-white sm:rounded-b-2xl flex gap-3 shrink-0">
                    {fase === "resultado" ? (
                        <button type="button" onClick={() => { setItems({}); setUltimo(null); setError(""); setFase("listo"); }} className="px-4 py-3 rounded-xl border-2 border-zinc-300 text-zinc-600 font-black text-sm hover:bg-zinc-100 flex items-center gap-1.5"><RotateCcw className="w-4 h-4" />Empezar de nuevo</button>
                    ) : (
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-zinc-300 text-zinc-600 font-black text-sm hover:bg-zinc-100">Cancelar</button>
                    )}
                    <button type="button" onClick={aplicar} disabled={!incluidos || fase === "grabando" || fase === "procesando"} className="flex-1 py-3 rounded-xl bg-red-700 text-white font-black text-sm hover:bg-red-600 disabled:opacity-50">
                        Aplicar {incluidos > 0 ? `${incluidos} dato${incluidos === 1 ? "" : "s"}` : ""}
                    </button>
                </div>
            </div>
        </div>
    );
}
