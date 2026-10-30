import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { Eye, EyeOff, FileDown, ImagePlus, LoaderCircle, Move, RotateCcw, Save, Trash2, X } from "lucide-react";
import {
  HOJA, NOMBRES_TEXTO, VARIABLES, descargarBase64, emitir, leerArchivo,
  type CampoTexto, type ClaveTexto, type Fuente, type ImagenPos, type PlantillaCertificado,
} from "./tipos";

const EJEMPLO: Record<string, string> = {
  nombre: "MARÍA FERNANDA QUISPE ROJAS", dni: "45678912", cargo: "Asistente administrativa",
  empresa: "Inversiones Moderna del Sur S.A.C.", puntaje: "92", fecha: "18/10/2026", fecha_larga: "18 de octubre de 2026",
  vence: "18/10/2027", codigo: "CAP-IMS-2610-K7QX9M", escenario: "Oficina",
};
const PT_MM = 25.4 / 72;
const FUENTES: { v: Fuente; l: string }[] = [
  { v: "sans", l: "Sans" }, { v: "sans-bold", l: "Sans negrita" }, { v: "serif", l: "Serif" },
  { v: "serif-bold", l: "Serif negrita" }, { v: "serif-italic", l: "Serif cursiva" }, { v: "serif-bold-italic", l: "Serif negrita cursiva" },
];
const estiloFuente = (f: Fuente) => ({
  fontFamily: f.startsWith("serif") ? "'Times New Roman', Times, serif" : "Helvetica, Arial, sans-serif",
  fontWeight: f.includes("bold") ? 700 : 400,
  fontStyle: f.includes("italic") ? "italic" : "normal",
});

type Seleccion = { tipo: "texto"; clave: ClaveTexto } | { tipo: "logo" } | { tipo: "firma"; i: number } | { tipo: "qr" } | { tipo: "fondo" } | null;

const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600";
const Etiqueta = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1"><span className="text-[11px] font-bold text-zinc-400">{t}</span>{children}</label>
);

