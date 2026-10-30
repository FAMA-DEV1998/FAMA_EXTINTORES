import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, ExternalLink, ImagePlus, LoaderCircle, Save, Search, Star, Trash2, X } from "lucide-react";
import {
  SITIO_WEB, emitir, prepararImagen, productoVacio, urlImagen,
  type ImagenWeb, type ProductoWeb, type Taxonomias,
} from "./useProductosWeb";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

const CLASES = [
  { k: "esClaseA", l: "A", t: "Sólidos", c: "bg-emerald-600" },
  { k: "esClaseB", l: "B", t: "Líquidos", c: "bg-red-600" },
  { k: "esClaseC", l: "C", t: "Eléctricos", c: "bg-sky-600" },
  { k: "esClaseD", l: "D", t: "Metales", c: "bg-amber-600" },
  { k: "esClaseK", l: "K", t: "Cocina", c: "bg-zinc-600" },
] as const;

const LOGOS = [
  { k: "logoUl", l: "UL" }, { k: "logoAnsi", l: "ANSI" }, { k: "logoOsinergmin", l: "Osinergmin" },
  { k: "logoIndeci", l: "INDECI" }, { k: "logoNfpa", l: "NFPA" }, { k: "logoFm", l: "FM Approved" },
] as const;

const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-600";

function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 flex flex-col gap-4">
      <div>
        <h4 className="text-sm font-black text-white uppercase tracking-wider">{titulo}</h4>
        {ayuda && <p className="text-xs text-zinc-500 mt-1">{ayuda}</p>}
      </div>
      {children}
    </section>
  );
}

function Campo({ label, ayuda, className = "", children }: { label: string; ayuda?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-bold text-zinc-400">{label}</span>
      {children}
      {ayuda && <span className="text-[11px] text-zinc-600">{ayuda}</span>}
    </label>
  );
}

