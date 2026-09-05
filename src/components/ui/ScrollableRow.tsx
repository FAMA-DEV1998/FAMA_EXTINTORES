import { useEffect, useRef, useState, type ReactNode, type WheelEvent, type MouseEvent } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  botonesSiempreVisibles?: boolean;
  activeIndex?: number;
}

export default function ScrollableRow({ children, className = "", botonesSiempreVisibles, activeIndex }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const arrastre = useRef({ activo: false, inicioX: 0, scrollInicio: 0 });
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  const actualizarLimites = () => {
    const el = ref.current;
    if (!el) return;
    setPuedeIzq(el.scrollLeft > 2);
    setPuedeDer(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    actualizarLimites();
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(actualizarLimites);
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeIndex === undefined || !ref.current) return;
    const hijo = ref.current.children[activeIndex] as HTMLElement | undefined;
    hijo?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [activeIndex]);

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    arrastre.current = { activo: true, inicioX: e.clientX, scrollInicio: ref.current.scrollLeft };
  };
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!arrastre.current.activo || !ref.current) return;
    ref.current.scrollLeft = arrastre.current.scrollInicio - (e.clientX - arrastre.current.inicioX);
  };
  const terminarArrastre = () => { arrastre.current.activo = false; };

  const desplazar = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 180, behavior: "smooth" });
  };

  const botonBase = "shrink-0 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sm text-zinc-300 shadow-lg transition-opacity";

  return (
    <div className="flex items-center gap-1.5 min-w-0 w-full">
      {botonesSiempreVisibles && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => desplazar(-1)}
          disabled={!puedeIzq}
          className={`${botonBase} ${puedeIzq ? "opacity-100" : "opacity-30 pointer-events-none"}`}
        >
          ‹
        </button>
      )}
      <div
        ref={ref}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={terminarArrastre}
        onMouseLeave={terminarArrastre}
        onScroll={actualizarLimites}
        className={`flex items-center overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none min-w-0 flex-1 ${className}`}
      >
        {children}
      </div>
      {botonesSiempreVisibles && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => desplazar(1)}
          disabled={!puedeDer}
          className={`${botonBase} ${puedeDer ? "opacity-100" : "opacity-30 pointer-events-none"}`}
        >
          ›
        </button>
      )}
    </div>
  );
}