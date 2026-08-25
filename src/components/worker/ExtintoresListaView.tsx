import { useState, type Dispatch, type SetStateAction } from "react";
import type { Socket } from "socket.io-client";
import type { EmpresaData, Extintor, Servicio, WorkerView as View } from "../../types";
import { useTraslados } from "../../hooks/dashboard";
import ExtintorFiltrosBar from "./ExtintorFiltrosBar";
import ExtintorCard from "./ExtintorCard";
import ExtintorHistorialModal from "./ExtintorHistorialModal";

interface ExtintoresListaViewProps {
    empresa: EmpresaData;
    activeId: string;
    setView: (v: View) => void;
    extintores: Extintor[];
    servicios: Servicio[];
    socket: Socket | null;

    search: string;
    setSearch: (v: string) => void;
    fMarca: string;
    setFMarca: (v: string) => void;
    fAgente: string;
    setFAgente: (v: string) => void;
    fPeso: string;
    setFPeso: (v: string) => void;
    fEstado: string;
    setFEstado: (v: string) => void;
    soloIncompletos: boolean;
    setSoloIncompletos: Dispatch<SetStateAction<boolean>>;
    incompletosCount: number;
    marcasDisponibles: string[];
    agentesDisponibles: string[];
    pesosDisponibles: string[];
    estadosDisponibles: string[];
    extintoresOrdenados: Extintor[];

    handleDelete: (rowIndex: number) => void;
    hasSedes: boolean;
    activeSedeId: string | null;
    sedeNameById: Record<string, string>;
    onTrasladar: (ext: Extintor) => void;
    onIrAlServicio: (servicio: Servicio) => void;
}

const SIN_SEDE = "__sin_sede__";

