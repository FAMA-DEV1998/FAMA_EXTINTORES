import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Ban, Camera, ChevronLeft, ChevronRight, Cog, FireExtinguisher, FlaskConical, Gauge, Image as ImageIcon, Info, LoaderCircle, Lock, Mic, NotebookPen, Save, Sparkles, TriangleAlert, Wrench, X, CircleAlert } from "lucide-react";
import type { Socket } from "socket.io-client";
import { COMP_KEYS, COMP_LABELS, ESTADOS, MESES, PESOS_GAL, PESOS_KG, PESOS_LB, PESOS_LT } from "../../../constants";
import type { Extintor, ExtintorFormData, WorkerView as View } from "../../../types";
import { calcularVencimientoPH, confirmarCambioPH, formatVencimPH, phVenceEsteAnio, phVencida } from "../../../utils/pruebaHidrostatica";
import { estadoBloqueaComponentes, estadoBloqueaServicio, estadoBloqueaServicioExtra, estadoRequiereDatosPH, estadoSoloPermiteRecarga } from "../../../utils/estadosExtintor";
import { getCamposFaltantes, getRecargasPermitidas } from "../../../utils/extintores";
import { Card, Field, SiNo, Toggle, inputCls } from "../components/FormularioUI";
import { CreatableSelect } from "../../../components/ui/CreatableSelect";
import { MultiSelect } from "../../../components/ui/MultiSelect";
import DictadoVozModal from "../voz/DictadoVozModal";
import DuplicadoComparacionModal from "../../../components/extintores/DuplicadoComparacionModal";

const DICTADO_VOZ_HABILITADO = false;

const PASOS = [
    { titulo: "Datos", icono: FireExtinguisher, ayuda: "Copia los datos de la etiqueta del extintor. Si no los ves, déjalos en blanco." },
    { titulo: "Tipo", icono: FlaskConical, ayuda: "Indica en qué estado llegó el extintor, su agente y su peso." },
    { titulo: "Servicio", icono: Wrench, ayuda: "Marca el trabajo que le hiciste: mantenimiento, prueba hidrostática o recarga." },
    { titulo: "Piezas", icono: Cog, ayuda: "Indica qué componentes tiene instalados y agrega observaciones si hace falta." },
    { titulo: "Fotos", icono: Camera, ayuda: "Toma fotos de evidencia y revisa que todo esté completo antes de guardar." },
];

const PASO_DE_CAMPO: Record<string, number> = {
    Marca: 0, "Fabricación": 0,
    Estado: 1, Agente: 1, Peso: 1,
    Servicio: 2, "PH Realizado": 2, "Vence PH": 2,
};

const CLAVE_PASO = "fama_paso_formulario_extintor";

const leerPasoGuardado = () => {
    try {
        const valor = parseInt(sessionStorage.getItem(CLAVE_PASO) || "0", 10);
        return valor >= 0 && valor < PASOS.length ? valor : 0;
    } catch {
        return 0;
    }
};

