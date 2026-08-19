import type { Dispatch, SetStateAction } from "react";
import { downloadEvidenciaAsPng } from "../../utils/helpers";

interface EvidenciaModalProps {
  isOpen: boolean;
  loading: boolean;
  list: string[];
  extInfo: string;
  activeIdx: number;
  setActiveIdx: Dispatch<SetStateAction<number>>;
  onClose: () => void;
}

export default function EvidenciaModal({
  isOpen,
  loading,
  list,
  extInfo,
  activeIdx,
  setActiveIdx,
  onClose,
}: EvidenciaModalProps) {
  if (!isOpen) return null;

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/50">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          📷 Evidencia Fotográfica
          {list.length > 1 && (
            <span className="px-2.5 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">
              {activeIdx + 1} / {list.length}
            </span>
          )}
        </h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-4 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-zinc-500">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm font-semibold">Cargando imágenes...</p>
          </div>
        ) : list.length > 0 ? (
          <>
            <div className="rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-950/50 shadow-lg w-full relative">
              <img
                src={`data:image/jpeg;base64,${list[activeIdx]}`}
                alt={`Evidencia ${activeIdx + 1}`}
                className="w-full object-contain max-h-[50vh]"
              />
              {list.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                    disabled={activeIdx === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white text-lg flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setActiveIdx(i => Math.min(list.length - 1, i + 1))}
                    disabled={activeIdx === list.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white text-lg flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {list.length > 1 && (
              <div className="flex gap-2 overflow-x-auto w-full py-1 scrollbar-hide">
                {list.map((b64, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIdx(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all active:scale-95 ${idx === activeIdx ? "border-emerald-500 shadow-lg shadow-emerald-900/30 ring-2 ring-emerald-500/30" : "border-zinc-700 hover:border-zinc-500 opacity-60 hover:opacity-100"}`}
                  >
                    <img src={`data:image/jpeg;base64,${b64}`} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={() => downloadEvidenciaAsPng(list[activeIdx], `Evidencia_${extInfo}_${activeIdx + 1}`)}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-95"
              >
                📥 Descargar esta foto (PNG)
              </button>
              {list.length > 1 && (
                <button
                  onClick={() => list.forEach((b64, i) => setTimeout(() => downloadEvidenciaAsPng(b64, `Evidencia_${extInfo}_${i + 1}`), i * 500))}
                  className="py-3 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-300 hover:text-white border border-zinc-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  📦 Todas ({list.length})
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-500">
            <span className="text-5xl">🚫</span>
            <p className="text-sm font-semibold">No se pudo cargar las imágenes</p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}