import type { Extintor } from "../../types";
import { ESTADOS, MESES, PESOS_KG, PESOS_LB, PESOS_LT, PESOS_GAL, COMP_KEYS, COMP_LABELS } from "../../constants";
import { ModalSection, ModalField, modalInput } from "../ui/ModalUI";
import { getRecargasPermitidas, estadoBloqueaServicio, estadoBloqueaServicioExtra, estadoBloqueaComponentes, calcularVencimientoPH, confirmarCambioPH, formatVencimPH, phVenceEsteAnio, phVencida } from "../../utils/helpers";
import { CreatableSelect } from "../ui/CreatableSelect";
import { MultiSelect } from "../ui/MultiSelect";
import type { Socket } from "socket.io-client";

type Props = {
    form: Partial<Extintor>;
    setForm: React.Dispatch<React.SetStateAction<Partial<Extintor>>>;
    isEditing: boolean;
    onClose: () => void;
    onSave: () => void;
    saving: boolean;
    marcas: string[];
    agentes: string[];
    recargas: string[];
    motivosBaja: string[];
    serviciosExtra: string[];
    socket: Socket | null;
    userRole: string;
};

export default function ExtintorModal({ form, setForm, isEditing, onClose, onSave, saving, marcas, agentes, recargas, motivosBaja, serviciosExtra, socket, userRole }: Props) {
    const setEF = (k: string, v: string) => {
        setForm((p) => {
            const next = { ...p, [k]: v };
            if (k === "realizadoPH") {
                next.vencimPH = calcularVencimientoPH(p.mesRealizadoPH || "", v);
            }
            if (k === "mesRealizadoPH") {
                next.vencimPH = calcularVencimientoPH(v, p.realizadoPH || "");
            }
            if (k === "agenteExtintor") {
                const permitidas = getRecargasPermitidas(v, recargas);
                if (p.recarga && !permitidas.includes(p.recarga)) next.recarga = "";
            }
            if (k === "estadoExtintor") {
                if (estadoBloqueaServicio(v)) { next.ma = ""; next.ph = ""; next.recarga = ""; }
                if (estadoBloqueaServicioExtra(v)) { next.servicioExtra = ""; }
            }
            return next;
        });
    };

    const recargasPermitidas = getRecargasPermitidas(form.agenteExtintor || "", recargas);
    const servicioBloqueado = estadoBloqueaServicio(form.estadoExtintor || "");
    const servicioExtraBloqueado = estadoBloqueaServicioExtra(form.estadoExtintor || "");
    const componentesBloqueados = estadoBloqueaComponentes(form.estadoExtintor || "");
    const phVencidaAlerta = phVencida(form as Extintor);
    const phProximaAlerta = !phVencidaAlerta && phVenceEsteAnio(form as Extintor);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-white">{isEditing ? "Editar Extintor" : "Nuevo Extintor"}</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
                </div>

                <div className="px-6 py-6 flex flex-col gap-6 overflow-y-auto flex-1">
                    {/* Datos Principales */}
                    <ModalSection title="🧯 Datos Principales">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <ModalField label="N° Serie"><input className={modalInput} value={form.nSerie || ""} onChange={(e) => setEF("nSerie", e.target.value.toUpperCase())} placeholder="Serie" /></ModalField>
                            <ModalField label="N° Interno"><input className={modalInput} value={form.nInterno || ""} onChange={(e) => setEF("nInterno", e.target.value.toUpperCase())} placeholder="Interno" /></ModalField>
                            <CreatableSelect
                                value={form.marca || ""}
                                onChange={(v) => setEF("marca", v)}
                                options={marcas}
                                placeholder="Seleccionar marca..."
                                catalogType="marca"
                                socket={socket}
                                userRole={userRole}
                                className={modalInput}
                            />
                            <ModalField label="Año Fab."><input className={modalInput} value={form.fechaFabricacion || ""} onChange={(e) => setEF("fechaFabricacion", e.target.value)} maxLength={4} placeholder="Ej: 2020" /></ModalField>
                        </div>
                    </ModalSection>

                    {/* Prueba Hidrostática */}
                    <ModalSection title="🔬 Prueba Hidrostática">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <ModalField label="Mes Realizado PH">
                                <select className={`${modalInput} ${form.ph === "SI" ? "opacity-60 cursor-not-allowed" : ""}`} value={form.mesRealizadoPH || ""} disabled={form.ph === "SI"} onChange={(e) => setEF("mesRealizadoPH", e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </ModalField>
                            <ModalField label="Año Realizado PH"><input className={`${modalInput} ${form.ph === "SI" ? "opacity-60 cursor-not-allowed" : ""}`} value={form.realizadoPH || ""} disabled={form.ph === "SI"} onChange={(e) => setEF("realizadoPH", e.target.value)} maxLength={4} placeholder="Ej: 2024" /></ModalField>
                            <ModalField label="Vencimiento PH (+5)" full><input className={`${modalInput} opacity-60`} value={formatVencimPH(form.vencimPH) || ""} readOnly placeholder="Automático" /></ModalField>
                        </div>
                        {form.ph === "SI" && (
                            <p className="mt-3 text-[11px] font-bold text-zinc-500">🔒 Desactiva "Prueba Hidrostatica (P.H)" en Servicio Realizado para modificar el mes/año</p>
                        )}
                        {phVencidaAlerta ? (
                            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-bold">
                                <span className="shrink-0">🔴</span>
                                <span className="leading-snug">Prueba hidrostática vencida — realizar urgentemente</span>
                            </div>
                        ) : phProximaAlerta && (
                            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-900/50 text-amber-400 text-xs font-bold">
                                <span className="shrink-0">⚠️</span>
                                <span className="leading-snug">Debe realizarse la prueba hidrostática este mes</span>
                            </div>
                        )}
                    </ModalSection>

                    {/* Características */}
                    <ModalSection title="⚗️ Características">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <ModalField label="Estado">
                                <select className={modalInput} value={form.estadoExtintor || ""} onChange={(e) => setEF("estadoExtintor", e.target.value)}>
                                    <option value="">Seleccionar...</option>{ESTADOS.map((es) => <option key={es}>{es}</option>)}
                                </select>
                            </ModalField>
                            <ModalField label="Agente">
                                <CreatableSelect
                                    value={form.agenteExtintor || ""}
                                    onChange={(v) => setEF("agenteExtintor", v)}
                                    options={agentes}
                                    placeholder="Seleccionar agente..."
                                    catalogType="agente"
                                    socket={socket}
                                    userRole={userRole}
                                    className={modalInput}
                                />
                            </ModalField>
                            <ModalField label="Unidad">
                                <div className="flex rounded-xl overflow-hidden border border-zinc-700">
                                    {(["KG", "LB", "LT", "GAL"] as const).map((u) => (
                                        <button key={u} type="button" onClick={() => { setEF("unidadPeso", u); setEF("peso", ""); }} className={`flex-1 py-2.5 text-sm font-bold ${form.unidadPeso === u ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>{u}</button>
                                    ))}
                                </div>
                            </ModalField>
                            <ModalField label="Peso">
                                <select className={modalInput} value={form.peso || ""} onChange={(e) => setEF("peso", e.target.value)}>
                                    <option value="">Seleccionar...</option>{(form.unidadPeso === "LB" ? PESOS_LB : form.unidadPeso === "LT" ? PESOS_LT : form.unidadPeso === "GAL" ? PESOS_GAL : PESOS_KG).map((p) => <option key={p} value={p}>{p} {form.unidadPeso || "KG"}</option>)}
                                </select>
                            </ModalField>
                        </div>
                    </ModalSection>

                    {/* Motivo de Baja (solo si estado = De Baja) */}
                    {form.estadoExtintor === "De Baja" && (
                        <ModalSection title="⚠️ Motivo de Baja">
                            <MultiSelect
                                selected={(form.motivoBaja || "").split(",").map(v => v.trim()).filter(Boolean)}
                                onChange={(vals) => {
                                    const motivo = vals.map((v) => v.toUpperCase().trim()).join(", ");
                                    setForm((p) => ({ ...p, motivoBaja: motivo }));
                                }}
                                options={motivosBaja}
                                label="Motivos"
                                catalogType="motivo_baja"
                                socket={socket}
                                userRole={userRole}
                                className={modalInput}
                            />
                        </ModalSection>
                    )}

                    {/* Servicio Realizado */}
                    <ModalSection title="🔧 Servicio Realizado">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            {servicioBloqueado ? (
                                <ModalField label="Servicio">
                                    <div className="px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700 text-zinc-400 text-sm font-semibold">
                                        🚫 El estado "{form.estadoExtintor}" no permite registrar servicios
                                    </div>
                                </ModalField>
                            ) : (
                                <>
                                    <ModalField label="Tipo">
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setForm((p) => {
                                                const next = p.ma === "SI" ? "" : "SI";
                                                return next === "SI" ? { ...p, ma: "SI", ph: "", recarga: "" } : { ...p, ma: "" };
                                            })} className={`flex-1 py-2.5 rounded-xl border text-sm font-bold ${form.ma === "SI" ? "bg-red-700 border-red-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>Mantenimiento</button>
                                            <button type="button" onClick={() => {
                                                if (form.ph === "SI") {
                                                    setForm((p) => ({ ...p, ph: "" }));
                                                    return;
                                                }
                                                const hoy = new Date();
                                                const mesActual = String(hoy.getMonth() + 1);
                                                const anioActual = String(hoy.getFullYear());
                                                if (!confirmarCambioPH(form.mesRealizadoPH || "", form.realizadoPH || "", mesActual, anioActual)) return;
                                                setForm((p) => ({
                                                    ...p, ph: "SI", ma: "",
                                                    mesRealizadoPH: mesActual,
                                                    realizadoPH: anioActual,
                                                    vencimPH: calcularVencimientoPH(mesActual, anioActual),
                                                }));
                                            }} className={`flex-1 py-2.5 rounded-xl border text-sm font-bold ${form.ph === "SI" ? "bg-blue-700 border-blue-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>Prueba Hidrostatica (P.H)</button>
                                        </div>
                                    </ModalField>
                                    <ModalField label="Recarga">
                                        <div className="flex flex-col gap-1.5">
                                            {recargasPermitidas.map((r) => (
                                                <button key={r} type="button" onClick={() => setForm((p) => {
                                                    const nextRecarga = p.recarga === r ? "" : r;
                                                    return nextRecarga ? { ...p, recarga: nextRecarga, ma: "" } : { ...p, recarga: "" };
                                                })} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold ${form.recarga === r ? "bg-amber-600 border-amber-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>RE — {r}</button>
                                            ))}
                                        </div>
                                    </ModalField>
                                </>
                            )}
                        </div>
                    </ModalSection>

                    {/* Servicio Extra */}
                    <ModalSection title="🔧 Servicio Extra">
                        {servicioExtraBloqueado  ? (
                            <div className="px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700 text-zinc-400 text-sm font-semibold">
                                🚫 El estado "{form.estadoExtintor}" no permite registrar servicios
                            </div>
                        ) : (
                            <MultiSelect
                                selected={(form.servicioExtra || "").split(",").map(v => v.trim()).filter(Boolean)}
                                onChange={(vals) => {
                                    const extra = vals.map((v) => v.toUpperCase().trim()).join(", ");
                                    setForm((p) => ({ ...p, servicioExtra: extra }));
                                }}
                                options={serviciosExtra}
                                label="Servicios adicionales"
                                catalogType="servicio_extra"
                                socket={socket}
                                userRole={userRole}
                                className={modalInput}
                            />
                        )}
                    </ModalSection>

                    {/* Componentes */}
                    <ModalSection title="🔩 Componentes Nuevos">
                        {componentesBloqueados ? (
                            <div className="px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700 text-zinc-400 text-sm font-semibold">
                                🚫 El estado "{form.estadoExtintor}" no permite registrar componentes instalados
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {COMP_KEYS.map((k) => (
                                    <button key={k} type="button" onClick={() => setEF(k, (form as any)[k] === "SI" ? "" : "SI")} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${(form as any)[k] === "SI" ? "bg-emerald-900/40 border-emerald-700 text-emerald-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
                                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs font-bold shrink-0 ${(form as any)[k] === "SI" ? "bg-emerald-600 border-emerald-600 text-white" : "border-zinc-600"}`}>{(form as any)[k] === "SI" ? "✓" : ""}</span>
                                        <span className="text-xs font-semibold">{COMP_LABELS[k]}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ModalSection>

                    {/* Observaciones */}
                    <ModalSection title="📝 Observaciones">
                        <div className="flex flex-col gap-3">
                            {(form.motivoBaja || form.servicioExtra) && (
                                <div className="flex flex-col gap-1.5 p-3 bg-zinc-950/50 border border-dashed border-zinc-700 rounded-xl">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Se adjuntará al reporte final:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(form.motivoBaja || "").split(",").map(m => m.trim()).filter(Boolean).map(m => (
                                            <span key={m} className="bg-red-950/80 text-red-400 text-xs font-bold px-2 py-1 rounded-md border border-red-900/50">⚠️ {m}</span>
                                        ))}
                                        {(form.servicioExtra || "").split(",").map(s => s.trim()).filter(Boolean).map(s => (
                                            <span key={s} className="bg-amber-950/80 text-amber-400 text-xs font-bold px-2 py-1 rounded-md border border-amber-900/50">✨ {s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <textarea
                                className={`${modalInput} resize-none`}
                                value={form.observaciones || ""}
                                onChange={(e) => setEF("observaciones", e.target.value)}
                                rows={3}
                                placeholder="Escribe aquí notas adicionales o detalles específicos..."
                            />
                        </div>
                    </ModalSection>
                </div>

                <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end shrink-0 bg-zinc-900/50">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
                    <button onClick={onSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-900/20 disabled:opacity-50 transition-all hover:-translate-y-0.5">
                        {saving ? "⏳ Procesando..." : isEditing ? "Actualizar" : "Agregar Extintor"}
                    </button>
                </div>
            </div>
        </div>
    );
}