export default function ExtintoresListaView({
    empresa,
    activeId,
    setView,
    extintores,
    servicios,
    socket,
    search, setSearch,
    fMarca, setFMarca,
    fAgente, setFAgente,
    fPeso, setFPeso,
    fEstado, setFEstado,
    soloIncompletos, setSoloIncompletos,
    incompletosCount,
    marcasDisponibles,
    agentesDisponibles,
    pesosDisponibles,
    estadosDisponibles,
    extintoresOrdenados,
    handleDelete,
    hasSedes,
    activeSedeId,
    sedeNameById,
    onTrasladar,
    onIrAlServicio,
}: ExtintoresListaViewProps) {
    const [historialExt, setHistorialExt] = useState<Extintor | null>(null);
    const [fSede, setFSede] = useState("");
    const { traslados } = useTraslados(socket, historialExt?.uid);

    const agruparPorSede = hasSedes && !activeSedeId;

    const sedesFiltroDisponibles = agruparPorSede
        ? [
            ...Object.entries(sedeNameById)
                .map(([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label, "es")),
            ...(extintores.some((e) => !e.sedeId) ? [{ value: SIN_SEDE, label: "Sin sede" }] : []),
        ]
        : [];

    const extintoresFiltrados = agruparPorSede && fSede
        ? extintoresOrdenados.filter((e) => (fSede === SIN_SEDE ? !e.sedeId : e.sedeId === fSede))
        : extintoresOrdenados;

    const gruposPorSede = () => {
        const mapa = new Map<string, Extintor[]>();
        extintoresFiltrados.forEach((e) => {
            const key = e.sedeId || SIN_SEDE;
            if (!mapa.has(key)) mapa.set(key, []);
            mapa.get(key)!.push(e);
        });
        const claves = [...mapa.keys()].sort((a, b) => {
            if (a === SIN_SEDE) return 1;
            if (b === SIN_SEDE) return -1;
            return (sedeNameById[a] || "").localeCompare(sedeNameById[b] || "", "es");
        });
        return claves.map((key) => ({
            key,
            nombre: key === SIN_SEDE ? "Sin Sede" : (sedeNameById[key] || "Sede"),
            items: mapa.get(key)!,
        }));
    };

    return (
        <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-5 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4 p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-2xl shrink-0">{activeSedeId ? "🏬" : "🏢"}</div>
                <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-widest">{activeSedeId ? "Sede Activa" : "Empresa Activa"}</span>
                    <h2 className="text-base md:text-xl font-black text-zinc-800 truncate leading-tight">
                        {activeSedeId ? (sedeNameById[activeSedeId] || "Sede") : (empresa.razonSocial || activeId)}
                    </h2>
                    {activeSedeId && (
                        <p className="text-[11px] font-bold text-zinc-400 truncate mt-0.5">{empresa.razonSocial || activeId}</p>
                    )}
                </div>
                <button onClick={() => setView("home")} className="hidden sm:block text-xs font-bold text-zinc-500 hover:text-red-600 transition-colors bg-zinc-100 px-4 py-2 rounded-xl">
                    Cambiar
                </button>
            </div>

            {extintores.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-24 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl mt-2">
                    <span className="text-6xl md:text-7xl drop-shadow-sm opacity-80">🧯</span>
                    <p className="text-base font-bold text-zinc-500">Sin extintores registrados</p>
                    <p className="text-xs text-zinc-400 text-center max-w-64">Los extintores nuevos se crean dentro de un Servicio, en Historial</p>
                </div>
            ) : (
                <>
                    <ExtintorFiltrosBar
                        search={search} setSearch={setSearch}
                        fMarca={fMarca} setFMarca={setFMarca}
                        fAgente={fAgente} setFAgente={setFAgente}
                        fPeso={fPeso} setFPeso={setFPeso}
                        fEstado={fEstado} setFEstado={setFEstado}
                        soloIncompletos={soloIncompletos} setSoloIncompletos={setSoloIncompletos}
                        incompletosCount={incompletosCount}
                        marcasDisponibles={marcasDisponibles}
                        agentesDisponibles={agentesDisponibles}
                        pesosDisponibles={pesosDisponibles}
                        estadosDisponibles={estadosDisponibles}
                        fSede={fSede}
                        setFSede={agruparPorSede ? setFSede : undefined}
                        sedesFiltroDisponibles={sedesFiltroDisponibles}
                    />

                    {extintoresFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl mt-2">
                            <span className="text-5xl drop-shadow-sm opacity-80">🔍</span>
                            <p className="text-sm font-bold text-zinc-500">Ningún extintor coincide con los filtros aplicados</p>
                        </div>
                    ) : agruparPorSede ? (
                        <div className="flex flex-col gap-8 mt-2">
                            {gruposPorSede().map((g) => (
                                <div key={g.key} className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-zinc-200" />
                                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">Sede {g.nombre}</span>
                                        <div className="flex-1 h-px bg-zinc-200" />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6">
                                        {g.items.map((ext, index) => (
                                            <ExtintorCard
                                                key={ext.rowIndex}
                                                ext={ext}
                                                index={index}
                                                hasSedes={hasSedes}
                                                sedeNameById={sedeNameById}
                                                onVerHistorial={setHistorialExt}
                                                onEliminar={(ext) => handleDelete(ext.rowIndex)}
                                                onTrasladar={hasSedes ? onTrasladar : undefined}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6 mt-2">
                            {extintoresFiltrados.map((ext, index) => (
                                <ExtintorCard
                                    key={ext.rowIndex}
                                    ext={ext}
                                    index={index}
                                    hasSedes={hasSedes}
                                    sedeNameById={sedeNameById}
                                    onVerHistorial={setHistorialExt}
                                    onEliminar={(ext) => handleDelete(ext.rowIndex)}
                                    onTrasladar={(hasSedes && !activeSedeId) ? onTrasladar : undefined}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
            <div className="min-h-8 w-full shrink-0" />

            <ExtintorHistorialModal
                extintor={historialExt}
                servicios={servicios}
                traslados={traslados}
                sedeNameById={sedeNameById}
                onClose={() => setHistorialExt(null)}
                onIrAlServicio={(s) => { setHistorialExt(null); onIrAlServicio(s); }}
            />
        </div>
    );
}
