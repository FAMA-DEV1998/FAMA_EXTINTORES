import { Check, LoaderCircle, Save, TriangleAlert, X, type LucideIcon } from "lucide-react";
import type { EmpresaData } from "../../../types";
import { DISTRITOS_LIMA } from "../../../constants";
import { validarRucPorTipo, detectarTipoClientePorRuc } from "../../../utils/empresas";
import { ModalField, modalInput } from "../../../components/ui/ModalCampos";
import { useTeclaEscape } from "../../../hooks/useTeclaEscape";
import { buscarEmpresasParecidas } from "../../../utils/duplicados";
import AvisoEmpresasParecidas from "../../../components/ui/AvisoEmpresasParecidas";

type Props = {
    title: string;
    icon?: LucideIcon;
    form: EmpresaData;
    setForm: React.Dispatch<React.SetStateAction<EmpresaData | null>>;
    onClose: () => void;
    onSave: () => void;
    saving: boolean;
    empresasExistentes?: { id: string; razonSocial: string; ruc?: string | null }[];
};

export default function EmpresaModal({ title, icon: Icono, form, setForm, onClose, onSave, saving, empresasExistentes = [] }: Props) {
    useTeclaEscape(!saving, onClose);
    const setF = (k: keyof EmpresaData, v: string) => setForm((p) => p ? { ...p, [k]: v } : p);
    const tipoCliente = form.tipoCliente || "";
    const esPersona = tipoCliente === "persona";
    const maxLen = esPersona ? 8 : 11;
    const errorRuc = tipoCliente ? validarRucPorTipo(tipoCliente, form.ruc) : null;
    const parecidas = form.razonSocial.trim().length >= 3 || form.ruc
        ? buscarEmpresasParecidas({ id: form.id, razonSocial: form.razonSocial, ruc: form.ruc }, empresasExistentes)
        : [];

    const setRuc = (valor: string) => {
        const limpio = valor.replace(/\D/g, "").slice(0, maxLen);
        setForm((p) => {
            if (!p) return p;
            const detectado = p.tipoCliente !== "persona" ? detectarTipoClientePorRuc(limpio) : null;
            return { ...p, ruc: limpio, tipoCliente: detectado || p.tipoCliente };
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
                
                {/* Header fijo */}
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">{Icono && <Icono className="w-5 h-5 text-red-500" />}{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="Cerrar"><X className="w-4 h-4" /></button>
                </div>

                {/* Body scrollable */}
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 overflow-y-auto flex-1">
                    <ModalField label="Razón Social" full>
                        <input className={modalInput} value={form.razonSocial} onChange={(e) => setF("razonSocial", e.target.value)} placeholder="Nombre de la empresa" autoFocus />
                    </ModalField>
                    {parecidas.length > 0 && (
                        <div className="sm:col-span-2">
                            <AvisoEmpresasParecidas parecidas={parecidas} />
                        </div>
                    )}
                    <ModalField label="Dirección" full>
                        <input className={modalInput} value={form.direccion} onChange={(e) => setF("direccion", e.target.value)} placeholder="Dirección completa" />
                    </ModalField>
                    <ModalField label="Distrito">
                        <select className={modalInput} value={form.distrito || ""} onChange={(e) => setF("distrito", e.target.value)}>
                            <option value="">Seleccionar distrito...</option>
                            {DISTRITOS_LIMA.map((d) => <option key={d}>{d}</option>)}
                        </select>
                    </ModalField>
                    <ModalField label="Tipo de Cliente">
                        <select className={modalInput} value={tipoCliente} onChange={(e) => setF("tipoCliente", e.target.value)}>
                            <option value="">Sin clasificar</option>
                            <option value="persona">Persona (DNI)</option>
                            <option value="ruc10">RUC 10</option>
                            <option value="ruc20">RUC 20</option>
                        </select>
                    </ModalField>
                    <ModalField label={esPersona ? "DNI" : "RUC"} full>
                        <div className="relative">
                            <input
                                className={`${modalInput} ${form.ruc.length > 0 && form.ruc.length !== maxLen ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                                value={form.ruc}
                                onChange={(e) => setRuc(e.target.value)}
                                placeholder={esPersona ? "8 dígitos" : "20xxxxxxxxx"} inputMode="numeric" maxLength={maxLen}
                            />
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${form.ruc.length === maxLen ? "text-emerald-500 font-bold" : "text-zinc-500"}`}>
                                <span className="inline-flex items-center gap-0.5">{form.ruc.length}/{maxLen}{form.ruc.length === maxLen && <Check className="w-3 h-3" strokeWidth={3} />}</span>
                            </span>
                        </div>
                        {errorRuc && <p className="flex items-center gap-1 text-xs font-bold text-amber-500 mt-1.5"><TriangleAlert className="w-3.5 h-3.5" />{errorRuc}</p>}
                    </ModalField>
                    <ModalField label="Nombres y Apellidos" full>
                        <input className={modalInput} value={form.nombresApellidos} onChange={(e) => setF("nombresApellidos", e.target.value)} placeholder="Nombre completo" />
                    </ModalField>
                    <ModalField label="Celular">
                        <input className={modalInput} value={form.celular} inputMode="tel" onChange={(e) => setF("celular", e.target.value)} placeholder="9xx xxx xxx" />
                    </ModalField>
                    <ModalField label="N° Orden de Trabajo">
                        <input className={modalInput} value={form.nOrdenTrabajo} onChange={(e) => setF("nOrdenTrabajo", e.target.value)} placeholder="OT-0001" />
                    </ModalField>
                </div>

                {/* Footer fijo */}
                <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end shrink-0 bg-zinc-900/50">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
                    <button onClick={onSave} disabled={saving || !form.razonSocial || (form.ruc.length > 0 && form.ruc.length !== maxLen)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-900/20 disabled:opacity-50 transition-all hover:-translate-y-0.5">
                        {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "Guardando..." : "Guardar Empresa"}
                    </button>
                </div>
            </div>
        </div>
    );
}
