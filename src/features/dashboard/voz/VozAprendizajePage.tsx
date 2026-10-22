import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { ArrowRight, Cpu, LoaderCircle, Lock, Mic, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ESTADOS, MESES, PESOS_GAL, PESOS_KG, PESOS_LB, PESOS_LT } from "../../../constants";
import type { EstadoServicioVoz } from "../../worker/voz/seccionesVoz";
import { confirmar } from "../../../components/ui/Notificaciones";
import { useVozAprendizaje } from "./useVozAprendizaje";

const TIPO_LABEL: Record<string, string> = {
    marca: "Marca",
    agenteExtintor: "Agente",
    estadoExtintor: "Estado",
    mes: "Mes (PH)",
    servicioExtra: "Adicional",
    peso: "Peso",
    recarga: "Recarga",
    motivoBaja: "Motivo de baja",
};

type Lista = { value: string }[];

const PESOS_TODOS = [
    ...PESOS_KG.map((p) => `${p} KG`), ...PESOS_LB.map((p) => `${p} LB`), ...PESOS_LT.map((p) => `${p} LT`), ...PESOS_GAL.map((p) => `${p} GAL`),
];

function EstadoServicio({ socket }: { socket: Socket | null }) {
    const [estado, setEstado] = useState<EstadoServicioVoz | null>(null);
    const consultar = () => {
        setEstado(null);
        socket?.timeout(5000).emit("voz:estado", {}, (err: unknown, r: EstadoServicioVoz) => {
            setEstado(err || !r ? { disponible: false, listo: false, cargando: false, error: "El backend no respondió" } : r);
        });
    };
    useEffect(consultar, [socket]);
    const color = !estado ? "bg-zinc-600" : !estado.disponible ? "bg-red-500" : estado.listo ? "bg-emerald-500" : "bg-amber-400";
    const texto = !estado ? "Consultando…"
        : !estado.disponible ? "Apagado: el dictado no funcionará hasta que se encienda (se enciende solo con el backend)."
            : estado.listo ? `Encendido · modelo «${estado.modelo}» en ${estado.dispositivo === "cuda" ? "tarjeta de video NVIDIA" : "procesador"}`
                : estado.cargando ? "Encendido · cargando el modelo de voz (mientras tanto se usa el reconocimiento del teléfono)"
                    : `Encendido, pero el modelo no cargó: ${estado.error ?? "error desconocido"}`;
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <Cpu className="w-5 h-5 text-zinc-400 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${color}`} />Servicio de reconocimiento</p>
                <p className="text-xs text-zinc-400 mt-0.5">{texto}</p>
            </div>
            <button onClick={consultar} className="w-9 h-9 shrink-0 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center" aria-label="Actualizar estado"><RefreshCw className="w-4 h-4" /></button>
        </div>
    );
}

