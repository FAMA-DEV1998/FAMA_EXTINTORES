import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import {
  CircleAlert, CircleCheck, Copy, Eye, EyeOff, ExternalLink, LoaderCircle, PackageSearch, Pencil, Plus, Rocket, Search, Star, Store, Terminal, Trash2,
} from "lucide-react";
import ProductoWebForm from "./ProductoWebForm";
import { SITIO_WEB, emitir, urlImagen, useProductosWeb, useSitioWeb, type ProductoWebResumen } from "./useProductosWeb";

const UNIDAD: Record<string, string> = { lb: "lbs", kg: "kg", gal: "gal", L: "L" };
const fecha = (s: string) => {
  const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
  return isNaN(d.getTime()) ? s : d.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
};

function BarraPublicar({ socket }: { socket: Socket | null }) {
  const { estado, publicar } = useSitioWeb(socket);
  const [verLog, setVerLog] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  useEffect(() => { if (estado?.corriendo) setVerLog(true); }, [estado?.corriendo]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [estado?.log.length, verLog]);
  if (!estado) return null;

  const onPublicar = () => publicar().catch((e) => toast.error((e as Error).message));
  const titulo = estado.corriendo ? "Publicando la web…" : estado.pendiente ? "Hay cambios sin publicar" : "La web está al día";
  const detalle = estado.corriendo
    ? "Se está compilando y subiendo al hosting. Puede tardar unos minutos."
    : !estado.configurado
      ? "Para publicar desde aquí, define WEB_ASTRO_DIR (carpeta del proyecto web) en el .env del backend. También puedes ejecutar npm run deploy en esa carpeta."
      : estado.ultimo
        ? `Última publicación: ${fecha(estado.ultimo.fin)}${estado.ultimo.ok ? "" : " (falló)"}`
        : "Los productos nuevos o editados aparecen en la tienda al publicar.";

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${estado.pendiente || estado.corriendo ? "border-amber-900/50 bg-amber-950/10" : "border-zinc-800/60 bg-zinc-900/40"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${estado.ultimo && !estado.ultimo.ok ? "bg-red-950/50 text-red-400" : estado.pendiente || estado.corriendo ? "bg-amber-950/50 text-amber-400" : "bg-emerald-950/40 text-emerald-400"}`}>
          {estado.corriendo ? <LoaderCircle className="w-5 h-5 animate-spin" /> : estado.pendiente ? <CircleAlert className="w-5 h-5" /> : <CircleCheck className="w-5 h-5" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white">{titulo}</p>
          <p className="text-xs text-zinc-400">{detalle}</p>
        </div>
        <div className="flex gap-2">
          {estado.log.length > 0 && (
            <button onClick={() => setVerLog((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold"><Terminal className="w-4 h-4" />{verLog ? "Ocultar detalle" : "Ver detalle"}</button>
          )}
          <button onClick={onPublicar} disabled={!estado.configurado || estado.corriendo} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-bold">
            <Rocket className="w-4 h-4" />Publicar web
          </button>
        </div>
      </div>
      {verLog && (
        <pre ref={logRef} className="max-h-64 overflow-auto rounded-xl bg-black/60 border border-zinc-800 p-3 text-[11px] leading-relaxed text-zinc-400 whitespace-pre-wrap">{estado.log.join("\n")}</pre>
      )}
    </div>
  );
}

function Fila({ p, onEditar, onDuplicar, onVisible, onEliminar }: {
  p: ProductoWebResumen; onEditar: () => void; onDuplicar: () => void; onVisible: () => void; onEliminar: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 rounded-2xl border p-3 ${p.isActive ? "border-zinc-800/60 bg-zinc-900/40" : "border-zinc-800/40 bg-zinc-950/40 opacity-70"}`}>
      <button onClick={onEditar} className="shrink-0 w-14 sm:w-16 aspect-[800/1050] rounded-lg bg-white overflow-hidden" aria-label={`Editar ${p.name}`}>
        {p.imagen ? <img src={urlImagen(p.imagen)} alt="" loading="lazy" className="w-full h-full object-contain" /> : <PackageSearch className="w-6 h-6 m-auto text-zinc-400" />}
      </button>
      <div className="flex-1 min-w-0">
        <button onClick={onEditar} className="text-left text-sm font-black text-white hover:text-red-400 line-clamp-2">{p.name}</button>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
          {p.marca && <span className="px-1.5 py-0.5 rounded-md bg-zinc-800">{p.marca}</span>}
          {p.agente && <span className="px-1.5 py-0.5 rounded-md bg-zinc-800">{p.agente}</span>}
          {p.capacityValue != null && <span className="px-1.5 py-0.5 rounded-md bg-zinc-800">{p.capacityValue} {UNIDAD[p.capacityUnit || ""] ?? ""}</span>}
          {!!p.isFeatured && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-950/50 text-amber-400"><Star className="w-3 h-3" />Destacado</span>}
          {!p.isActive && <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500">Oculto</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={onEditar} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800" title="Editar"><Pencil className="w-4 h-4" /></button>
        <button onClick={onDuplicar} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800" title="Duplicar (crear uno parecido)"><Copy className="w-4 h-4" /></button>
        <button onClick={onVisible} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800" title={p.isActive ? "Ocultar de la web" : "Mostrar en la web"}>{p.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
        <a href={`${SITIO_WEB}/producto/${p.slug}/`} target="_blank" rel="noopener" className="hidden sm:inline-flex p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800" title="Ver en la web"><ExternalLink className="w-4 h-4" /></a>
        <button onClick={onEliminar} className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/40" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export default function ProductosWebPage({ socket }: { socket: Socket | null }) {
  const { productos, taxonomias, loading } = useProductosWeb(socket);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "visibles" | "ocultos" | "destacados">("todos");
  const [editando, setEditando] = useState<number | "nuevo" | null>(null);

  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return productos
      .filter((p) => filtro === "todos" || (filtro === "visibles" ? p.isActive : filtro === "ocultos" ? !p.isActive : p.isFeatured))
      .filter((p) => !q || [p.name, p.sku, p.marca, p.agente, p.slug].some((v) => (v || "").toLowerCase().includes(q)));
  }, [productos, buscar, filtro]);

  const accion = async (evento: string, datos: object, okMsg: string) => {
    if (!socket) return null;
    try {
      const r = await emitir<any>(socket, evento, datos);
      toast.success(okMsg);
      return r;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  };

  const duplicar = async (p: ProductoWebResumen) => {
    const r = await accion("web:producto:duplicar", { id: p.id }, "Copia creada (oculta). Edítala y actívala.");
    if (r?.producto?.id) setEditando(r.producto.id);
  };
  const eliminar = (p: ProductoWebResumen) => {
    if (!window.confirm(`¿Eliminar "${p.name}" del catálogo web?\n\nSi solo quieres que no se vea, usa "Ocultar". Eliminarlo no se puede deshacer.`)) return;
    accion("web:producto:eliminar", { id: p.id }, "Producto eliminado");
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2"><Store className="w-5 h-5 text-red-500" />Productos Web</h3>
          <p className="text-sm text-zinc-400 mt-1">Catálogo de la tienda en extintoresfama.com · {productos.filter((p) => p.isActive).length} visibles</p>
        </div>
        <button onClick={() => setEditando("nuevo")} disabled={!taxonomias} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold">
          <Plus className="w-4 h-4" />Nuevo producto
        </button>
      </div>

      <BarraPublicar socket={socket} />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex flex-wrap gap-2">
          {(["todos", "visibles", "ocultos", "destacados"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${filtro === f ? "bg-red-700 text-white" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"}`}>{f}</button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar producto, marca, SKU…" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-600" />
        </div>
      </div>

      {loading && !productos.length ? (
        <div className="flex items-center justify-center py-20"><LoaderCircle className="w-6 h-6 text-red-500 animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800/60">
          <PackageSearch className="w-12 h-12 mb-3 mx-auto text-zinc-700" strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay productos en esta vista.</p>
        </div>
      ) : (
        <div className="grid gap-2 xl:grid-cols-2">
          {lista.map((p) => (
            <Fila key={p.id} p={p}
              onEditar={() => setEditando(p.id)}
              onDuplicar={() => duplicar(p)}
              onVisible={() => accion("web:producto:guardar", { id: p.id, isActive: !p.isActive }, p.isActive ? "Producto oculto" : "Producto visible")}
              onEliminar={() => eliminar(p)} />
          ))}
        </div>
      )}

      {editando !== null && socket && taxonomias && (
        <ProductoWebForm
          socket={socket}
          taxonomias={taxonomias}
          productoId={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onSaved={() => setEditando(null)}
        />
      )}
    </div>
  );
}
