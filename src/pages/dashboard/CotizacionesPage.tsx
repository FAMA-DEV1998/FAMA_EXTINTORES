import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { useCotizaciones, useInventario } from "../../hooks/dashboard";
import CotizacionTemplate from "../../components/cotizaciones/CotizacionTemplate";
import { exportarElementoPdf } from "../../utils/exportarPdf";
import { MESES } from "../../constants";
import type { Cotizacion, CotizacionItem } from "../../types";

const UNIDADES_MEDIDA = ["UND", "KG", "LT", "GLN"];
const A4_WIDTH_PX = 210 * 3.7795275591;
const A4_HEIGHT_PX = 297 * 3.7795275591;

const fieldCls = "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-600";
const labelCls = "text-[10px] font-bold text-zinc-500 uppercase tracking-wide";
const sectionLabelCls = "text-[10px] font-bold text-zinc-600 uppercase tracking-widest";

const anioActual = () => String(new Date().getFullYear());

const nuevaCotizacion = (): Cotizacion => ({
  id: "",
  numero: "",
  fecha: `${anioActual()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
  cliente: "",
  tipoDestinatario: "empresa",
  ruc: "",
  tipoDocumento: "ruc",
  direccion: "",
  sede: "",
  guia: "",
  atencion: "",
  observacionesMes: "",
  formaPago: "contado",
  diasCredito: "30",
  items: [],
});

const nombreArchivo = (cotizacion: Cotizacion) => {
  const empresa = (cotizacion.cliente || "cotizacion").replace(/[^a-zA-Z0-9]+/g, "");
  return `${empresa}_${cotizacion.numero || "borrador"}.pdf`;
};

export default function CotizacionesPage({ socket }: { socket: Socket | null }) {
  const { cotizaciones, saving, guardar, archivar, obtenerProximoNumero } = useCotizaciones(socket);
  const { items: inventario } = useInventario(socket);
  const [tab, setTab] = useState<"guardadas" | "crear">("guardadas");
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [dirty, setDirty] = useState(false);
  const [buscarItem, setBuscarItem] = useState("");
  const [descargando, setDescargando] = useState(false);
  const [zoom, setZoom] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const [baseScale, setBaseScale] = useState(0.5);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!previewRef.current || tab !== "crear") return;
    const medir = () => {
      const ancho = previewRef.current?.clientWidth || 0;
      if (ancho > 0) setBaseScale(Math.max(0.2, (ancho - 32) / A4_WIDTH_PX));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(previewRef.current);
    return () => obs.disconnect();
  }, [tab]);

  const inventarioFiltrado = useMemo(() => {
    const q = buscarItem.trim().toLowerCase();
    if (!q || !cotizacion) return [];
    const codigosUsados = new Set(cotizacion.items.map((it) => it.codigo));
    return inventario
      .filter((i) => !codigosUsados.has(i.codigo))
      .filter((i) => i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q))
      .slice(0, 8);
  }, [inventario, buscarItem, cotizacion]);

  const mut = (fn: (p: Cotizacion) => Cotizacion) => {
    setDirty(true);
    setCotizacion((p) => (p ? fn(p) : p));
  };

  const setF = (k: keyof Cotizacion, v: string) => mut((p) => ({ ...p, [k]: v }));

  const [, mesFecha, diaFecha] = (cotizacion?.fecha || "-01-01").split("-");
  const setDia = (d: string) => setF("fecha", `${anioActual()}-${mesFecha || "01"}-${d.padStart(2, "0")}`);
  const setMes = (m: string) => setF("fecha", `${anioActual()}-${m.padStart(2, "0")}-${diaFecha || "01"}`);

  const agregarItem = (inv: (typeof inventario)[number]) => {
    if (cotizacion?.items.some((it) => it.codigo === inv.codigo)) {
      setBuscarItem("");
      return;
    }
    const item: CotizacionItem = {
      codigo: inv.codigo,
      descripcion: inv.nombre,
      detalle: "",
      um: "UND",
      cantidad: 1,
      precioUnit: inv.precioTotal || 0,
    };
    mut((p) => ({ ...p, items: [...p.items, item] }));
    setBuscarItem("");
  };

  const actualizarItem = (index: number, cambios: Partial<CotizacionItem>) => {
    mut((p) => ({ ...p, items: p.items.map((it, i) => (i === index ? { ...it, ...cambios } : it)) }));
  };

  const quitarItem = (index: number) => {
    mut((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  };

  const tipoDocumento = cotizacion?.tipoDocumento || "ruc";
  const largoEsperado = tipoDocumento === "dni" ? 8 : 11;
  const documentoValido = !cotizacion?.ruc || cotizacion.ruc.length === largoEsperado;
  const itemsInvalidos = (cotizacion?.items || []).some((it) => !it.cantidad || it.cantidad < 1 || !it.precioUnit || it.precioUnit <= 0);
  const puedeGuardar = !!cotizacion && !saving && !!cotizacion.cliente && documentoValido && cotizacion.items.length > 0 && !itemsInvalidos;
  const totalEstimado = (cotizacion?.items || []).reduce((s, it) => s + (it.cantidad || 0) * (it.precioUnit || 0), 0);
  const esCredito = cotizacion?.formaPago === "credito";

  const confirmarSalidaSinGuardar = () => !dirty || confirm("Tienes cambios sin guardar. ¿Deseas continuar sin guardar?");

  const handleGuardar = () => {
    if (!cotizacion) return;
    guardar(cotizacion, (ok, error, numero, id) => {
      if (ok) {
        setCotizacion((p) => (p ? { ...p, numero: numero || p.numero, id: id || p.id } : p));
        setDirty(false);
        setTab("guardadas");
      } else {
        alert(error || "No se pudo guardar la cotización");
      }
    });
  };

  const handleDescargar = async () => {
    if (!cotizacion) return;
    setDescargando(true);
    try {
      await exportarElementoPdf("cotizacion-print", nombreArchivo(cotizacion));
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo generar el PDF");
    } finally {
      setDescargando(false);
    }
  };

  const irAGuardadas = () => {
    if (tab === "crear" && !confirmarSalidaSinGuardar()) return;
    setTab("guardadas");
  };

  const handleCargar = (c: Cotizacion) => {
    if (tab === "crear" && !confirmarSalidaSinGuardar()) return;
    setCotizacion(c);
    setDirty(false);
    setZoom(1);
    setTab("crear");
  };

  const handleNueva = () => {
    if (tab === "crear" && !confirmarSalidaSinGuardar()) return;
    const nueva = nuevaCotizacion();
    setCotizacion(nueva);
    setDirty(false);
    setZoom(1);
    obtenerProximoNumero(nueva.fecha, (numero) => setCotizacion((p) => (p && !p.id ? { ...p, numero } : p)));
    setTab("crear");
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
        <div>
          <h1 className="text-xl font-black text-white">🧾 Cotizaciones</h1>
          <p className="text-xs text-zinc-500 mt-1">Crea, previsualiza, guarda y descarga cotizaciones formales</p>
        </div>
        <div className="flex gap-2">
          <button onClick={irAGuardadas} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${tab === "guardadas" ? "bg-red-950/30 text-red-400 border-red-900/50" : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"}`}>
            📋 Guardadas ({cotizaciones.length})
          </button>
          <button onClick={handleNueva} className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all active:scale-95">
            + Nueva Cotización
          </button>
        </div>
      </div>

      {tab === "guardadas" || !cotizacion ? (
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5">
          {cotizaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-500">
              <span className="text-5xl">🧾</span>
              <p className="text-sm font-medium">Aún no hay cotizaciones guardadas</p>
              <button onClick={handleNueva} className="mt-2 text-sm font-bold text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4">Crear la primera</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cotizaciones.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/60 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-lg font-black text-white">N° {c.numero}</p>
                      <p className="text-sm text-zinc-300 truncate">{c.cliente}</p>
                    </div>
                    <button onClick={() => archivar(c.id)} className="w-7 h-7 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 flex items-center justify-center shrink-0" title="Archivar">🗄️</button>
                  </div>
                  <p className="text-xs text-zinc-500">{c.fecha ? c.fecha.split("-").reverse().join("/") : ""} · {c.items.length} ítem{c.items.length === 1 ? "" : "s"}</p>
                  <button onClick={() => handleCargar(c)} className="mt-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-all">Ver / Editar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="flex flex-col gap-5">
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <p className={labelCls}>Datos del Cliente</p>
                <span className="text-sm font-black text-red-400">N° {cotizacion.numero || "..."}</span>
              </div>

              <div className="flex flex-col gap-2">
                <p className={sectionLabelCls}>Destinatario</p>
                <div className="grid grid-cols-[130px_1fr] gap-2">
                  <select value={cotizacion.tipoDestinatario || "empresa"} onChange={(e) => setF("tipoDestinatario", e.target.value)} className={fieldCls}>
                    <option value="empresa">Empresa</option>
                    <option value="persona">Persona</option>
                  </select>
                  <input value={cotizacion.cliente} onChange={(e) => setF("cliente", e.target.value)} placeholder={cotizacion.tipoDestinatario === "persona" ? "Nombre completo" : "Nombre de la empresa"} className={fieldCls} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className={sectionLabelCls}>Documento (opcional)</p>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <select
                    value={tipoDocumento}
                    onChange={(e) => mut((p) => ({ ...p, tipoDocumento: e.target.value as "ruc" | "dni", ruc: "" }))}
                    className={fieldCls}
                  >
                    <option value="ruc">RUC</option>
                    <option value="dni">DNI</option>
                  </select>
                  <input
                    value={cotizacion.ruc}
                    onChange={(e) => setF("ruc", e.target.value.replace(/\D/g, "").slice(0, largoEsperado))}
                    placeholder={`${largoEsperado} dígitos`}
                    inputMode="numeric"
                    className={`${fieldCls} ${cotizacion.ruc && !documentoValido ? "border-amber-600" : ""}`}
                  />
                </div>
                {cotizacion.ruc && !documentoValido && <p className="text-[11px] font-bold text-amber-500">⚠️ El {tipoDocumento === "dni" ? "DNI" : "RUC"} debe tener {largoEsperado} dígitos</p>}
              </div>

              <div className="flex flex-col gap-2">
                <p className={sectionLabelCls}>Fecha de emisión</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Día</label>
                    <input type="number" min={1} max={31} value={diaFecha ? parseInt(diaFecha) : ""} onChange={(e) => setDia(String(Math.min(31, Math.max(1, parseInt(e.target.value) || 1))))} className={fieldCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Mes</label>
                    <select value={mesFecha ? String(parseInt(mesFecha)) : ""} onChange={(e) => setMes(e.target.value)} className={fieldCls}>
                      {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Año</label>
                    <input value={anioActual()} disabled className={`${fieldCls} bg-zinc-900 text-zinc-500 cursor-not-allowed`} />
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-800/60" />

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className={labelCls}>Dirección</label>
                  <input value={cotizacion.direccion} onChange={(e) => setF("direccion", e.target.value)} placeholder="Dirección (opcional)" className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Sede</label>
                  <input value={cotizacion.sede || ""} onChange={(e) => setF("sede", e.target.value)} placeholder="Opcional" className={fieldCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Guía</label>
                  <input value={cotizacion.guia || ""} onChange={(e) => setF("guia", e.target.value)} placeholder="Opcional" className={fieldCls} />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className={labelCls}>Atención</label>
                  <input value={cotizacion.atencion} onChange={(e) => setF("atencion", e.target.value)} placeholder="Opcional" className={fieldCls} />
                </div>
              </div>

              <div className="h-px bg-zinc-800/60" />

              <div className="flex flex-col gap-2">
                <p className={sectionLabelCls}>Condiciones comerciales</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Forma de pago</label>
                    <select value={cotizacion.formaPago || "contado"} onChange={(e) => setF("formaPago", e.target.value)} className={fieldCls}>
                      <option value="contado">Contado</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Días de crédito</label>
                    {esCredito ? (
                      <input
                        type="number"
                        min={1}
                        value={cotizacion.diasCredito || ""}
                        onChange={(e) => setF("diasCredito", e.target.value.replace(/\D/g, ""))}
                        placeholder="30"
                        className={fieldCls}
                      />
                    ) : (
                      <div className={`${fieldCls} bg-zinc-900/50 text-zinc-600 text-center cursor-not-allowed`}>—</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <label className={labelCls}>Observaciones (mes, opcional)</label>
                  <select value={cotizacion.observacionesMes || ""} onChange={(e) => setF("observacionesMes", e.target.value)} className={fieldCls}>
                    <option value="">Sin observaciones</option>
                    {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 flex flex-col gap-4">
              <p className={labelCls}>Ítems (desde Inventario)</p>
              <div className="relative">
                <input value={buscarItem} onChange={(e) => setBuscarItem(e.target.value)} placeholder="Buscar por código o nombre..." className={fieldCls} />
                {inventarioFiltrado.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto">
                    {inventarioFiltrado.map((inv) => (
                      <button key={inv.id} onClick={() => agregarItem(inv)} className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800 transition-colors flex items-center gap-3 border-b border-zinc-900 last:border-0">
                        <span className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-sm shrink-0">📦</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-zinc-200 truncate">{inv.nombre}</span>
                          <span className="block text-[11px] text-zinc-500 font-mono">{inv.codigo}</span>
                        </span>
                        <span className={`text-xs font-bold shrink-0 ${inv.precioTotal ? "text-zinc-400" : "text-amber-500"}`}>{inv.precioTotal ? `S/${inv.precioTotal.toFixed(2)}` : "Sin precio"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {cotizacion.items.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-6">Busca y agrega productos desde el Inventario</p>
                ) : (
                  cotizacion.items.map((it, i) => {
                    const sinPrecio = !it.precioUnit || it.precioUnit <= 0;
                    const subtotalItem = (it.cantidad || 0) * (it.precioUnit || 0);
                    return (
                      <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 overflow-hidden">
                        <div className="flex items-start justify-between gap-3 px-4 py-3 bg-zinc-900/40 border-b border-zinc-800/40">
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono text-zinc-500">{it.codigo}</p>
                            <p className="text-sm font-bold text-zinc-100 truncate">{it.descripcion}</p>
                          </div>
                          <button onClick={() => quitarItem(i)} className="w-7 h-7 shrink-0 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 flex items-center justify-center transition-colors" title="Quitar ítem">✕</button>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Detalle adicional (opcional)</label>
                            <input value={it.detalle} onChange={(e) => actualizarItem(i, { detalle: e.target.value })} placeholder="Ej: incluye soporte de pared" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-600" />
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>U.M.</label>
                              <select value={it.um} onChange={(e) => actualizarItem(i, { um: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-600">
                                {UNIDADES_MEDIDA.map((u) => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>Cantidad</label>
                              <input type="number" min={1} value={it.cantidad} onChange={(e) => actualizarItem(i, { cantidad: parseInt(e.target.value) || 0 })} className={`bg-zinc-950 border rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-600 ${!it.cantidad || it.cantidad < 1 ? "border-amber-600" : "border-zinc-800"}`} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>P. Unit.</label>
                              <input type="number" min={0} step="0.01" value={it.precioUnit} onChange={(e) => actualizarItem(i, { precioUnit: parseFloat(e.target.value) || 0 })} className={`bg-zinc-950 border rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-600 ${sinPrecio ? "border-amber-600" : "border-zinc-800"}`} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>Subtotal</label>
                              <div className="px-2 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-emerald-400 text-right">S/{subtotalItem.toFixed(2)}</div>
                            </div>
                          </div>
                          {sinPrecio && (
                            <p className="text-[11px] font-bold text-amber-500">⚠️ Este producto no tiene precio en Inventario. Ingresa el precio unitario manualmente.</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {cotizacion.items.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                  <span className={labelCls}>Total estimado (incl. IGV)</span>
                  <span className="text-lg font-black text-white">S/{totalEstimado.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleGuardar} disabled={!puedeGuardar} className="flex-1 px-5 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-all">
                {saving ? "Guardando..." : "💾 Guardar Cotización"}
              </button>
              <button onClick={handleDescargar} disabled={descargando || cotizacion.items.length === 0} className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-200 disabled:opacity-50 transition-all">
                {descargando ? "Generando..." : "📥 Descargar PDF"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <p className={labelCls}>Previsualización</p>
              <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))} className="w-7 h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-bold flex items-center justify-center">−</button>
                <span className="text-xs font-bold text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))} className="w-7 h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-bold flex items-center justify-center">+</button>
                <button onClick={() => setZoom(1)} className="px-2 h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px] font-bold">Ajustar</button>
              </div>
            </div>
            <div ref={previewRef} className="bg-zinc-950 border border-zinc-800/60 rounded-2xl overflow-auto" style={{ height: `${A4_HEIGHT_PX * baseScale + 32}px`, maxHeight: "85vh" }}>
              <div style={{ width: A4_WIDTH_PX * baseScale * zoom, height: A4_HEIGHT_PX * baseScale * zoom, margin: "16px auto" }}>
                <div style={{ width: "210mm", transform: `scale(${baseScale * zoom})`, transformOrigin: "top left" }}>
                  <CotizacionTemplate cotizacion={cotizacion} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cotizacion && (
        <div id="cotizacion-print" className="absolute -left-2499.75 top-0">
          <CotizacionTemplate cotizacion={cotizacion} />
        </div>
      )}
    </div>
  );
}