import { useState, type Dispatch, type SetStateAction } from "react";
import type { Socket } from "socket.io-client";
import type { InventarioItem } from "../../types";
import { PESOS_GAL, PESOS_KG, PESOS_LB, PESOS_LT } from "../../constants";
import { CreatableSelect } from "../ui/CreatableSelect";

interface Props {
  isOpen: boolean;
  form: InventarioItem | null;
  setForm: Dispatch<SetStateAction<InventarioItem | null>>;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  socket: Socket | null;
  userRole: string;
  categorias: string[];
  marcas: string[];
  agentes: string[];
  capacidades: string[];
  codigosExistentes: string[];
}

const IGV_RATE = 0.18;
const selectCls = "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-600";
const UNIDADES: { value: "KG" | "LB" | "LT" | "GAL"; label: string; opciones: readonly string[] }[] = [
  { value: "KG", label: "kg", opciones: PESOS_KG },
  { value: "LB", label: "lb", opciones: PESOS_LB },
  { value: "LT", label: "litros", opciones: PESOS_LT },
  { value: "GAL", label: "galones", opciones: PESOS_GAL },
];

const parsePeso = (peso: string) => {
  const [cantidad, unidadLabel] = (peso || "").split(" ");
  const unidad = UNIDADES.find((u) => u.label === unidadLabel)?.value || "KG";
  return { cantidad: cantidad || "", unidad };
};

