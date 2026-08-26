import { useState } from "react";
import { ModalField, modalInput } from "../ui/ModalUI";

type Props = {
  isOpen: boolean;
  anio?: number;
  mes?: number; 
  mesLabel?: string;
  onClose: () => void;
  onSave: (data: { fechaRetiro: string; fechaEntrega: string; notas?: string,  }) => void;
  saving: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export default function ServicioModal({ isOpen, anio, mes, mesLabel, onClose, onSave, saving }: Props) {
  const [diaRetiro, setDiaRetiro] = useState("");
  const [diaEntrega, setDiaEntrega] = useState("");
  const [notas, setNotas] = useState("");

  if (!isOpen) return null;

  const diaValido = (d: string) => {
    if (d.trim() === "") return true;
    const n = parseInt(d);
    return !isNaN(n) && n >= 1 && n <= 31;
  };

  const buildFecha = (dia: string) => diaValido(dia) && dia.trim() !== "" ? `${anio}-${pad2(mes!)}-${pad2(parseInt(dia))}` : `${anio}-${pad2(mes!)}`;

  const handleSave = () => {
    onSave({
      fechaRetiro: buildFecha(diaRetiro),
      fechaEntrega: buildFecha(diaEntrega),
      notas: notas || undefined,
    });
  };

  const canSave = diaValido(diaRetiro) && diaValido(diaEntrega) && !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white">📜 Registrar Servicio</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {mesLabel} {anio} — el día es opcional
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModalField label={`Día de Retiro (opcional)`}>
              <input
                type="number" min={1} max={31} inputMode="numeric"
                className={modalInput} value={diaRetiro}
                onChange={(e) => setDiaRetiro(e.target.value)}
                placeholder="dd"
              />
            </ModalField>
            <ModalField label={`Día de Entrega (opcional)`}>
              <input
                type="number" min={1} max={31} inputMode="numeric"
                className={modalInput} value={diaEntrega}
                onChange={(e) => setDiaEntrega(e.target.value)}
                placeholder="dd"
              />
            </ModalField>
          </div>

          <ModalField label="Notas (opcional)" full>
            <textarea className={`${modalInput} resize-none min-h-20`} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Detalles adicionales del servicio..." />
          </ModalField>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end shrink-0 bg-zinc-900/50">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Cancelar</button>
          <button onClick={handleSave} disabled={!canSave} className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Guardando..." : "Registrar Servicio"}
          </button>
        </div>
      </div>
    </div>
  );
}