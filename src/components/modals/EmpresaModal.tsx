import type { EmpresaData } from "../../types";
import { DISTRITOS_LIMA } from "../../constants";
import { ModalField, modalInput } from "../ui/ModalUI";

type Props = {
    title: string;
    form: EmpresaData;
    setForm: React.Dispatch<React.SetStateAction<EmpresaData | null>>;
    onClose: () => void;
    onSave: () => void;
    saving: boolean;
};

export default function EmpresaModal({ title, form, setForm, onClose, onSave, saving }: Props) {
    const setF = (k: keyof EmpresaData, v: string) => setForm((p) => p ? { ...p, [k]: v } : p);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
                
                {/* HEADER FIJO */}
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    {/* CAMBIO UX: Área de clic más grande para el botón cerrar */}
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
                </div>

                {/* BODY SCROLLABLE */}
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 overflow-y-auto flex-1">
                    <ModalField label="Razón Social" full>
                        <input className={modalInput} value={form.razonSocial} onChange={(e) => setF("razonSocial", e.target.value)} placeholder="Nombre de la empresa" />
                    </ModalField>
                    <ModalField label="Dirección" full>
                        <input className={modalInput} value={form.direccion} onChange={(e) => setF("direccion", e.target.value)} placeholder="Dirección completa" />
                    </ModalField>
                    <ModalField label="Distrito">
                        <select className={modalInput} value={form.distrito || ""} onChange={(e) => setF("distrito", e.target.value)}>
                            <option value="">Seleccionar distrito...</option>
                            {DISTRITOS_LIMA.map((d) => <option key={d}>{d}</option>)}
                        </select>
                    </ModalField>
                    <ModalField label="RUC">
                        <div className="relative">
                            <input
                                className={`${modalInput} ${form.ruc.length > 0 && form.ruc.length !== 11 ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                                value={form.ruc}
                                onChange={(e) => setF("ruc", e.target.value.replace(/\D/g, "").slice(0, 11))}
                                placeholder="20xxxxxxxxx" inputMode="numeric" maxLength={11}
                            />
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${form.ruc.length === 11 ? "text-emerald-500 font-bold" : "text-zinc-500"}`}>
                                {form.ruc.length}/11 {form.ruc.length === 11 && "✓"}
                            </span>
                        </div>
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
                    <ModalField label="Fecha de Retiro">
                        <input type="date" className={modalInput} value={form.fechaRetiro} onChange={(e) => setF("fechaRetiro", e.target.value)} />
                    </ModalField>
                    <ModalField label="Fecha de Entrega">
                        <input type="date" className={modalInput} value={form.fechaEntrega} onChange={(e) => setF("fechaEntrega", e.target.value)} />
                    </ModalField>
                </div>

                {/* FOOTER FIJO */}
                <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end shrink-0 bg-zinc-900/50">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
                    <button onClick={onSave} disabled={saving || !form.razonSocial || (form.ruc.length > 0 && form.ruc.length !== 11)} className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-900/20 disabled:opacity-50 transition-all hover:-translate-y-0.5">
                        {saving ? "Guardando..." : "Guardar Empresa"}
                    </button>
                </div>
            </div>
        </div>
    );
}