export default function VozAprendizajePage({ socket, catalogs, role }: { socket: Socket | null; catalogs: { marcas: Lista; agentes: Lista; recargas: Lista; motivosBaja: Lista; serviciosExtra: Lista }; role: string }) {
    const { lista, loading, saving, actualizarValor, eliminar, crear } = useVozAprendizaje(socket, role);
    const [filtroTipo, setFiltroTipo] = useState<string>("todos");
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [valorEdicion, setValorEdicion] = useState("");
    const [nuevoTipo, setNuevoTipo] = useState("marca");
    const [nuevaClave, setNuevaClave] = useState("");
    const [nuevoValor, setNuevoValor] = useState("");

    if (role !== "boss") {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-sm text-zinc-400 max-w-lg flex flex-col items-center gap-3">
                <Lock className="w-6 h-6 text-zinc-600" />
                Esta sección solo está disponible para el usuario Boss.
            </div>
        );
    }

    const filas = lista.filter((f) => filtroTipo === "todos" || f.tipo === filtroTipo);
    const tipos = Array.from(new Set(lista.map((f) => f.tipo)));

    const opcionesPara = (tipo: string): string[] => {
        switch (tipo) {
            case "marca": return catalogs.marcas.map((m) => m.value);
            case "agenteExtintor": return catalogs.agentes.map((a) => a.value);
            case "estadoExtintor": return ESTADOS;
            case "mes": return MESES.map((m) => m.label);
            case "servicioExtra": return catalogs.serviciosExtra.map((s) => s.value.toUpperCase());
            case "motivoBaja": return catalogs.motivosBaja.map((s) => s.value.toUpperCase());
            case "peso": return PESOS_TODOS;
            case "recarga": return catalogs.recargas.map((r) => r.value);
            default: return [];
        }
    };

    const iniciarEdicion = (id: number, valorActual: string) => {
        setEditandoId(id);
        setValorEdicion(valorActual);
    };

    const guardarEdicion = (id: number) => {
        if (!valorEdicion.trim()) return;
        actualizarValor(id, valorEdicion.trim(), (ok) => { if (ok) setEditandoId(null); });
    };

    const confirmarEliminar = async (id: number, clave: string) => {
        const ok = await confirmar({ titulo: "¿Eliminar esta asociación?", mensaje: `El sistema dejará de reconocer "${clave}" automáticamente.`, textoConfirmar: "Eliminar", peligro: true });
        if (ok) eliminar(id);
    };

    const crearManual = () => {
        if (!nuevaClave.trim() || !nuevoValor.trim()) return;
        crear(nuevoTipo, nuevaClave.trim(), nuevoValor.trim(), (ok) => {
            if (ok) { setNuevaClave(""); setNuevoValor(""); }
        });
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-black text-white flex items-center gap-2.5"><Mic className="w-5 h-5 text-red-500" />Dictado por Voz</h1>
                <p className="text-sm text-zinc-400">
                    Es la memoria del dictado. Cuando un trabajador dicta y corrige un dato (por ejemplo, el sistema oyó «badier» y él eligió Badger),
                    esa relación se guarda aquí y desde ese momento se reconoce sola en todos los teléfonos.
                </p>
                <p className="text-sm text-zinc-400">
                    Revísala de vez en cuando: si algo se aprendió mal, corrígelo o elimínalo. También puedes enseñar palabras nuevas antes de que alguien las dicte.
                </p>
            </div>

            <EstadoServicio socket={socket} />

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
                <p className="text-sm font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-red-500" />Enseñar una palabra</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white">
                        {Object.entries(TIPO_LABEL).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                    </select>
                    <input value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} placeholder="Texto que se escucha (ej: badier)" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600" />
                    <input value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value)} placeholder="Valor correcto (ej: Badger)" list="voz-valores-nuevo" onKeyDown={(e) => e.key === "Enter" && crearManual()} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600" />
                    <datalist id="voz-valores-nuevo">{opcionesPara(nuevoTipo).map((v) => <option key={v} value={v} />)}</datalist>
                    <button onClick={crearManual} disabled={saving || !nuevaClave.trim() || !nuevoValor.trim()} className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">{saving && <LoaderCircle className="w-4 h-4 animate-spin" />}Guardar</button>
                </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setFiltroTipo("todos")} className={`px-3 py-1.5 rounded-full text-xs font-black ${filtroTipo === "todos" ? "bg-white text-zinc-900" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}>Todos ({lista.length})</button>
                {tipos.map((t) => (
                    <button key={t} onClick={() => setFiltroTipo(t)} className={`px-3 py-1.5 rounded-full text-xs font-black ${filtroTipo === t ? "bg-white text-zinc-900" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}>
                        {TIPO_LABEL[t] || t} ({lista.filter((f) => f.tipo === t).length})
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-sm text-zinc-500 flex items-center gap-2"><LoaderCircle className="w-4 h-4 animate-spin" />Cargando…</p>
            ) : filas.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-sm text-zinc-500">
                    Todavía no hay asociaciones aprendidas de dictados por voz. Aparecerán aquí automáticamente a medida que los trabajadores dicten, o puedes agregar una manualmente arriba.
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filas.map((f) => (
                        <div key={f.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 w-20 shrink-0">{TIPO_LABEL[f.tipo] || f.tipo}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-zinc-500">Se escucha</p>
                                <p className="text-sm font-bold text-zinc-300 truncate">"{f.clave}"</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-600 hidden sm:block shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-zinc-500">Se asocia a</p>
                                {editandoId === f.id ? (
                                    <input autoFocus value={valorEdicion} onChange={(e) => setValorEdicion(e.target.value)} list="voz-valores-edicion" onKeyDown={(e) => { if (e.key === "Enter") guardarEdicion(f.id); if (e.key === "Escape") setEditandoId(null); }} className="w-full bg-zinc-950 border border-red-700 rounded-lg px-2 py-1 text-sm font-bold text-white" />
                                ) : (
                                    <p className="text-sm font-bold text-white truncate">{f.valor}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-zinc-500">{f.usos} uso{f.usos !== 1 ? "s" : ""}{f.vecesCorregido > 0 ? ` · ${f.vecesCorregido} corrección${f.vecesCorregido !== 1 ? "es" : ""}` : ""}</span>
                                {editandoId === f.id ? (
                                    <>
                                        <button onClick={() => guardarEdicion(f.id)} disabled={saving} className="px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-50">Guardar</button>
                                        <button onClick={() => setEditandoId(null)} className="px-2.5 py-1 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs font-bold">Cancelar</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => iniciarEdicion(f.id, f.valor)} className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center gap-1.5"><Pencil className="w-3 h-3" />Corregir</button>
                                        <button onClick={() => confirmarEliminar(f.id, f.clave)} className="px-2.5 py-1 rounded-lg text-zinc-500 hover:text-red-400 text-xs font-bold flex items-center gap-1.5"><Trash2 className="w-3 h-3" />Eliminar</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    <datalist id="voz-valores-edicion">{opcionesPara(filas.find((f) => f.id === editandoId)?.tipo || "").map((v) => <option key={v} value={v} />)}</datalist>
                </div>
            )}
        </div>
    );
}
