import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as EventoPuntero, type ReactNode } from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { aMundo, desdeMundo, metrosPorPixel, TAM_TESELA, type Punto } from "../../utils/geo";
import { ATRIBUCION, urlTesela, ZOOM_MAX_TESELAS, ZOOM_MAX_VISTA } from "./mapaOffline";

export type MarcadorMapa = {
  id: string;
  lat: number;
  lng: number;
  precision?: number;
  color?: string;
  etiqueta?: string;
  seleccionado?: boolean;
  atenuado?: boolean;
};

type Props = {
  marcadores: MarcadorMapa[];
  usuario?: { lat: number; lng: number; precision: number; rumbo?: number | null } | null;
  linea?: { desde: Punto; hasta: Punto } | null;
  rastro?: Punto[];
  onMarcador?: (id: string) => void;
  claveAjuste?: string;
  enfocar?: { punto: Punto; zoom?: number; clave: string } | null;
  className?: string;
  children?: ReactNode;
};

const ZOOM_MIN = 3;
const limitarZoom = (z: number) => Math.min(ZOOM_MAX_VISTA, Math.max(ZOOM_MIN, z));
const COLOR_DEFECTO = "#dc2626";

export default function MapaTeselas({ marcadores, usuario, linea, rastro, onMarcador, claveAjuste, enfocar, className = "", children }: Props) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const [vista, setVista] = useState<{ centro: Punto; zoom: number }>(() => ({ centro: { lat: -12.05, lng: -77.04 }, zoom: 12 }));
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ movido: boolean; inicio: { x: number; y: number }; pellizco?: { d0: number; z0: number } } | null>(null);
  const ultimoToque = useRef(0);

  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const ajustar = useCallback((puntos: Punto[]) => {
    if (puntos.length === 0 || tam.w === 0) return;
    if (puntos.length === 1) {
      setVista({ centro: puntos[0], zoom: 19 });
      return;
    }
    const lats = puntos.map((p) => p.lat);
    const lngs = puntos.map((p) => p.lng);
    const centro = { lat: (Math.max(...lats) + Math.min(...lats)) / 2, lng: (Math.max(...lngs) + Math.min(...lngs)) / 2 };
    let zoom = 19;
    while (zoom > ZOOM_MIN) {
      const a = aMundo({ lat: Math.max(...lats), lng: Math.min(...lngs) }, zoom);
      const b = aMundo({ lat: Math.min(...lats), lng: Math.max(...lngs) }, zoom);
      if (b.x - a.x <= tam.w - 70 && b.y - a.y <= tam.h - 70) break;
      zoom -= 0.5;
    }
    setVista({ centro, zoom });
  }, [tam.w, tam.h]);

  useEffect(() => {
    if (claveAjuste === undefined) return;
    const puntos: Punto[] = marcadores.map((m) => ({ lat: m.lat, lng: m.lng }));
    if (puntos.length === 0 && usuario) puntos.push(usuario);
    ajustar(puntos);
  }, [claveAjuste, tam.w > 0]);

  useEffect(() => {
    if (enfocar) setVista((v) => ({ centro: enfocar.punto, zoom: enfocar.zoom ?? Math.max(v.zoom, 18) }));
  }, [enfocar?.clave]);

  const zoomEn = (sx: number, sy: number, nuevoZoom: number) => {
    const { centro, zoom } = vistaRef.current;
    const z = limitarZoom(nuevoZoom);
    const c = aMundo(centro, zoom);
    const punto = desdeMundo(c.x + sx - tam.w / 2, c.y + sy - tam.h / 2, zoom);
    const p2 = aMundo(punto, z);
    setVista({ centro: desdeMundo(p2.x - (sx - tam.w / 2), p2.y - (sy - tam.h / 2), z), zoom: z });
  };

  const mover = (dx: number, dy: number) => {
    const { centro, zoom } = vistaRef.current;
    const c = aMundo(centro, zoom);
    setVista({ centro: desdeMundo(c.x - dx, c.y - dy, zoom), zoom });
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const r = contenedor.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const alBajar = (e: EventoPuntero<HTMLDivElement>) => {
    punteros.current.set(e.pointerId, local(e));
    const lista = [...punteros.current.values()];
    if (lista.length === 2) {
      gesto.current = { movido: true, inicio: lista[0], pellizco: { d0: Math.hypot(lista[0].x - lista[1].x, lista[0].y - lista[1].y) || 1, z0: vistaRef.current.zoom } };
      contenedor.current?.setPointerCapture(e.pointerId);
    } else if (lista.length === 1) {
      gesto.current = { movido: false, inicio: lista[0] };
    }
  };

  const alMover = (e: EventoPuntero<HTMLDivElement>) => {
    const previo = punteros.current.get(e.pointerId);
    if (!previo || !gesto.current) return;
    const ahora = local(e);
    punteros.current.set(e.pointerId, ahora);
    const lista = [...punteros.current.values()];
    if (lista.length >= 2 && gesto.current.pellizco) {
      const [a, b] = lista;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomEn((a.x + b.x) / 2, (a.y + b.y) / 2, gesto.current.pellizco.z0 + Math.log2(d / gesto.current.pellizco.d0));
      return;
    }
    if (!gesto.current.movido && Math.hypot(ahora.x - gesto.current.inicio.x, ahora.y - gesto.current.inicio.y) > 5) {
      gesto.current.movido = true;
      contenedor.current?.setPointerCapture(e.pointerId);
    }
    if (gesto.current.movido) mover(ahora.x - previo.x, ahora.y - previo.y);
  };

  const alSoltar = (e: EventoPuntero<HTMLDivElement>) => {
    const p = punteros.current.get(e.pointerId);
    punteros.current.delete(e.pointerId);
    if (punteros.current.size === 1 && gesto.current?.pellizco) {
      gesto.current = { movido: true, inicio: [...punteros.current.values()][0] };
      return;
    }
    if (punteros.current.size === 0) {
      if (p && gesto.current && !gesto.current.movido && e.pointerType !== "mouse") {
        const ahora = Date.now();
        if (ahora - ultimoToque.current < 300) zoomEn(p.x, p.y, vistaRef.current.zoom + 1);
        ultimoToque.current = ahora;
      }
      gesto.current = null;
    }
  };

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomEn(e.clientX - r.left, e.clientY - r.top, vistaRef.current.zoom + (e.deltaY < 0 ? 0.5 : -0.5));
    };
    el.addEventListener("wheel", rueda, { passive: false });
    return () => el.removeEventListener("wheel", rueda);
  }, [tam.w, tam.h]);

  const { centro, zoom } = vista;
  const zT = Math.min(ZOOM_MAX_TESELAS, Math.max(0, Math.floor(zoom)));
  const escala = 2 ** (zoom - zT);
  const cT = aMundo(centro, zT);
  const lado = TAM_TESELA * escala;
  const teselas: { clave: string; src: string; left: number; top: number }[] = [];
  if (tam.w > 0) {
    const n = 2 ** zT;
    const x0 = Math.floor((cT.x - tam.w / 2 / escala) / TAM_TESELA);
    const x1 = Math.floor((cT.x + tam.w / 2 / escala) / TAM_TESELA);
    const y0 = Math.max(0, Math.floor((cT.y - tam.h / 2 / escala) / TAM_TESELA));
    const y1 = Math.min(n - 1, Math.floor((cT.y + tam.h / 2 / escala) / TAM_TESELA));
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const xr = ((x % n) + n) % n;
        teselas.push({ clave: `${zT}/${x}/${y}`, src: urlTesela(zT, xr, y), left: (x * TAM_TESELA - cT.x) * escala + tam.w / 2, top: (y * TAM_TESELA - cT.y) * escala + tam.h / 2 });
      }
    }
  }

  const cZ = aMundo(centro, zoom);
  const enPantalla = (p: Punto) => {
    const m = aMundo(p, zoom);
    return { x: m.x - cZ.x + tam.w / 2, y: m.y - cZ.y + tam.h / 2 };
  };
  const radio = (p: Punto, metros: number) => metros / metrosPorPixel(p.lat, zoom);

  const usuarioPx = usuario ? enPantalla(usuario) : null;
  const lineaPx = linea ? { a: enPantalla(linea.desde), b: enPantalla(linea.hasta) } : null;
  const rastroPx = rastro && rastro.length > 1 ? rastro.map(enPantalla) : null;
  const ordenados = [...marcadores].sort((a, b) => Number(!!a.seleccionado) - Number(!!b.seleccionado));

  return (
    <div
      ref={contenedor}
      className={`relative overflow-hidden bg-zinc-800 select-none touch-none ${className}`}
      onPointerDown={alBajar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onDoubleClick={(e) => { const p = local(e); zoomEn(p.x, p.y, zoom + 1); }}
    >
      {teselas.map((t) => (
        <img key={t.clave} src={t.src} alt="" draggable={false} loading="eager" decoding="async" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="absolute max-w-none pointer-events-none" style={{ left: t.left, top: t.top, width: lado + 0.5, height: lado + 0.5 }} />
      ))}

      <svg className="absolute inset-0 w-full h-full pointer-events-none" width={tam.w} height={tam.h}>
        {rastroPx && <polyline points={rastroPx.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 4" />}
        {ordenados.map((m) => m.precision ? (
          <circle key={`c-${m.id}`} cx={enPantalla(m).x} cy={enPantalla(m).y} r={Math.max(4, radio(m, m.precision))} fill={m.color || COLOR_DEFECTO} fillOpacity={m.seleccionado ? 0.22 : 0.1} stroke={m.color || COLOR_DEFECTO} strokeOpacity={m.atenuado ? 0.3 : 0.8} strokeWidth={m.seleccionado ? 2 : 1} />
        ) : null)}
        {usuario && usuarioPx && <circle cx={usuarioPx.x} cy={usuarioPx.y} r={Math.max(6, radio(usuario, usuario.precision))} fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeOpacity={0.6} />}
        {lineaPx && <line x1={lineaPx.a.x} y1={lineaPx.a.y} x2={lineaPx.b.x} y2={lineaPx.b.y} stroke="#ffffff" strokeWidth={3} strokeDasharray="8 6" strokeLinecap="round" />}
      </svg>

      {ordenados.map((m) => {
        const p = enPantalla(m);
        if (p.x < -40 || p.y < -40 || p.x > tam.w + 40 || p.y > tam.h + 40) return null;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onMarcador?.(m.id)}
            className={`absolute -translate-x-1/2 -translate-y-full flex flex-col items-center ${m.atenuado ? "opacity-50" : ""} ${m.seleccionado ? "z-20" : "z-10"}`}
            style={{ left: p.x, top: p.y }}
            aria-label={m.etiqueta || "Extintor"}
          >
            {m.etiqueta && (
              <span className={`mb-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap shadow ${m.seleccionado ? "bg-white text-zinc-900" : "bg-zinc-900/80 text-white"}`}>{m.etiqueta}</span>
            )}
            <span className={`rounded-full border-2 border-white shadow-lg ${m.seleccionado ? "w-5 h-5" : "w-3.5 h-3.5"}`} style={{ background: m.color || COLOR_DEFECTO }} />
          </button>
        );
      })}

      {usuarioPx && (
        <div className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: usuarioPx.x, top: usuarioPx.y }}>
          {typeof usuario?.rumbo === "number" && (
            <div className="absolute left-1/2 top-1/2 w-0 h-0" style={{ transform: `rotate(${usuario.rumbo}deg)` }}>
              <div className="absolute -left-3 -top-7 w-6 h-6" style={{ background: "linear-gradient(to top, rgba(59,130,246,0.7), transparent)", clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
            </div>
          )}
          <span className="block w-4 h-4 rounded-full bg-blue-500 border-[3px] border-white shadow-lg" />
        </div>
      )}

      <div className="absolute right-2 top-2 z-40 flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => zoomEn(tam.w / 2, tam.h / 2, zoom + 1)} className="w-9 h-9 rounded-xl bg-white/95 text-zinc-700 shadow flex items-center justify-center active:scale-95" aria-label="Acercar"><Plus className="w-4 h-4" /></button>
        <button type="button" onClick={() => zoomEn(tam.w / 2, tam.h / 2, zoom - 1)} className="w-9 h-9 rounded-xl bg-white/95 text-zinc-700 shadow flex items-center justify-center active:scale-95" aria-label="Alejar"><Minus className="w-4 h-4" /></button>
        {usuario && (
          <button type="button" onClick={() => setVista({ centro: usuario, zoom: Math.max(zoom, 18) })} className="w-9 h-9 rounded-xl bg-white/95 text-blue-600 shadow flex items-center justify-center active:scale-95" aria-label="Centrar en mi posición"><Crosshair className="w-4 h-4" /></button>
        )}
      </div>

      {children}

      <span className="absolute right-1 bottom-1 z-40 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-white/80 pointer-events-none">{ATRIBUCION}</span>
    </div>
  );
}
