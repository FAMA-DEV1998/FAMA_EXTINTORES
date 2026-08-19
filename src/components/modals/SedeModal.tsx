import type { Sede } from "../../types";
import { DISTRITOS_LIMA } from "../../constants";
import { ModalField, modalInput } from "../ui/ModalUI";

type Props = {
  isOpen: boolean;
  form: Sede | null;
  setForm: React.Dispatch<React.SetStateAction<Sede | null>>;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
};

export default function SedeModal({ isOpen, form, setForm, onClose, onSave, saving }: Props) {
  if (!isOpen || !form) return null;
  const setF = (k: keyof Sede, v: string) => setForm((p) => p ? { ...p, [k]: v } : p);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{form.id ? "✏️ Editar Sede" : "🏬 Nueva Sede"}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <ModalField label="Nombre de la Sede" full>
            <input className={modalInput} value={form.nombre} onChange={(e) => setF("nombre", e.target.value)} placeholder="Ej: Sede Lima" />
          </ModalField>
          <ModalField label="Dirección" full>
            <input className={modalInput} value={form.direccion || ""} onChange={(e) => setF("direccion", e.target.value)} />
          </ModalField>
          <ModalField label="Distrito">
            <select className={modalInput} value={form.distrito || ""} onChange={(e) => setF("distrito", e.target.value)}>
              <option value="">Seleccionar distrito...</option>
              {DISTRITOS_LIMA.map((d) => <option key={d}>{d}</option>)}
            </select>
          </ModalField>
        </div>
        <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Cancelar</button>
          <button onClick={onSave} disabled={saving || !form.nombre} className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar Sede"}
          </button>
        </div>
      </div>
    </div>
  );
}