interface ExtintorFormViewProps {
    editingRow: number | null;
    form: ExtintorFormData;
    setForm: Dispatch<SetStateAction<ExtintorFormData>>;
    setF: (k: keyof ExtintorFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleRealizadoPH: (val: string) => void;
    handleMesRealizadoPH: (val: string) => void;
    handleExtintorSave: () => void;

    socket: Socket | null;
    userRole: string;
    MARCAS: string[];
    AGENTES: string[];
    RECARGAS: string[];
    MOTIVOS_BAJA: string[];
    SERVICIOS_EXTRA: string[];

    saving: boolean;
    connected: boolean;
    sinSenal?: boolean;

    setView: (v: View) => void;
    setEditingRow: (r: number | null) => void;
    clearFormBackup: () => void;
    onCancel: () => void;

    MAX_EVIDENCIAS: number;
    removeEvidencia: (index: number) => void;
    persistFormState: () => void;
    cameraInputRef: React.RefObject<HTMLInputElement | null>;
    galleryInputRef: React.RefObject<HTMLInputElement | null>;
    compressingPhoto: boolean;
    coincidencias?: { uid: string; rowIndex: number; nSerie: string; nInterno: string; marca: string; agenteExtintor: string; peso: string; unidadPeso: string; fechaFabricacion: string; mesRealizadoPH: string; realizadoPH: string; sedeId: string | null; estadoExtintor: string; nivel: "fuerte" | "sospechosa"; camposCoincidentes: string[] }[] | null;
    onUsarExistente?: (rowIndex: number) => void;
    onCerrarAvisoDuplicado?: () => void;
    onConfirmarYGuardar?: () => void;
}

export default function ExtintorFormView({
    editingRow,
    form,
    setForm,
    setF,
    handleRealizadoPH,
    handleMesRealizadoPH,
    handleExtintorSave,
    socket,
    userRole,
    MARCAS,
    AGENTES,
    RECARGAS,
    MOTIVOS_BAJA,
    SERVICIOS_EXTRA,
    saving,
    connected,
    sinSenal = false,
    setEditingRow,
    clearFormBackup,
    onCancel,
    MAX_EVIDENCIAS,
    removeEvidencia,
    persistFormState,
    cameraInputRef,
    galleryInputRef,
    compressingPhoto,
    coincidencias,
    onUsarExistente,
    onCerrarAvisoDuplicado,
    onConfirmarYGuardar,
}: ExtintorFormViewProps) {
    const recargasPermitidas = getRecargasPermitidas(form.agenteExtintor, RECARGAS);
    const soloRecarga = estadoSoloPermiteRecarga(form.estadoExtintor);
    const servicioBloqueado = estadoBloqueaServicio(form.estadoExtintor) && !soloRecarga;
    const servicioExtraBloqueado = estadoBloqueaServicioExtra(form.estadoExtintor);
    const componentesBloqueados = estadoBloqueaComponentes(form.estadoExtintor);
    const phVencidaAlerta = phVencida(form as any);
    const phProximaAlerta = !phVencidaAlerta && phVenceEsteAnio(form as any);
    const coincidencia = coincidencias && coincidencias.length > 0 ? coincidencias[0] : null;
    const [voiceModalOpen, setVoiceModalOpen] = useState(false);
    const faltantes = getCamposFaltantes({ ...form, ma: form.ma ? "SI" : "", ph: form.ph ? "SI" : "" } as unknown as Extintor);
    const falta = (campo: string) => faltantes.includes(campo);
    const faltantesPorPaso = PASOS.map((_, i) => faltantes.filter((c) => PASO_DE_CAMPO[c] === i).length);
    const [paso, setPaso] = useState(leerPasoGuardado);
    const esUltimoPaso = paso === PASOS.length - 1;
    const contenedorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            sessionStorage.setItem(CLAVE_PASO, String(paso));
        } catch {
            return;
        }
    }, [paso]);

    useEffect(() => () => {
        try {
            sessionStorage.removeItem(CLAVE_PASO);
        } catch {
            return;
        }
    }, []);

    const irAPaso = (i: number) => {
        setPaso(Math.max(0, Math.min(PASOS.length - 1, i)));
        contenedorRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    };

    const cancelar = () => {
        onCancel();
        setEditingRow(null);
        clearFormBackup();
    };

    const aplicarDictado = (campos: Partial<ExtintorFormData>) => {
        setForm((p) => {
            const next = { ...p, ...campos };
            if (campos.mesRealizadoPH !== undefined || campos.realizadoPH !== undefined) {
                next.vencimPH = calcularVencimientoPH(next.mesRealizadoPH, next.realizadoPH);
            }
            return next;
        });
    };

    return (
        <div ref={contenedorRef} className="scroll-area h-full overflow-y-auto flex flex-col">
            {coincidencia && onUsarExistente && onConfirmarYGuardar && onCerrarAvisoDuplicado && (
                <DuplicadoComparacionModal
                    coincidencia={coincidencia}
                    nuevo={form}
                    saving={saving}
                    onUsarExistente={() => onUsarExistente(coincidencia.rowIndex)}
                    onConfirmarNuevo={onConfirmarYGuardar}
                    onSeguirEditando={onCerrarAvisoDuplicado}
                />
            )}

            <nav className="sticky top-0 z-20 bg-zinc-50/95 backdrop-blur border-b border-zinc-200 px-3 md:px-8 py-3" aria-label="Pasos del registro">
                <ol className="max-w-3xl mx-auto grid grid-cols-5 gap-1.5">
                    {PASOS.map((p, i) => {
                        const Icono = p.icono;
                        const activo = paso === i;
                        const pendientes = faltantesPorPaso[i];
                        return (
                            <li key={p.titulo}>
                                <button
                                    type="button"
                                    onClick={() => irAPaso(i)}
                                    aria-current={activo ? "step" : undefined}
                                    className={`relative w-full flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${activo ? "bg-red-700 text-white shadow-md" : "bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}
                                >
                                    <Icono className="w-4 h-4" />
                                    <span className="truncate max-w-full px-1">{p.titulo}</span>
                                    {pendientes > 0 && (
                                        <span className={`absolute -top-1.5 -right-1 min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center border-2 ${activo ? "bg-amber-400 text-amber-950 border-red-700" : "bg-amber-400 text-amber-950 border-zinc-50"}`} title={`${pendientes} dato(s) por completar`}>
                                            {pendientes}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </nav>

            <div className="flex-1 p-4 md:p-8 flex flex-col gap-5 max-w-3xl mx-auto w-full">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-black text-red-700 uppercase tracking-widest">Paso {paso + 1} de {PASOS.length} · {editingRow !== null ? "Editando extintor" : "Nuevo extintor"}</p>
                        <p className="text-sm font-bold text-zinc-500 mt-1">{PASOS[paso].ayuda}</p>
                    </div>
                    {DICTADO_VOZ_HABILITADO && (
                        <button
                            type="button"
                            onClick={() => setVoiceModalOpen(true)}
                            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-black shadow-md active:scale-95 transition-all"
                        >
                            <Mic className="w-4 h-4" />
                            Registrar por Voz
                        </button>
                    )}
                </div>

                {paso === 0 && (
                    <Card title={editingRow !== null ? "Editar Extintor" : "Nuevo Extintor"} icon={FireExtinguisher}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <Field label="N° Serie">
                                <input className={inputCls} value={form.nSerie} onChange={(e) => setForm((p) => ({ ...p, nSerie: e.target.value.toUpperCase() }))} placeholder="Ej: ABC-12345" />
                            </Field>
                            <Field label="N° Interno">
                                <input className={inputCls} value={form.nInterno} onChange={(e) => setForm((p) => ({ ...p, nInterno: e.target.value.toUpperCase() }))} placeholder="Identificador interno" />
                            </Field>
                            <Field label="Marca" faltante={falta("Marca")}>
                                <CreatableSelect
                                    value={form.marca}
                                    onChange={(v) => setForm((p) => ({ ...p, marca: v }))}
                                    options={MARCAS}
                                    placeholder="Seleccionar marca..."
                                    catalogType="marca"
                                    socket={socket}
                                    userRole={userRole}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Año de Fabricación" faltante={falta("Fabricación")}>
                                <input className={inputCls} value={form.fechaFabricacion} onChange={setF("fechaFabricacion")} placeholder="Ej: 2020" inputMode="numeric" maxLength={4} />
                            </Field>
                        </div>
                    </Card>
                )}

                {paso === 1 && (
                    <>
                        <Card title="Características del Extintor" icon={FlaskConical}>
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-4">
                                    <Field label="Estado" faltante={falta("Estado")}>
                                        <select className={inputCls} value={form.estadoExtintor} onChange={(e) => setForm((p) => {
                                            const nuevoEstado = e.target.value;
                                            const next = { ...p, estadoExtintor: nuevoEstado };
                                            if (estadoSoloPermiteRecarga(nuevoEstado)) {
                                                next.ma = false; next.ph = false;
                                            } else if (estadoBloqueaServicio(nuevoEstado)) {
                                                next.ma = false; next.ph = false; next.recarga = "";
                                            }
                                            if (estadoBloqueaServicioExtra(nuevoEstado)) {
                                                next.servicioExtra = "";
                                            }
                                            if (p.estadoExtintor === "De Baja" && nuevoEstado !== "De Baja") {
                                                next.motivoBaja = "";
                                            }
                                            return next;
                                        })}>
                                            <option value="">Seleccionar...</option>
                                            {ESTADOS.map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Agente" faltante={falta("Agente")}>
                                        <CreatableSelect
                                            value={form.agenteExtintor}
                                            onChange={(v) => setForm((p) => {
                                                const permitidas = getRecargasPermitidas(v, RECARGAS);
                                                return { ...p, agenteExtintor: v, recarga: permitidas.includes(p.recarga) ? p.recarga : "" };
                                            })}
                                            options={AGENTES}
                                            placeholder="Seleccionar..."
                                            catalogType="agente"
                                            socket={socket}
                                            userRole={userRole}
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>
                                <Field label="Peso y Unidad" faltante={falta("Peso")}>
                                    <div className="flex flex-col xl:flex-row gap-3">
                                        <div className="flex w-full rounded-xl overflow-hidden border-2 border-zinc-200 shrink-0 bg-zinc-50 shadow-sm p-1 gap-1">
                                            {(["KG", "LB", "LT", "GAL"] as const).map((u) => (
                                                <button key={u} type="button" onClick={() => setForm((p) => ({ ...p, unidadPeso: u, peso: "" }))} className={`flex-1 py-1.5 rounded-lg text-sm font-black transition-all text-center ${form.unidadPeso === u ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/50"}`}>
                                                    {u}
                                                </button>
                                            ))}
                                        </div>
                                        <select className={`${inputCls} flex-1`} value={form.peso} onChange={setF("peso")}>
                                            <option value="">Seleccionar peso...</option>
                                            {(form.unidadPeso === "LB" ? PESOS_LB : form.unidadPeso === "LT" ? PESOS_LT : form.unidadPeso === "GAL" ? PESOS_GAL : PESOS_KG).map((p) => (
                                                <option key={p} value={p}>{p} {form.unidadPeso}</option>
                                            ))}
                                        </select>
                                    </div>
                                </Field>
                            </div>
                        </Card>
                        {form.estadoExtintor === "De Baja" && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <Card title="Motivo de Baja" icon={TriangleAlert}>
                                    <MultiSelect
                                        selected={form.motivoBaja.split(",").map(v => v.trim()).filter(Boolean)}
                                        onChange={(vals) => {
                                            const motivo = vals.map((v) => v.toUpperCase().trim()).join(", ");
                                            setForm((p) => ({ ...p, motivoBaja: motivo }));
                                        }}
                                        options={MOTIVOS_BAJA}
                                        label="Seleccionar Motivos"
                                        catalogType="motivo_baja"
                                        socket={socket}
                                        userRole={userRole}
                                        className={inputCls}
                                    />
                                </Card>
                            </div>
                        )}
                    </>
                )}

                {paso === 2 && (
                    <>
                        <Card title="Servicio Realizado" icon={Wrench} faltante={falta("Servicio")}>
                            <div className="flex flex-col gap-4 h-full">
                                {servicioBloqueado ? (
                                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 border-2 border-zinc-200 text-zinc-500 text-sm font-bold">
                                        <Ban className="w-4 h-4 shrink-0" />El estado "{form.estadoExtintor}" no permite registrar servicios
                                    </div>
                                ) : (
                                    <>
                                        {soloRecarga ? (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                                                <Info className="w-4 h-4 shrink-0" />El estado "{form.estadoExtintor}" solo permite registrar Recarga
                                            </div>
                                        ) : (
                                            <>
                                                <Toggle checked={form.ma} label="MA — Mantenimiento" onChange={() => setForm((p) => {
                                                    const next = !p.ma;
                                                    return next ? { ...p, ma: true, ph: false, recarga: "" } : { ...p, ma: false };
                                                })} />
                                                <Toggle checked={form.ph} label="PH — Prueba Hidrostática" onChange={async () => {
                                                    if (form.ph) {
                                                        setForm((p) => ({ ...p, ph: false }));
                                                        return;
                                                    }
                                                    const hoy = new Date();
                                                    const mesActual = String(hoy.getMonth() + 1);
                                                    const anioActual = String(hoy.getFullYear());
                                                    if (!(await confirmarCambioPH(form.mesRealizadoPH, form.realizadoPH, mesActual, anioActual))) return;
                                                    setForm((p) => ({
                                                        ...p, ph: true, ma: false,
                                                        mesRealizadoPH: mesActual,
                                                        realizadoPH: anioActual,
                                                        vencimPH: calcularVencimientoPH(mesActual, anioActual),
                                                    }));
                                                }} />
                                            </>
                                        )}

                                        <Field label="Recarga (Seleccione una opción)" className="mt-auto pt-2">
                                            <div className="flex flex-col gap-2">
                                                {recargasPermitidas.map((r) => (
                                                    <button key={r} type="button" onClick={() => setForm((p) => {
                                                        const nextRecarga = p.recarga === r ? "" : r;
                                                        return nextRecarga ? { ...p, recarga: nextRecarga, ma: false } : { ...p, recarga: "" };
                                                    })} className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${form.recarga === r ? "bg-amber-500 border-amber-400 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-500 hover:border-amber-300"}`}>
                                                        RE — {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </Field>
                                    </>
                                )}
                            </div>
                        </Card>
                        <Card title="Prueba Hidrostática" icon={Gauge}>
                            <div className="flex flex-col gap-5">
                                <Field label="Mes Realizado PH">
                                    <select className={`${inputCls} ${form.ph ? "opacity-60 cursor-not-allowed" : ""}`} value={form.mesRealizadoPH} disabled={!!form.ph} onChange={(e) => handleMesRealizadoPH(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </Field>
                                <Field label="Año Realizado PH" faltante={falta("PH Realizado")}>
                                    <input className={`${inputCls} ${form.ph ? "opacity-60 cursor-not-allowed" : ""}`} value={form.realizadoPH} disabled={!!form.ph} onChange={(e) => handleRealizadoPH(e.target.value)} placeholder="Ej: 2024" inputMode="numeric" maxLength={4} />
                                </Field>
                                <Field label="Vencimiento PH (Automático +5)" faltante={falta("Vence PH")}>
                                    <input className={`${inputCls} bg-zinc-100 text-zinc-500 border-dashed cursor-not-allowed`} value={formatVencimPH(form.vencimPH)} readOnly placeholder="Se calcula solo" />
                                </Field>
                                {form.ph && (
                                    <p className="flex items-start gap-1.5 text-[11px] font-bold text-zinc-500"><Lock className="w-3.5 h-3.5 shrink-0 mt-px" />Desactiva "PH — Prueba Hidrostática" para modificar el mes/año</p>
                                )}
                                {estadoRequiereDatosPH(form.estadoExtintor) && phVencidaAlerta ? (
                                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                                        <CircleAlert className="w-4 h-4 shrink-0" />
                                        <span className="leading-snug">Prueba hidrostática vencida — realizar urgentemente</span>
                                    </div>
                                ) : estadoRequiereDatosPH(form.estadoExtintor) && phProximaAlerta && (
                                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                                        <TriangleAlert className="w-4 h-4 shrink-0" />
                                        <span className="leading-snug">Debe realizarse la prueba hidrostática este mes</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                        <Card title="Servicio Extra" icon={Sparkles}>
                            <div className="flex flex-col h-full">
                                {servicioExtraBloqueado ? (
                                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 border-2 border-zinc-200 text-zinc-500 text-sm font-bold">
                                        <Ban className="w-4 h-4 shrink-0" />El estado "{form.estadoExtintor}" no permite registrar servicios
                                    </div>
                                ) : (
                                    <MultiSelect
                                        selected={form.servicioExtra.split(",").map(v => v.trim()).filter(Boolean)}
                                        onChange={(vals) => {
                                            const extra = vals.map((v) => v.toUpperCase().trim()).join(", ");
                                            setForm((p) => ({ ...p, servicioExtra: extra }));
                                        }}
                                        options={SERVICIOS_EXTRA}
                                        label="Servicios adicionales"
                                        catalogType="servicio_extra"
                                        socket={socket}
                                        userRole={userRole}
                                        className={inputCls}
                                    />
                                )}
                            </div>
                        </Card>
                    </>
                )}

                {paso === 3 && (
                    <>
                        <Card title="Componentes Instalados" icon={Cog}>
                            {componentesBloqueados ? (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-200 text-zinc-500 text-sm font-bold">
                                    <Ban className="w-4 h-4 shrink-0" />El estado "{form.estadoExtintor}" no permite registrar componentes instalados
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-x-6 lg:gap-x-10 gap-y-3 w-full">
                                    {COMP_KEYS.map((k) => (
                                        <div key={k} className="flex items-center w-full min-w-0 gap-3 py-2 border-b border-zinc-100 sm:border-0 md:border-b lg:border-0">
                                            <span className="text-sm font-bold text-zinc-700 flex-1 truncate">
                                                {COMP_LABELS[k]}
                                            </span>
                                            <SiNo value={form[k]} onChange={(v) => setForm((p) => ({ ...p, [k]: v }))} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                        <Card title="Observaciones" icon={NotebookPen}>
                            <div className="flex flex-col gap-3 h-full">
                                {(form.motivoBaja || form.servicioExtra) && (
                                    <div className="flex flex-col gap-1.5 p-3 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-xl">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Se adjuntará al reporte final:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {form.motivoBaja.split(", ").filter(Boolean).map(m => (
                                                <span key={m} className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md"><TriangleAlert className="w-3 h-3" />{m}</span>
                                            ))}
                                            {form.servicioExtra.split(", ").filter(Boolean).map(s => (
                                                <span key={s} className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-md"><Sparkles className="w-3 h-3" />{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    className={`${inputCls} resize-none flex-1 w-full min-h-30`}
                                    value={form.observaciones}
                                    onChange={setF("observaciones")}
                                    placeholder="Escribe aquí notas adicionales o detalles específicos..."
                                />
                            </div>
                        </Card>
                    </>
                )}

                {paso === 4 && (
                    <>
                        <Card title={`Evidencia Fotográfica (${form.evidencias.length}/${MAX_EVIDENCIAS})`} icon={Camera}>
                            <div className="flex flex-col gap-4">
                                {form.evidencias.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {form.evidencias.map((b64, idx) => (
                                            <div key={idx} className="relative rounded-xl overflow-hidden border-2 border-emerald-200 bg-emerald-50/30 shadow-sm group">
                                                <img
                                                    src={`data:image/jpeg;base64,${b64}`}
                                                    alt={`Evidencia ${idx + 1}`}
                                                    className="w-full h-32 object-cover"
                                                />
                                                <div className="absolute top-1.5 left-1.5">
                                                    <span className="w-6 h-6 rounded-lg bg-black/60 text-white text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeEvidencia(idx)}
                                                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-lg flex items-center justify-center text-xs active:scale-95 transition-all"
                                                    title="Eliminar esta foto"
                                                    aria-label="Eliminar esta foto"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {form.evidencias.length < MAX_EVIDENCIAS && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { persistFormState(); cameraInputRef.current?.click(); }}
                                            disabled={compressingPhoto}
                                            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl transition-all active:scale-95 cursor-pointer group ${form.evidencias.length > 0 ? "py-5 border-zinc-200 bg-zinc-50/30 hover:bg-emerald-50/30 hover:border-emerald-300" : "py-8 border-zinc-300 bg-zinc-50/50 hover:bg-red-50/50 hover:border-red-300"}`}
                                        >
                                            {compressingPhoto ? (
                                                <div className="w-8 h-8 border-4 border-zinc-200 border-t-red-500 rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Camera className="w-8 h-8 text-zinc-500 group-hover:text-red-600 group-hover:scale-110 transition-all" />
                                                    <span className="text-sm font-bold text-zinc-600 group-hover:text-red-600 transition-colors">Cámara</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { persistFormState(); galleryInputRef.current?.click(); }}
                                            disabled={compressingPhoto}
                                            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl transition-all active:scale-95 cursor-pointer group ${form.evidencias.length > 0 ? "py-5 border-zinc-200 bg-zinc-50/30 hover:bg-emerald-50/30 hover:border-emerald-300" : "py-8 border-zinc-300 bg-zinc-50/50 hover:bg-red-50/50 hover:border-red-300"}`}
                                        >
                                            {compressingPhoto ? (
                                                <div className="w-8 h-8 border-4 border-zinc-200 border-t-red-500 rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-8 h-8 text-zinc-500 group-hover:text-red-600 group-hover:scale-110 transition-all" />
                                                    <span className="text-sm font-bold text-zinc-600 group-hover:text-red-600 transition-colors">Galería</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {form.evidencias.length >= MAX_EVIDENCIAS && (
                                    <p className="text-xs text-amber-600 font-bold text-center">Se alcanzó el límite de {MAX_EVIDENCIAS} fotos</p>
                                )}
                            </div>
                        </Card>
                        {faltantes.length > 0 && (
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-900">
                                <TriangleAlert className="w-6 h-6 shrink-0 text-amber-600" />
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <p className="text-sm font-black">
                                        {faltantes.length === 1 ? "Falta 1 dato por completar" : `Faltan ${faltantes.length} datos por completar`}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {faltantes.map((c) => (
                                            <span key={c} className="px-2 py-0.5 rounded-md bg-amber-200/80 text-[11px] font-black">{c}</span>
                                        ))}
                                    </div>
                                    <p className="text-xs font-bold text-amber-800/80">Puedes guardar igual y completarlos después.</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-zinc-200 px-3 md:px-8 py-3">
                <div className="max-w-3xl mx-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => (paso === 0 ? cancelar() : irAPaso(paso - 1))}
                        className="px-4 py-3.5 rounded-2xl border-2 border-zinc-300 text-zinc-600 font-black text-sm hover:bg-zinc-100 transition-colors active:scale-95 flex items-center gap-1.5"
                    >
                        {paso === 0 ? <X className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        {paso === 0 ? "Cancelar" : "Atrás"}
                    </button>
                    {esUltimoPaso ? (
                        <button onClick={handleExtintorSave} disabled={saving || !connected} className="flex-1 py-3.5 rounded-2xl bg-red-700 text-white font-black text-sm md:text-base disabled:opacity-50 hover:bg-red-600 shadow-xl shadow-red-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                            {saving ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? "Guardando datos..." : editingRow !== null ? "Actualizar Extintor" : "Guardar Extintor"}
                        </button>
                    ) : (
                        <>
                            <button onClick={handleExtintorSave} disabled={saving || !connected} className="px-4 py-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-black text-sm disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5" title="Guardar ahora y completar después">
                                {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span className="hidden sm:inline">Guardar ahora</span>
                            </button>
                            <button type="button" onClick={() => irAPaso(paso + 1)} className="flex-1 py-3.5 rounded-2xl bg-red-700 text-white font-black text-sm md:text-base hover:bg-red-600 shadow-xl shadow-red-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                Siguiente: {PASOS[paso + 1].titulo}
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
                {sinSenal && <p className="max-w-3xl mx-auto text-[11px] font-bold text-amber-700 mt-2 text-center">Sin señal: se guardará en este teléfono y se enviará solo cuando vuelva la conexión.</p>}
            </div>

            <DictadoVozModal
                open={voiceModalOpen}
                onClose={() => setVoiceModalOpen(false)}
                onAplicar={aplicarDictado}
                marcas={MARCAS}
                agentes={AGENTES}
                recargas={RECARGAS}
                serviciosExtra={SERVICIOS_EXTRA}
                unidadActual={form.unidadPeso}
                socket={socket}
            />
        </div>
    );
}