const limpiar = (s: string) => (s || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");

const codigoPalabras = (texto: string, primeraLen = 3) => {
  const palabras = (texto || "").trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "";
  if (palabras.length === 1) return limpiar(palabras[0]).slice(0, primeraLen + 1);
  const primera = limpiar(palabras[0]).slice(0, primeraLen);
  const iniciales = palabras.slice(1).map((p) => limpiar(p).slice(0, 1)).join("");
  return `${primera}${iniciales}`;
};

const generarCodigo = (
  categoria: string,
  peso: string,
  unidad: string,
  agente: string,
  capacidad: string,
  marca: string,
  operacion: string,
  existentes: string[],
) => {
  const esExtintor = categoria.toLowerCase().includes("extintor");
  let base: string;
  if (esExtintor) {
    const op = operacion === "Recarga" ? "R" : "V";
    const pesoNum = (peso.match(/\d+(\.\d+)?/) || [""])[0];
    const agenteCode = codigoPalabras(agente);
    const capCode = limpiar(capacidad).replace(/%/g, "");
    const marcaCode = codigoPalabras(marca);
    const partes = [`${pesoNum}${unidad}`, `${agenteCode}${capCode}`, marcaCode].filter(Boolean);
    base = `EXT${op}-${partes.join("-")}`;
  } else {
    const prefijo = limpiar(categoria).slice(0, 3) || "PRD";
    const usados = existentes
      .filter((c) => c.startsWith(`${prefijo}-`))
      .map((c) => parseInt(c.replace(`${prefijo}-`, ""), 10))
      .filter((n) => !isNaN(n));
    const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
    base = `${prefijo}-${String(siguiente).padStart(3, "0")}`;
  }
  let codigo = base;
  let i = 1;
  while (existentes.includes(codigo)) {
    i++;
    codigo = `${base}-${i}`;
  }
  return codigo;
};

const generarNombre = (peso: string, agente: string, capacidad: string, marca: string) => {
  const partes = ["Extintor", peso, agente, capacidad].map((p) => p.trim()).filter(Boolean);
  let nombre = partes.join(" ");
  if (marca.trim()) nombre += ` - ${marca.trim()}`;
  return nombre;
};

export default function InventarioModal({ isOpen, form, setForm, onClose, onSave, saving, socket, userRole, categorias, marcas, agentes, capacidades, codigosExistentes }: Props) {
  const [nombreManual, setNombreManual] = useState(false);
  const [unidad, setUnidad] = useState<"KG" | "LB" | "LT" | "GAL">(() => parsePeso(form?.peso || "").unidad);

  if (!isOpen || !form) return null;

  const esExtintor = form.categoria.toLowerCase().includes("extintor");
  const esServicio = form.categoria.toLowerCase().includes("servicio");
  const total = form.precioTotal || 0;
  const subtotal = total / (1 + IGV_RATE);
  const igv = total - subtotal;
  const cantidadPeso = parsePeso(form.peso || "").cantidad;
  const opcionesPeso = UNIDADES.find((u) => u.value === unidad)!.opciones;
  const unidadLabel = UNIDADES.find((u) => u.value === unidad)!.label;

  const actualizarCamposExtintor = (cambios: Partial<InventarioItem>, unidadActual: string = unidad) => {
    setForm((p) => {
      if (!p) return p;
      const next = { ...p, ...cambios };
      const peso = (next.peso || "").toString();
      const agente = next.agente || "";
      const capacidad = next.capacidad || "";
      const marca = next.marca || "";
      if (!nombreManual) next.nombre = generarNombre(peso, agente, capacidad, marca);
      if (!p.id) next.codigo = generarCodigo(next.categoria, peso, unidadActual, agente, capacidad, marca, next.operacion || "Venta", codigosExistentes);
      return next;
    });
  };

  const actualizarCantidadPeso = (cantidad: string) => {
    actualizarCamposExtintor({ peso: cantidad ? `${cantidad} ${unidadLabel}` : "" });
  };

  const actualizarUnidad = (nuevaUnidad: "KG" | "LB" | "LT" | "GAL") => {
    setUnidad(nuevaUnidad);
    actualizarCamposExtintor({ peso: "" }, nuevaUnidad);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="px-8 py-5 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
          <h3 className="text-xl font-bold text-white">{form.id ? "✏️ Editar Producto" : "📦 Nuevo Producto"}</h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
        <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-bold text-zinc-400 uppercase">Categoría</label>
            <CreatableSelect
              value={form.categoria}
              onChange={(v) => actualizarCamposExtintor({ categoria: v })}
              options={categorias}
              catalogType="categoria_inventario"
              socket={socket}
              userRole={userRole}
              className={selectCls}
            />
          </div>

          {esExtintor && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 p-5 rounded-2xl bg-zinc-950/40 border border-zinc-800/60">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Operación</label>
                <select value={form.operacion || "Venta"} onChange={(e) => actualizarCamposExtintor({ operacion: e.target.value })} className={selectCls}>
                  <option value="Venta">Venta</option>
                  <option value="Recarga">Recarga</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Unidad</label>
                <select value={unidad} onChange={(e) => actualizarUnidad(e.target.value as "KG" | "LB" | "LT" | "GAL")} className={selectCls}>
                  {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Peso / Capacidad ({unidadLabel})</label>
                <select value={cantidadPeso} onChange={(e) => actualizarCantidadPeso(e.target.value)} className={selectCls}>
                  <option value="">Seleccionar...</option>
                  {opcionesPeso.map((v) => <option key={v} value={v}>{v} {unidadLabel}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Agente</label>
                <CreatableSelect value={form.agente || ""} onChange={(v) => actualizarCamposExtintor({ agente: v })} options={agentes} catalogType="agente" socket={socket} userRole={userRole} className={selectCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Marca</label>
                <CreatableSelect value={form.marca || ""} onChange={(v) => actualizarCamposExtintor({ marca: v })} options={marcas} catalogType="marca" socket={socket} userRole={userRole} className={selectCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Calidad de Polvo</label>
                <CreatableSelect value={form.capacidad || ""} onChange={(v) => actualizarCamposExtintor({ capacidad: v })} options={capacidades} catalogType="capacidad" socket={socket} userRole={userRole} className={selectCls} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-bold text-zinc-400 uppercase">Código</label>
            <input value={form.codigo} onChange={(e) => setForm((p) => p && { ...p, codigo: e.target.value })} className={selectCls} placeholder="Se genera automáticamente" />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-bold text-zinc-400 uppercase">Nombre / Descripción</label>
            <input
              value={form.nombre}
              onChange={(e) => { setNombreManual(true); setForm((p) => p && { ...p, nombre: e.target.value }); }}
              className={selectCls}
              placeholder={esServicio ? "Ej: Prueba Hidrostática" : "Ej: Extintor 6 kg PQS 75%"}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-bold text-zinc-400 uppercase">Precio Total (incluye IGV)</label>
            <input type="number" min={0} step="0.01" value={form.precioTotal} onChange={(e) => setForm((p) => p && { ...p, precioTotal: parseFloat(e.target.value) || 0 })} className={selectCls} placeholder="0.00" />
          </div>

          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-zinc-950 border-2 border-zinc-800 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300 font-bold uppercase tracking-wide">Total a cobrar</span>
              <span className="text-2xl text-white font-black">S/{total.toFixed(2)}</span>
            </div>
            <div className="h-px bg-zinc-800" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-bold">IGV (18%)</span>
              <span className="text-sm text-amber-400 font-black">S/{igv.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-bold">Subtotal (sin IGV)</span>
              <span className="text-sm text-emerald-400 font-black">S/{subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="px-8 py-5 border-t border-zinc-800 flex justify-end gap-3 sticky bottom-0 bg-zinc-900">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Cancelar</button>
          <button onClick={onSave} disabled={saving || !form.codigo || !form.nombre} className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}