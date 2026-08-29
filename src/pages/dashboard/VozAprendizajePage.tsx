import { useState } from "react";
import type { Socket } from "socket.io-client";
import { useVozAprendizaje } from "../../hooks/dashboard/useVozAprendizaje";

const TIPO_LABEL: Record<string, string> = {
    marca: "Marca",
    agenteExtintor: "Agente",
    estadoExtintor: "Estado",
};

export default function VozAprendizajePage({ socket, catalogs }: { socket: Socket | null; catalogs: { marcas: { value: string }[]; agentes: { value: string }[] } }) {
    const { lista, loading, saving, actualizarValor, eliminar, crear } = useVozAprendizaje(socket);
    const [filtroTipo, setFiltroTipo] = useState<string>("todos");
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [valorEdicion, setValorEdicion] = useState("");
    const [nuevoTipo, setNuevoTipo] = useState("marca");
    const [nuevaClave, setNuevaClave] = useState("");
    const [nuevoValor, setNuevoValor] = useState("");

    const filas = lista.filter((f) => filtroTipo === "todos" || f.tipo === filtroTipo);
    const tipos = Array.from(new Set(lista.map((f) => f.tipo)));

    const opcionesPara = (tipo: string) =>
        tipo === "marca" ? catalogs.marcas.map((m) => m.value) : tipo === "agenteExtintor" ? catalogs.agentes.map((a) => a.value) : [];

    const iniciarEdicion = (id: number, valorActual: string) => {
        setEditandoId(id);
        setValorEdicion(valorActual);
    };

    const guardarEdicion = (id: number) => {
        if (!valorEdicion.trim()) return;
        actualizarValor(id, valorEdicion.trim(), () => setEditandoId(null));
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
                <h1 className="text-xl font-black text-white">🎤 Aprendizaje de Dictado por Voz</h1>
                <p className="text-sm text-zinc-400">
                    Aquí puedes revisar y corregir lo que el sistema ha asociado de las transcripciones de voz de los trabajadores.
                    Cada corrección que hagas aquí refuerza directamente el aprendizaje para todos los dispositivos.
                </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
                <p className="text-sm font-bold text-white">➕ Agregar asociación manual</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white">
                        <option value="marca">Marca</option>
                        <option value="agenteExtintor">Agente</option>
                        <option value="estadoExtintor">Estado</option>
                    </select>
                    <input value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} placeholder="Texto que se escucha (ej: badier)" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600" />
                    <input value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value)} placeholder="Valor correcto (ej: Badger)" list="voz-valores-nuevo" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600" />
                    <datalist id="voz-valores-nuevo">{opcionesPara(nuevoTipo).map((v) => <option key={v} value={v} />)}</datalist>
                    <button onClick={crearManual} disabled={saving} className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-50">Guardar</button>
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
                <p className="text-sm text-zinc-500">Cargando…</p>
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
                            <span className="text-zinc-600 hidden sm:block">→</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-zinc-500">Se asocia a</p>
                                {editandoId === f.id ? (
                                    <input autoFocus value={valorEdicion} onChange={(e) => setValorEdicion(e.target.value)} list="voz-valores-edicion" onKeyDown={(e) => e.key === "Enter" && guardarEdicion(f.id)} className="w-full bg-zinc-950 border border-red-700 rounded-lg px-2 py-1 text-sm font-bold text-white" />
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
                                        <button onClick={() => iniciarEdicion(f.id, f.valor)} className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold">Corregir</button>
                                        <button onClick={() => eliminar(f.id)} className="px-2.5 py-1 rounded-lg text-zinc-500 hover:text-red-400 text-xs font-bold">Eliminar</button>
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