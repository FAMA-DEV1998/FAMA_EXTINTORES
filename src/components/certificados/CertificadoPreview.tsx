import { useEffect, useRef, useState } from "react";
import CertificadoTemplate, { type CertificadoDatos } from "./CertificadoTemplate";
import ScrollableRow from "../ui/ScrollableRow";

const A4_WIDTH_PX = 210 * 3.7795275591;
const A4_HEIGHT_PX = 297 * 3.7795275591;

interface Props {
  hojas: CertificadoDatos[];
  activeIndex: number;
  onActiveIndexChange?: (idx: number) => void;
  etiquetaHoja?: (hoja: CertificadoDatos, idx: number) => string;
  onAgregarHoja?: () => void;
  onDuplicarHoja?: () => void;
  onEliminarHoja?: () => void;
}

export default function CertificadoPreview({ hojas, activeIndex, onActiveIndexChange, etiquetaHoja, onAgregarHoja, onDuplicarHoja, onEliminarHoja }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const idx = Math.min(activeIndex, Math.max(0, hojas.length - 1));
  const gestionable = !!(onAgregarHoja || onDuplicarHoja || onEliminarHoja);

  useEffect(() => {
    if (!containerRef.current) return;
    const medir = () => {
      const el = containerRef.current;
      if (!el) return;
      const anchoDisp = el.clientWidth;
      if (anchoDisp <= 0) return;
      setScale(Math.max(0.15, anchoDisp / A4_WIDTH_PX));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [hojas.length]);

  const etiqueta = (hoja: CertificadoDatos, i: number) => etiquetaHoja?.(hoja, i) || `Hoja ${i + 1}`;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {(hojas.length > 1 || gestionable) && (
        <div className="flex items-center gap-2 px-3 pt-3.5 pb-3 shrink-0 border-b border-zinc-800/60 bg-zinc-900/40">
          <ScrollableRow className="gap-2 flex-1" botonesSiempreVisibles activeIndex={idx}>
            {hojas.map((h, i) => (
              <button
                key={i}
                onClick={() => onActiveIndexChange?.(i)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${i === idx ? "bg-red-700 text-white shadow-md shadow-red-900/30" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"}`}
              >
                {etiqueta(h, i)}
              </button>
            ))}
          </ScrollableRow>
          {gestionable && (
            <div className="flex items-center gap-1.5 shrink-0 border-l border-zinc-800 pl-2">
              {onAgregarHoja && (
                <button onClick={onAgregarHoja} title="Agregar hoja" className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-red-700 text-zinc-300 hover:text-white text-sm font-black flex items-center justify-center transition-all">
                  +
                </button>
              )}
              {onDuplicarHoja && (
                <button onClick={onDuplicarHoja} title="Duplicar hoja seleccionada" className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center justify-center transition-all">
                  ⧉
                </button>
              )}
              {onEliminarHoja && (
                <button onClick={onEliminarHoja} disabled={hojas.length <= 1} title="Eliminar hoja seleccionada" className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-red-900/60 text-zinc-300 hover:text-red-300 text-xs flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none">
                  🗑
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <div ref={containerRef} className="flex-1 min-h-0 min-w-0 overflow-auto scrollbar-hide bg-zinc-950">
        {hojas[idx] && (
          <div style={{ width: A4_WIDTH_PX * scale, height: A4_HEIGHT_PX * scale }}>
            <div style={{ width: "210mm", transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <CertificadoTemplate datos={hojas[idx]} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}