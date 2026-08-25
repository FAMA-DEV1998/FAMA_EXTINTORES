import { useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { useInventario } from "../../hooks/dashboard";
import { useCatalogLists } from "../../hooks/useCatalogLists";
import type { Catalogs } from "../../hooks/useSocket";
import { InventarioModal } from "../../components/modals";

const IGV_RATE = 0.18;

type Orden = "nombre" | "precio";

export default function InventarioPage({ socket, catalogs, userRole }: { socket: Socket | null; catalogs: Catalogs; userRole: string }) {
  const { items, modal, setModal, editing, setEditing, saving, openCreate, openEdit, save, remove } = useInventario(socket);
  const { MARCAS, AGENTES, CATEGORIAS_INVENTARIO, CAPACIDADES } = useCatalogLists(catalogs);
  const [search, setSearch] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [orden, setOrden] = useState<Orden>("nombre");

  const categorias = useMemo(() => {
    const deCatalogo = CATEGORIAS_INVENTARIO;
    const deItems = [...new Set(items.map((i) => i.categoria).filter(Boolean))];
    return [...new Set([...deCatalogo, ...deItems])].sort((a, b) => a.localeCompare(b, "es"));
  }, [items, CATEGORIAS_INVENTARIO]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => !q || i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q))
      .filter((i) => !fCategoria || i.categoria === fCategoria)
      .sort((a, b) => {
        if (orden === "precio") return (b.precioTotal || 0) - (a.precioTotal || 0);
        return a.nombre.localeCompare(b.nombre, "es");
      });
  }, [items, search, fCategoria, orden]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
        <div>
          <h1 className="text-xl font-black text-white">📦 Inventario</h1>
          <p className="text-xs text-zinc-500 mt-1">Productos y stock — no extintores individuales</p>
        </div>
        <button
          onClick={openCreate}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 shrink-0"
        >
          <span className="text-lg leading-none">+</span> Nuevo Producto
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-zinc-800/60 bg-zinc-950/30 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-60">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all"
            />
          </div>
          <select value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-300 focus:outline-none focus:border-red-600">
            <option value="">Categoría: Todas</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-300 focus:outline-none focus:border-red-600">
            <option value="nombre">Ordenar: Nombre (A-Z)</option>
            <option value="precio">Ordenar: Precio (mayor a menor)</option>
          </select>
          <span className="ml-auto px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">{filtrados.length} productos</span>
        </div>

        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
            <span className="text-5xl">📦</span>
            <p className="text-sm font-medium">{items.length === 0 ? "Aún no hay productos registrados" : "Ningún producto coincide con la búsqueda"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/60">
                  <th className="px-6 py-3">Código</th>
                  <th className="px-3 py-3">Producto</th>
                  <th className="px-3 py-3">Categoría</th>
                  <th className="px-3 py-3">Precio</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item, i) => {
                  const total = item.precioTotal || 0;
                  const subtotal = total / (1 + IGV_RATE);
                  const igv = total - subtotal;
                  return (
                    <tr key={item.id} className={`border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors ${i % 2 === 1 ? "bg-zinc-950/20" : ""}`}>
                      <td className="px-6 py-3.5 font-mono text-xs text-zinc-400">{item.codigo}</td>
                      <td className="px-3 py-3.5">
                        <p className="font-bold text-zinc-100">{item.nombre}</p>
                        {item.operacion && <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{item.operacion}</p>}
                      </td>
                      <td className="px-3 py-3.5 text-zinc-400">{item.categoria || "—"}</td>
                      <td className="px-3 py-3.5">
                        <div className="inline-flex flex-col gap-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800">
                          <p className="font-black text-white text-base leading-none">S/{total.toFixed(2)}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span className="text-amber-400">IGV S/{igv.toFixed(2)}</span>
                            <span className="text-zinc-600">·</span>
                            <span className="text-emerald-400">Subt. S/{subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center">✏️</button>
                          <button onClick={() => remove(item.id)} className="w-8 h-8 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 flex items-center justify-center">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InventarioModal
        isOpen={modal}
        form={editing}
        setForm={setEditing}
        onClose={() => setModal(false)}
        onSave={save}
        saving={saving}
        socket={socket}
        userRole={userRole}
        categorias={CATEGORIAS_INVENTARIO}
        marcas={MARCAS}
        agentes={AGENTES}
        capacidades={CAPACIDADES}
        codigosExistentes={items.filter((i) => i.id !== editing?.id).map((i) => i.codigo)}
      />
    </div>
  );
}