function Interruptor({ activo, onChange, label }: { activo: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!activo)} aria-pressed={activo}
      className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${activo ? "border-red-800/60 bg-red-950/30 text-red-300" : "border-zinc-800 bg-zinc-950 text-zinc-500"}`}>
      <span className={`relative w-8 h-4.5 rounded-full transition-colors ${activo ? "bg-red-600" : "bg-zinc-700"}`}>
        <span className={`absolute top-0.5 size-3.5 rounded-full bg-white transition-all ${activo ? "left-4" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

interface Props {
  socket: Socket;
  taxonomias: Taxonomias;
  productoId: number | null;
  onClose: () => void;
  onSaved: (id: number) => void;
}

export default function ProductoWebForm({ socket, taxonomias, productoId, onClose, onSaved }: Props) {
  const [p, setP] = useState<ProductoWeb>(productoVacio());
  const [cargando, setCargando] = useState(!!productoId);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(0);
  const [slugManual, setSlugManual] = useState(!!productoId);
  const [buscarApp, setBuscarApp] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const esNuevo = !productoId;

  useEffect(() => {
    if (!productoId) return;
    emitir<{ producto: ProductoWeb }>(socket, "web:producto:detalle", { id: productoId })
      .then((r) => setP({ ...productoVacio(), ...r.producto }))
      .catch((e) => { toast.error(e.message); onClose(); })
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !guardando && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [guardando, onClose]);

  const set = <K extends keyof ProductoWeb>(k: K, v: ProductoWeb[K]) => setP((prev) => ({ ...prev, [k]: v }));
  const txt = (k: keyof ProductoWeb) => ({
    value: (p[k] as string | number | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
    className: inputCls,
  });
  const sel = (k: "brandId" | "agentId" | "capacityRangeId" | "categoryId") => ({
    value: p[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => set(k, e.target.value ? Number(e.target.value) : null),
    className: inputCls,
  });

  const slug = slugManual ? p.slug || "" : slugify(p.name);

  async function subir(files: FileList | File[]) {
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!lista.length) return;
    setSubiendo((n) => n + lista.length);
    for (const f of lista) {
      try {
        const dataUrl = await prepararImagen(f);
        const r = await emitir<{ imagen: ImagenWeb }>(socket, "web:producto:imagen", { dataUrl, nombre: p.name || f.name.replace(/\.\w+$/, "") });
        setP((prev) => ({ ...prev, imagenes: [...prev.imagenes, { ...r.imagen, alt: prev.name || null }] }));
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
  }

  const moverImagen = (i: number, d: -1 | 1) => setP((prev) => {
    const imgs = [...prev.imagenes];
    const j = i + d;
    if (j < 0 || j >= imgs.length) return prev;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    return { ...prev, imagenes: imgs };
  });

  const apps = useMemo(() => {
    const q = slugify(buscarApp);
    return taxonomias.aplicaciones.filter((a) => !q || a.slug.includes(q) || slugify(a.name).includes(q));
  }, [buscarApp, taxonomias.aplicaciones]);

  async function guardar() {
    if (p.name.trim().length < 3) return toast.error("Escribe el nombre del producto");
    if (p.isActive && !p.imagenes.length) return toast.error("Agrega al menos una imagen (o desmarca “Visible en la web”)");
    if (p.capacityValue !== null && p.capacityValue !== "" && !p.capacityUnit) return toast.error("Indica la unidad de la capacidad");
    setGuardando(true);
    try {
      const { wcId: _wc, ...datos } = p;
      const r = await emitir<{ producto: ProductoWeb }>(socket, "web:producto:guardar", {
        ...datos,
        id: productoId ?? undefined,
        slug,
        imagenes: p.imagenes.map((im) => ({ ...im, alt: im.alt || p.name })),
      });
      toast.success(esNuevo ? "Producto creado. Pulsa “Publicar web” para que aparezca en la tienda." : "Cambios guardados");
      onSaved(r.producto.id!);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  const seoTitulo = p.seoTitle || `${p.name || "Nombre del producto"} | Extintores Fama`;
  const seoDesc = p.seoDescription || p.shortDescription || "Se genera automáticamente con la marca, el agente, la capacidad y las clases de fuego del producto.";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center overflow-y-auto" role="dialog" aria-modal="true" aria-label={esNuevo ? "Nuevo producto" : "Editar producto"}>
      <div className="w-full max-w-5xl my-0 sm:my-6 bg-zinc-950 sm:rounded-3xl border border-zinc-800 flex flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 sm:rounded-t-3xl">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black text-white truncate">{esNuevo ? "Nuevo producto" : p.name || "Editar producto"}</h3>
            <p className="text-[11px] text-zinc-500 truncate">{SITIO_WEB}/producto/<span className="text-zinc-300">{slug || "…"}</span>/</p>
          </div>
          {!esNuevo && p.slug && (
            <a href={`${SITIO_WEB}/producto/${p.slug}/`} target="_blank" rel="noopener" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold"><ExternalLink className="w-4 h-4" />Ver en la web</a>
          )}
          <button onClick={onClose} disabled={guardando} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </header>

        {cargando ? (
          <div className="flex items-center justify-center py-32"><LoaderCircle className="w-6 h-6 text-red-500 animate-spin" /></div>
        ) : (
          <div className="p-4 sm:p-6 flex flex-col gap-5">
            <Seccion titulo="Datos generales">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Nombre del producto *" className="sm:col-span-2" ayuda="Como aparece en la tienda. Ej.: EXTINTOR BADGER PQS ABC DE 6 KG">
                  <input {...txt("name")} placeholder="EXTINTOR …" autoFocus={esNuevo} />
                </Campo>
                <Campo label="URL del producto" ayuda="Se genera desde el nombre. Cambiarla en un producto publicado afecta a Google.">
                  <input className={inputCls} value={slug} onChange={(e) => { setSlugManual(true); set("slug", slugify(e.target.value)); }} />
                </Campo>
                <Campo label="SKU / código interno"><input {...txt("sku")} /></Campo>
                <Campo label="Marca">
                  <select {...sel("brandId")}><option value="">—</option>{taxonomias.marcas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                </Campo>
                <Campo label="Tipo de agente">
                  <select {...sel("agentId")}><option value="">—</option>{taxonomias.agentes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                </Campo>
                <Campo label="Categoría">
                  <select {...sel("categoryId")}><option value="">—</option>{taxonomias.categorias.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                </Campo>
                <Campo label="Rango de capacidad (filtro de la tienda)">
                  <select {...sel("capacityRangeId")}><option value="">—</option>{taxonomias.capacidades.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                </Campo>
                <Campo label="Capacidad de carga">
                  <div className="flex gap-2">
                    <input {...txt("capacityValue")} inputMode="decimal" placeholder="6" />
                    <select className={`${inputCls} w-32`} value={p.capacityUnit ?? ""} onChange={(e) => set("capacityUnit", e.target.value || null)}>
                      <option value="lb">Libras</option><option value="kg">Kilos</option><option value="gal">Galones</option><option value="L">Litros</option>
                    </select>
                  </div>
                </Campo>
              </div>
              <div className="flex flex-wrap gap-2">
                <Interruptor activo={p.isActive} onChange={(v) => set("isActive", v)} label="Visible en la web" />
                <Interruptor activo={p.isFeatured} onChange={(v) => set("isFeatured", v)} label="Destacado (sale primero en la tienda)" />
                <Interruptor activo={p.inStock} onChange={(v) => set("inStock", v)} label="En stock" />
              </div>
            </Seccion>

            <Seccion titulo="Imágenes" ayuda="La primera es la principal. Se ajustan solas al formato de la tienda (800×1050, fondo blanco); usa fotos con fondo blanco.">
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastrando(false); subir(e.dataTransfer.files); }}
                className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 rounded-2xl p-1 transition-colors ${arrastrando ? "bg-red-950/30 outline-2 outline-dashed outline-red-700" : ""}`}
              >
                {p.imagenes.map((im, i) => (
                  <div key={im.src + i} className="group relative rounded-xl overflow-hidden border border-zinc-800 bg-white">
                    <img src={urlImagen(im.src)} alt={im.alt || ""} className="w-full aspect-[800/1050] object-contain" loading="lazy" />
                    {i === 0 && <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white"><Star className="w-3 h-3" />Principal</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                      <button type="button" onClick={() => moverImagen(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg bg-zinc-900/90 text-zinc-200 disabled:opacity-30" aria-label="Mover a la izquierda"><ArrowLeft className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => set("imagenes", p.imagenes.filter((_, j) => j !== i))} className="p-1.5 rounded-lg bg-red-700 text-white" aria-label="Quitar imagen"><Trash2 className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => moverImagen(i, 1)} disabled={i === p.imagenes.length - 1} className="p-1.5 rounded-lg bg-zinc-900/90 text-zinc-200 disabled:opacity-30" aria-label="Mover a la derecha"><ArrowRight className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-2 aspect-[800/1050] rounded-xl border-2 border-dashed border-zinc-800 text-zinc-500 hover:border-red-700 hover:text-red-400 transition-colors">
                  {subiendo ? <LoaderCircle className="w-7 h-7 animate-spin" /> : <ImagePlus className="w-7 h-7" />}
                  <span className="text-xs font-bold text-center px-2">{subiendo ? "Subiendo…" : "Agregar o arrastrar fotos"}</span>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) subir(e.target.files); e.target.value = ""; }} />
            </Seccion>

            <Seccion titulo="Ficha técnica" ayuda="Cada campo con valor aparece como un recuadro en la página del producto. Deja vacío lo que no aplique.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Campo label="Rating UL" ayuda="Ej.: 4A:80B:C"><input {...txt("ulRating")} /></Campo>
                <Campo label="NO conductor eléctrico hasta" ayuda="Ej.: 100,000 Voltios (va encima de Capacidad)"><input {...txt("noConductor")} /></Campo>
                <div className="hidden lg:block" />
                <Campo label="Presión de prueba">
                  <div className="flex gap-2"><input {...txt("testPressure")} inputMode="decimal" />
                    <select className={`${inputCls} w-24`} value={p.testPressureUnit ?? "PSI"} onChange={(e) => set("testPressureUnit", e.target.value)}><option>PSI</option><option>BAR</option></select></div>
                </Campo>
                <Campo label="Presión de trabajo">
                  <div className="flex gap-2"><input {...txt("workingPressure")} inputMode="decimal" />
                    <select className={`${inputCls} w-24`} value={p.workingPressureUnit ?? "PSI"} onChange={(e) => set("workingPressureUnit", e.target.value)}><option>PSI</option><option>BAR</option></select></div>
                </Campo>
                <div className="hidden lg:block" />
                <Campo label="Altura (cm)"><input {...txt("heightCm")} inputMode="decimal" /></Campo>
                <Campo label="Ancho (cm)"><input {...txt("widthCm")} inputMode="decimal" /></Campo>
                <Campo label="Diámetro (cm)"><input {...txt("diameterCm")} inputMode="decimal" /></Campo>
                <Campo label="Peso" ayuda="Ej.: 10.5 Kg Aprox."><input {...txt("weight")} /></Campo>
                <Campo label="Alcance" ayuda="Ej.: 3 a 5 Metros"><input {...txt("reach")} /></Campo>
                <Campo label="Pintura" ayuda="Ej.: Polvo Color Rojo"><input {...txt("paint")} /></Campo>
                <Campo label="Acabado" ayuda="Ej.: Electrostático"><input {...txt("finish")} /></Campo>
                <Campo label="Longitud de manguera"><input {...txt("hoseLength")} /></Campo>
                <Campo label="Resistencia de manguera"><input {...txt("hoseResistance")} /></Campo>
                <Campo label="Instalación en techo" ayuda="Solo sprinklers"><input {...txt("ceilingInstall")} /></Campo>
                <Campo label="Rango de extinción" ayuda="Solo sprinklers"><input {...txt("extinctionRange")} /></Campo>
              </div>
            </Seccion>

            <Seccion titulo="Clases de fuego">
              <div className="flex flex-wrap gap-2">
                {CLASES.map(({ k, l, t, c }) => (
                  <button key={k} type="button" onClick={() => set(k, !p[k])} aria-pressed={p[k]}
                    className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${p[k] ? "border-zinc-600 bg-zinc-800 text-white" : "border-zinc-800 bg-zinc-950 text-zinc-500"}`}>
                    <span className={`grid size-7 place-items-center rounded-lg text-sm font-black text-white ${p[k] ? c : "bg-zinc-800"}`}>{l}</span>{t}
                  </button>
                ))}
              </div>
            </Seccion>

            <Seccion titulo="Certificaciones y aprobaciones" ayuda="Un renglón por línea. Escribe **texto** para ponerlo en negrita.">
              <textarea {...txt("certificationsText")} rows={4} placeholder={"Certificado por **UL** y aprobado por **INDECI**"} />
              <div className="flex flex-wrap gap-2">
                {LOGOS.map(({ k, l }) => <Interruptor key={k} activo={p[k]} onChange={(v) => set(k, v)} label={l} />)}
              </div>
            </Seccion>

            <Seccion titulo={`Aplicaciones (${p.aplicaciones.length})`} ayuda="Lugares donde se recomienda el extintor.">
              <div className="relative sm:w-72">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={buscarApp} onChange={(e) => setBuscarApp(e.target.value)} placeholder="Buscar aplicación…" className={`${inputCls} pl-9`} />
              </div>
              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                {apps.map((a) => {
                  const on = p.aplicaciones.includes(a.id);
                  return (
                    <button key={a.id} type="button" aria-pressed={on}
                      onClick={() => set("aplicaciones", on ? p.aplicaciones.filter((x) => x !== a.id) : [...p.aplicaciones, a.id])}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${on ? "border-red-800/60 bg-red-950/40 text-red-300" : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300"}`}>
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </Seccion>

            <Seccion titulo="Descripción y SEO" ayuda="Opcional. Si lo dejas vacío, la web genera textos optimizados con los datos del producto.">
              <Campo label="Descripción corta"><textarea {...txt("shortDescription")} rows={2} /></Campo>
              <Campo label="Descripción del extintor" ayuda="Vacío = se genera automáticamente."><textarea {...txt("description")} rows={5} /></Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label={`Título para Google (${(p.seoTitle || "").length}/60)`}><input {...txt("seoTitle")} maxLength={70} /></Campo>
                <Campo label={`Descripción para Google (${(p.seoDescription || "").length}/160)`}><textarea {...txt("seoDescription")} rows={2} maxLength={170} /></Campo>
              </div>
              <div className="rounded-xl bg-white p-4 font-sans">
                <p className="text-[12px] text-[#202124]">extintoresfama.com › producto › {slug || "…"}</p>
                <p className="text-[18px] leading-snug text-[#1a0dab] truncate">{seoTitulo}</p>
                <p className="text-[13px] text-[#4d5156] line-clamp-2">{seoDesc}</p>
              </div>
            </Seccion>
          </div>
        )}

        <footer className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-4 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 sm:rounded-b-3xl">
          <button onClick={onClose} disabled={guardando} className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-bold">Cancelar</button>
          <button onClick={guardar} disabled={guardando || cargando || subiendo > 0} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold">
            {guardando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{esNuevo ? "Crear producto" : "Guardar cambios"}
          </button>
        </footer>
      </div>
    </div>
  );
}