export default function PlantillaEditor({ socket }: { socket: Socket }) {
  const [p, setP] = useState<PlantillaCertificado | null>(null);
  const [sel, setSel] = useState<Seleccion>({ tipo: "texto", clave: "titulo" });
  const [guardando, setGuardando] = useState(false);
  const [cambios, setCambios] = useState(false);
  const [vista, setVista] = useState<string | null>(null);
  const [cargandoVista, setCargandoVista] = useState(false);
  const hoja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(3);

  useEffect(() => {
    emitir<{ plantilla: PlantillaCertificado }>(socket, "cap:plantilla:get").then((r) => setP(r.plantilla)).catch((e) => toast.error(e.message));
  }, [socket]);

  useEffect(() => {
    const el = hoja.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setEscala(el.clientWidth / HOJA.ancho));
    ro.observe(el);
    return () => ro.disconnect();
  }, [p !== null]);

  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  const actualizar = (fn: (x: PlantillaCertificado) => void) => {
    setP((prev) => {
      if (!prev) return prev;
      const copia = structuredClone(prev);
      fn(copia);
      return copia;
    });
    setCambios(true);
  };

  const reemplazar = (t: string) => t.replace(/\{(\w+)\}/g, (m, k) => (k === "curso" ? p?.curso ?? m : EJEMPLO[k] ?? m));

  const arrastrar = (e: React.PointerEvent, s: Exclude<Seleccion, null>, x0: number, y0: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSel(s);
    const inicio = { x: e.clientX, y: e.clientY };
    const mover = (ev: PointerEvent) => {
      const dx = (ev.clientX - inicio.x) / escala, dy = (ev.clientY - inicio.y) / escala;
      const nx = Math.round((x0 + dx) * 2) / 2, ny = Math.round((y0 + dy) * 2) / 2;
      actualizar((c) => {
        const o = s.tipo === "texto" ? c.textos[s.clave] : s.tipo === "logo" ? c.logo : s.tipo === "firma" ? c.firmas[s.i] : s.tipo === "qr" ? c.qr : null;
        if (!o) return;
        o.x = Math.max(-20, Math.min(HOJA.ancho + 20, nx));
        o.y = Math.max(-10, Math.min(HOJA.alto + 10, ny));
      });
    };
    const soltar = () => { window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", soltar); };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  };

  const guardar = async () => {
    if (!p) return;
    setGuardando(true);
    try {
      const r = await emitir<{ plantilla: PlantillaCertificado }>(socket, "cap:plantilla:guardar", { plantilla: p });
      setP(r.plantilla);
      setCambios(false);
      toast.success("Diseño guardado. Los certificados se descargarán con este diseño.");
    } catch (e) { toast.error((e as Error).message); } finally { setGuardando(false); }
  };

  const verPdf = async () => {
    if (!p) return;
    setCargandoVista(true);
    try {
      const r = await emitir<{ pdfBase64: string }>(socket, "cap:plantilla:preview", { plantilla: p });
      const bytes = Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0));
      setVista(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
    } catch (e) { toast.error((e as Error).message); } finally { setCargandoVista(false); }
  };

  const restablecer = async () => {
    if (!window.confirm("¿Volver al diseño original de FAMA? Se perderán los cambios del diseño actual.")) return;
    try {
      const r = await emitir<{ plantilla: PlantillaCertificado }>(socket, "cap:plantilla:restablecer");
      setP(r.plantilla);
      setCambios(false);
      toast.success("Diseño original restablecido");
    } catch (e) { toast.error((e as Error).message); }
  };

  const subirImagen = async (f: File | undefined, destino: (c: PlantillaCertificado, src: string) => void) => {
    if (!f) return;
    try {
      const src = await leerArchivo(f);
      actualizar((c) => destino(c, src));
    } catch (e) { toast.error((e as Error).message); }
  };

  const decoracion = useMemo(() => {
    if (!p || p.fondo.estilo !== "fama") return null;
    const W = HOJA.ancho, H = HOJA.alto, { colorPrimario: pr, colorSecundario: se, colorAcento: ac } = p.fondo;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={`M0 0 L${W * 0.2} 0 L0 ${H * 0.28} Z`} fill={pr} />
        <path d={`M0 0 L${W * 0.12} 0 L0 ${H * 0.17} Z`} fill={se} />
        <path d={`M${W} ${H} L${W * 0.8} ${H} L${W} ${H * 0.72} Z`} fill={pr} />
        <path d={`M${W} ${H} L${W * 0.88} ${H} L${W} ${H * 0.83} Z`} fill={se} />
        <rect x="9" y="9" width={W - 18} height={H - 18} fill="none" stroke={ac} strokeWidth="0.42" />
        <rect x="10.4" y="10.4" width={W - 20.8} height={H - 20.8} fill="none" stroke={ac} strokeWidth="0.15" />
        <line x1={W / 2 - 40} x2={W / 2 + 40} y1="69" y2="69" stroke={ac} strokeWidth="0.35" />
      </svg>
    );
  }, [p]);

  if (!p) return <div className="flex justify-center py-20"><LoaderCircle className="w-6 h-6 text-red-500 animate-spin" /></div>;

  const marco = (activo: boolean) => `absolute cursor-move outline-offset-2 ${activo ? "outline outline-2 outline-sky-500" : "hover:outline hover:outline-1 hover:outline-sky-400/70"}`;
  const textoSel = sel?.tipo === "texto" ? p.textos[sel.clave] : null;
  const imagenSel: (ImagenPos & { nombre?: string; cargo?: string }) | null = sel?.tipo === "logo" ? p.logo : sel?.tipo === "firma" ? p.firmas[sel.i] : null;

  const setTexto = (k: keyof CampoTexto, v: unknown) => sel?.tipo === "texto" && actualizar((c) => { (c.textos[sel.clave] as any)[k] = v; });
  const setImagen = (k: string, v: unknown) => actualizar((c) => {
    const o: any = sel?.tipo === "logo" ? c.logo : sel?.tipo === "firma" ? c.firmas[sel.i] : null;
    if (o) o[k] = v;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-zinc-400 mr-auto">Arrastra cada elemento sobre la hoja. Haz clic en uno para editarlo a la derecha.</p>
        <button onClick={restablecer} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold"><RotateCcw className="w-4 h-4" />Diseño original</button>
        <button onClick={verPdf} disabled={cargandoVista} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold">
          {cargandoVista ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}Vista previa PDF
        </button>
        <button onClick={guardar} disabled={guardando || !cambios} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold">
          {guardando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{cambios ? "Guardar diseño" : "Guardado"}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        {/* Hoja A4 horizontal */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-3 sm:p-5 overflow-hidden">
          <div ref={hoja} onPointerDown={() => setSel({ tipo: "fondo" })} className="relative w-full overflow-hidden bg-white shadow-2xl select-none" style={{ aspectRatio: `${HOJA.ancho} / ${HOJA.alto}` }}>
            {p.fondo.estilo === "imagen" && p.fondo.imagen && <img src={p.fondo.imagen} alt="" className="absolute inset-0 h-full w-full" draggable={false} />}
            {p.fondo.estilo === "simple" && <div className="absolute" style={{ inset: 9 * escala, border: `${1.5 * PT_MM * escala}px solid ${p.fondo.colorPrimario}` }} />}
            {decoracion}

            {p.logo.visible && p.logo.src && (
              <img src={p.logo.src} alt="Logo" draggable={false} onPointerDown={(e) => arrastrar(e, { tipo: "logo" }, p.logo.x, p.logo.y)}
                className={marco(sel?.tipo === "logo")} style={{ left: p.logo.x * escala, top: p.logo.y * escala, width: p.logo.ancho * escala }} />
            )}

            {p.firmas.map((f, i) => f.visible && (
              <div key={i} onPointerDown={(e) => arrastrar(e, { tipo: "firma", i }, f.x, f.y)} className={marco(sel?.tipo === "firma" && sel.i === i)}
                style={{ left: f.x * escala, top: f.y * escala, width: f.ancho * escala }}>
                {f.src ? <img src={f.src} alt="Firma" draggable={false} className="w-full" /> : <div className="h-10 border border-dashed border-zinc-400 text-[10px] text-zinc-500 grid place-items-center">Firma {i + 1}</div>}
                {(f.nombre || f.cargo) && (
                  <div className="border-t text-center" style={{ borderColor: p.fondo.colorSecundario, color: p.fondo.colorSecundario, fontFamily: "Helvetica, Arial", fontSize: 9 * PT_MM * escala, lineHeight: 1.3 }}>
                    <b style={{ fontSize: 10 * PT_MM * escala }}>{f.nombre}</b><br />{f.cargo}
                  </div>
                )}
              </div>
            ))}

            {(Object.keys(p.textos) as ClaveTexto[]).map((k) => {
              const c = p.textos[k];
              if (!c.visible) return null;
              const left = c.alinear === "centro" ? c.x - c.ancho / 2 : c.alinear === "derecha" ? c.x - c.ancho : c.x;
              return (
                <div key={k} onPointerDown={(e) => arrastrar(e, { tipo: "texto", clave: k }, c.x, c.y)} className={marco(sel?.tipo === "texto" && sel.clave === k)}
                  style={{
                    left: left * escala, top: c.y * escala, width: c.ancho * escala, color: c.color, textAlign: c.alinear === "centro" ? "center" : c.alinear === "derecha" ? "right" : "left",
                    fontSize: c.tam * PT_MM * escala, lineHeight: c.interlineado, whiteSpace: "pre-wrap", ...estiloFuente(c.fuente),
                  }}>
                  {reemplazar(c.texto)}
                </div>
              );
            })}

            {p.qr.visible && (
              <div onPointerDown={(e) => arrastrar(e, { tipo: "qr" }, p.qr.x, p.qr.y)} className={`${marco(sel?.tipo === "qr")} grid place-items-center bg-white`}
                style={{ left: p.qr.x * escala, top: p.qr.y * escala, width: p.qr.tam * escala, height: p.qr.tam * escala, border: `2px solid ${p.qr.color}` }}>
                <span className="text-[10px] font-black" style={{ color: p.qr.color }}>QR</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Vista aproximada. Usa «Vista previa PDF» para ver el resultado exacto.</p>
        </div>

        {/* Panel de propiedades */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(NOMBRES_TEXTO) as ClaveTexto[]).map((k) => (
              <button key={k} onClick={() => setSel({ tipo: "texto", clave: k })} className={`px-2 py-1 rounded-md text-[11px] font-bold ${sel?.tipo === "texto" && sel.clave === k ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>{NOMBRES_TEXTO[k]}</button>
            ))}
            <button onClick={() => setSel({ tipo: "logo" })} className={`px-2 py-1 rounded-md text-[11px] font-bold ${sel?.tipo === "logo" ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>Logo</button>
            {p.firmas.map((_, i) => (
              <button key={i} onClick={() => setSel({ tipo: "firma", i })} className={`px-2 py-1 rounded-md text-[11px] font-bold ${sel?.tipo === "firma" && sel.i === i ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>Firma {i + 1}</button>
            ))}
            <button onClick={() => setSel({ tipo: "qr" })} className={`px-2 py-1 rounded-md text-[11px] font-bold ${sel?.tipo === "qr" ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>QR</button>
            <button onClick={() => setSel({ tipo: "fondo" })} className={`px-2 py-1 rounded-md text-[11px] font-bold ${sel?.tipo === "fondo" ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>Fondo y general</button>
          </div>

          {textoSel && sel?.tipo === "texto" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white">{NOMBRES_TEXTO[sel.clave]}</h4>
                <button onClick={() => setTexto("visible", !textoSel.visible)} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white">{textoSel.visible ? <><Eye className="w-4 h-4" />Visible</> : <><EyeOff className="w-4 h-4" />Oculto</>}</button>
              </div>
              <Etiqueta t="Texto"><textarea className={inputCls} rows={sel.clave === "cuerpo" ? 5 : 2} value={textoSel.texto} onChange={(e) => setTexto("texto", e.target.value)} /></Etiqueta>
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map((v) => (
                  <button key={v} onClick={() => setTexto("texto", `${textoSel.texto}${v}`)} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300 hover:bg-zinc-700" title="Agregar al texto">{v}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Etiqueta t="Tamaño (pt)"><input type="number" className={inputCls} min={5} max={80} step={0.5} value={textoSel.tam} onChange={(e) => setTexto("tam", Number(e.target.value))} /></Etiqueta>
                <Etiqueta t="Color"><input type="color" className="h-9 w-full rounded-lg bg-zinc-950 border border-zinc-800" value={textoSel.color} onChange={(e) => setTexto("color", e.target.value)} /></Etiqueta>
                <Etiqueta t="Fuente"><select className={inputCls} value={textoSel.fuente} onChange={(e) => setTexto("fuente", e.target.value)}>{FUENTES.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}</select></Etiqueta>
                <Etiqueta t="Alineación"><select className={inputCls} value={textoSel.alinear} onChange={(e) => setTexto("alinear", e.target.value)}><option value="izquierda">Izquierda</option><option value="centro">Centro</option><option value="derecha">Derecha</option></select></Etiqueta>
                <Etiqueta t="Ancho (mm)"><input type="number" className={inputCls} min={10} max={297} value={textoSel.ancho} onChange={(e) => setTexto("ancho", Number(e.target.value))} /></Etiqueta>
                <Etiqueta t="Interlineado"><input type="number" className={inputCls} min={1} max={3} step={0.05} value={textoSel.interlineado} onChange={(e) => setTexto("interlineado", Number(e.target.value))} /></Etiqueta>
                <Etiqueta t="X (mm)"><input type="number" className={inputCls} step={0.5} value={textoSel.x} onChange={(e) => setTexto("x", Number(e.target.value))} /></Etiqueta>
                <Etiqueta t="Y (mm)"><input type="number" className={inputCls} step={0.5} value={textoSel.y} onChange={(e) => setTexto("y", Number(e.target.value))} /></Etiqueta>
              </div>
            </div>
          )}

          {imagenSel && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white">{sel?.tipo === "logo" ? "Logo" : `Firma ${(sel as any).i + 1}`}</h4>
                <button onClick={() => setImagen("visible", !imagenSel.visible)} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white">{imagenSel.visible ? <><Eye className="w-4 h-4" />Visible</> : <><EyeOff className="w-4 h-4" />Oculto</>}</button>
              </div>
              {imagenSel.src && <img src={imagenSel.src} alt="" className="max-h-24 self-start rounded bg-white p-1" />}
              <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold cursor-pointer">
                <ImagePlus className="w-4 h-4" />Cambiar imagen (PNG o JPG)
                <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => subirImagen(e.target.files?.[0], (c, src) => {
                  if (sel?.tipo === "logo") c.logo.src = src; else if (sel?.tipo === "firma") c.firmas[sel.i].src = src;
                })} />
              </label>
              <p className="text-[11px] text-zinc-500">Para firmas, usa PNG con fondo transparente.</p>
              <div className="grid grid-cols-3 gap-2">
                <Etiqueta t="Ancho (mm)"><input type="number" className={inputCls} min={5} max={297} value={imagenSel.ancho} onChange={(e) => setImagen("ancho", Number(e.target.value))} /></Etiqueta>
                <Etiqueta t="X (mm)"><input type="number" className={inputCls} step={0.5} value={imagenSel.x} onChange={(e) => setImagen("x", Number(e.target.value))} /></Etiqueta>
                <Etiqueta t="Y (mm)"><input type="number" className={inputCls} step={0.5} value={imagenSel.y} onChange={(e) => setImagen("y", Number(e.target.value))} /></Etiqueta>
              </div>
              {sel?.tipo === "firma" && (
                <>
                  <Etiqueta t="Nombre bajo la firma (opcional)"><input className={inputCls} value={imagenSel.nombre ?? ""} onChange={(e) => setImagen("nombre", e.target.value)} /></Etiqueta>
                  <Etiqueta t="Cargo (opcional)"><input className={inputCls} value={imagenSel.cargo ?? ""} onChange={(e) => setImagen("cargo", e.target.value)} /></Etiqueta>
                  <button onClick={() => { const i = (sel as any).i; actualizar((c) => { c.firmas.splice(i, 1); }); setSel({ tipo: "fondo" }); }} className="inline-flex items-center gap-1.5 self-start text-xs text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" />Quitar esta firma</button>
                </>
              )}
            </div>
          )}

          {sel?.tipo === "qr" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white">Código QR de verificación</h4>
                <button onClick={() => actualizar((c) => { c.qr.visible = !c.qr.visible; })} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white">{p.qr.visible ? <><Eye className="w-4 h-4" />Visible</> : <><EyeOff className="w-4 h-4" />Oculto</>}</button>
              </div>
              <p className="text-[11px] text-zinc-500">Abre la página de verificación del certificado en extintoresfama.com.</p>
              <div className="grid grid-cols-2 gap-2">
                <Etiqueta t="Tamaño (mm)"><input type="number" className={inputCls} min={12} max={60} value={p.qr.tam} onChange={(e) => actualizar((c) => { c.qr.tam = Number(e.target.value); })} /></Etiqueta>
                <Etiqueta t="Color"><input type="color" className="h-9 w-full rounded-lg bg-zinc-950 border border-zinc-800" value={p.qr.color} onChange={(e) => actualizar((c) => { c.qr.color = e.target.value; })} /></Etiqueta>
                <Etiqueta t="X (mm)"><input type="number" className={inputCls} step={0.5} value={p.qr.x} onChange={(e) => actualizar((c) => { c.qr.x = Number(e.target.value); })} /></Etiqueta>
                <Etiqueta t="Y (mm)"><input type="number" className={inputCls} step={0.5} value={p.qr.y} onChange={(e) => actualizar((c) => { c.qr.y = Number(e.target.value); })} /></Etiqueta>
              </div>
            </div>
          )}

          {sel?.tipo === "fondo" && (
            <div className="flex flex-col gap-3">
              <h4 className="font-black text-white">Fondo y datos generales</h4>
              <Etiqueta t="Nombre del curso ({curso})"><input className={inputCls} value={p.curso} onChange={(e) => actualizar((c) => { c.curso = e.target.value; })} /></Etiqueta>
              <Etiqueta t="Vigencia del certificado (meses, 0 = sin vencimiento)"><input type="number" className={inputCls} min={0} max={60} value={p.vigenciaMeses} onChange={(e) => actualizar((c) => { c.vigenciaMeses = Number(e.target.value); })} /></Etiqueta>
              <Etiqueta t="Estilo de fondo">
                <select className={inputCls} value={p.fondo.estilo} onChange={(e) => actualizar((c) => { c.fondo.estilo = e.target.value as any; })}>
                  <option value="fama">Diseño FAMA (esquinas y marco)</option>
                  <option value="simple">Marco simple</option>
                  <option value="imagen">Imagen propia (hecha en Canva, Photoshop…)</option>
                </select>
              </Etiqueta>
              {p.fondo.estilo === "imagen" && (
                <>
                  <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold cursor-pointer">
                    <ImagePlus className="w-4 h-4" />{p.fondo.imagen ? "Cambiar imagen de fondo" : "Subir imagen de fondo"}
                    <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => subirImagen(e.target.files?.[0], (c, src) => { c.fondo.imagen = src; })} />
                  </label>
                  <p className="text-[11px] text-zinc-500">Tamaño recomendado: 3508 × 2480 px (A4 horizontal). Deja libres las zonas donde van los textos.</p>
                </>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Etiqueta t="Principal"><input type="color" className="h-9 w-full rounded-lg bg-zinc-950 border border-zinc-800" value={p.fondo.colorPrimario} onChange={(e) => actualizar((c) => { c.fondo.colorPrimario = e.target.value; })} /></Etiqueta>
                <Etiqueta t="Secundario"><input type="color" className="h-9 w-full rounded-lg bg-zinc-950 border border-zinc-800" value={p.fondo.colorSecundario} onChange={(e) => actualizar((c) => { c.fondo.colorSecundario = e.target.value; })} /></Etiqueta>
                <Etiqueta t="Acento"><input type="color" className="h-9 w-full rounded-lg bg-zinc-950 border border-zinc-800" value={p.fondo.colorAcento} onChange={(e) => actualizar((c) => { c.fondo.colorAcento = e.target.value; })} /></Etiqueta>
              </div>
              {p.firmas.length < 3 && (
                <button onClick={() => actualizar((c) => { c.firmas.push({ src: null, x: 190, y: 150, ancho: 50, visible: true, nombre: "Nombre", cargo: "Cargo" }); })}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold"><Move className="w-4 h-4" />Agregar otra firma</button>
              )}
            </div>
          )}
        </div>
      </div>

      {vista && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Vista previa del certificado">
          <div className="flex items-center justify-between pb-3">
            <h3 className="text-white font-black">Vista previa (datos de ejemplo)</h3>
            <div className="flex gap-2">
              <button onClick={async () => { const r = await emitir<{ pdfBase64: string }>(socket, "cap:plantilla:preview", { plantilla: p }); descargarBase64(r.pdfBase64, "vista-previa-certificado.pdf"); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 text-zinc-100 text-xs font-bold"><FileDown className="w-4 h-4" />Descargar</button>
              <button onClick={() => setVista(null)} className="p-2 rounded-xl bg-zinc-800 text-zinc-200" aria-label="Cerrar"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <iframe src={vista} title="Vista previa del certificado" className="flex-1 w-full rounded-xl bg-white" />
        </div>
      )}
    </div>
  );
}
