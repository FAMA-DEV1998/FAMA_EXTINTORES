import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, ListPlus, Plus, Scale, X, type LucideIcon } from "lucide-react";
import { useTeclaEscape } from "../../../hooks/useTeclaEscape";

export default function OrdenPersonalizadoModal({
  isOpen,
  onClose,
  availableWeights,
  currentOrder,
  onSave,
  title = "Ordenar por Peso",
  icon: Icono = Scale,
  label = "Valores Disponibles",
}: {
  isOpen: boolean;
  onClose: () => void;
  availableWeights: string[];
  currentOrder: string[];
  onSave: (order: string[]) => void;
  title?: string;
  icon?: LucideIcon;
  label?: string;
}) {
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) setOrder(currentOrder);
  }, [isOpen, currentOrder]);

  useTeclaEscape(isOpen, onClose);

  if (!isOpen) return null;

  const aplicar = (nuevo: string[]) => {
    onSave(nuevo);
    toast.success(nuevo.length ? "Orden aplicado" : "Orden restablecido");
  };

  const unselectedWeights = availableWeights.filter(w => !order.includes(w));

  const handleAdd = (w: string) => setOrder([...order, w]);
  const handleRemove = (w: string) => setOrder(order.filter(x => x !== w));
  
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newOrder = [...order];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setOrder(newOrder);
  };

  const moveDown = (idx: number) => {
    if (idx === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setOrder(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <h3 className="text-lg font-black text-white flex items-center gap-2"><Icono className="w-5 h-5 text-red-500" />{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 flex flex-col gap-6 overflow-y-auto flex-1 min-h-0">
          {/* Valores disponibles para añadir */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
              {unselectedWeights.length > 1 && (
                <button onClick={() => setOrder([...order, ...unselectedWeights])} className="flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300">
                  <ListPlus className="w-3.5 h-3.5" />Agregar todos
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {unselectedWeights.length === 0 ? (
                <span className="text-sm text-zinc-600 italic">Todos los valores ya están en la lista.</span>
              ) : (
                unselectedWeights.map(w => (
                  <button key={w} onClick={() => handleAdd(w)} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-300 transition-colors flex items-center gap-1.5 border border-zinc-700">
                    <Plus className="w-3.5 h-3.5" /> {w}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Secuencia actual */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Orden de Prioridad (Primero a Último)</label>
            <div className="flex flex-col gap-2 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 min-h-30">
              {order.length === 0 ? (
                <div className="text-center py-6 text-sm text-zinc-600">No hay orden personalizado. Se mostrarán por defecto.</div>
              ) : (
                order.map((w, i) => (
                  <div key={w} className="flex items-center justify-between bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-700">
                    <span className="text-sm font-bold text-zinc-200">
                      <span className="text-zinc-500 mr-2">{i + 1}.</span>{w}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveUp(i)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:hover:bg-zinc-700 text-zinc-200 transition-colors" aria-label="Subir"><ChevronUp className="w-4 h-4" /></button>
                      <button onClick={() => moveDown(i)} disabled={i === order.length - 1} className="w-7 h-7 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:hover:bg-zinc-700 text-zinc-200 transition-colors" aria-label="Bajar"><ChevronDown className="w-4 h-4" /></button>
                      <button onClick={() => handleRemove(w)} className="w-7 h-7 flex items-center justify-center rounded bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-white ml-1 transition-colors" aria-label="Quitar"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-end gap-3">
          <button onClick={() => { setOrder([]); aplicar([]); }} className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors">
            Limpiar Orden
          </button>
          <button onClick={() => aplicar(order)} className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-colors">
            Aplicar Orden
          </button>
        </div>
      </div>
    </div>
  );
}
