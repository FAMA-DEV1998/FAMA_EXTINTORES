import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { CircleCheck, ClipboardCheck, ClipboardList, Download, LoaderCircle, Lock, LockOpen, Pencil, Plus, Search, SearchX, Trash2, TriangleAlert, X } from "lucide-react";
import type { CampanaInspeccion, DetalleInspeccion, ExtintorInspeccion, RegistroInspeccion } from "../../../types";
import { downloadBase64 } from "../../../utils/archivos";
import { confirmar } from "../../../components/ui/Notificaciones";
import CampanaInspeccionModal from "./CampanaInspeccionModal";
import { FOTOS_INSPECCION, ITEMS_INSPECCION, nombreExtintor, textoPeriodo } from "../../worker/inspecciones/constantesInspeccion";

type Filtro = "todos" | "pendientes" | "inspeccionados" | "no_encontrados" | "hallazgos";
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const hora = (iso: string) => new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const tieneHallazgo = (r?: RegistroInspeccion) => !!r && r.estado === "inspeccionado" && ((r.hallazgos?.length ?? 0) > 0 || !r.tarjetaCoincide);

function Estado({ r }: { r?: RegistroInspeccion }) {
  if (!r) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[11px] font-bold"><ClipboardList className="w-3 h-3" />No inspeccionado</span>;
  if (r.estado === "no_encontrado") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-bold"><SearchX className="w-3 h-3" />No encontrado</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-bold"><CircleCheck className="w-3 h-3" />Inspeccionado</span>;
}

function DetalleRegistro({ socket, extintor, registro, onClose }: { socket: Socket; extintor: ExtintorInspeccion; registro?: RegistroInspeccion; onClose: () => void }) {
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [ampliada, setAmpliada] = useState<string | null>(null);

  useEffect(() => {
    setFotos({});
    if (!registro) return;
    registro.fotos.forEach((tipo) => socket.emit("insp:foto:get", { registroId: registro.id, tipo }, (res: any) => {
      if (res?.success) setFotos((p) => ({ ...p, [tipo]: res.foto }));
    }));
  }, [socket, registro?.id, registro?.inspeccionadoEn]);

  const tipos = [...FOTOS_INSPECCION.map((f) => ({ tipo: f.tipo as string, etiqueta: f.etiqueta as string })), { tipo: "hallazgo", etiqueta: "Hallazgo" }].filter((f) => registro?.fotos.includes(f.tipo));

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-black text-white">{nombreExtintor(extintor)}</p>
          <p className="text-xs text-zinc-500">{[extintor.area, extintor.agenteExtintor, [extintor.peso, extintor.unidadPeso].filter(Boolean).join(" "), extintor.marca].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex items-center gap-2"><Estado r={registro} /><button onClick={onClose} className="text-zinc-500 hover:text-white" aria-label="Cerrar"><X className="w-4 h-4" /></button></div>
      </div>
      {registro?.estado === "inspeccionado" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ITEMS_INSPECCION.map((it) => {
              const v = (registro as any)[it.clave] as string;
              return (
                <div key={it.clave} className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-zinc-500">{it.etiqueta}</p>
                  <p className={`text-xs font-black ${v === "NECESITA CAMBIO" ? "text-red-400" : v === "NO APLICA" ? "text-zinc-400" : "text-emerald-400"}`}>{v || "—"}</p>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-zinc-300"><span className="text-zinc-500">Tarjeta:</span> {registro.tarjetaCoincide ? "coincide con el extintor" : <span className="text-red-400 font-bold">no coincide</span>}{registro.proxRecarga ? ` · próxima recarga ${registro.proxRecarga.split("-").reverse().join("/")}` : ""}</p>
        </>
      )}
      {(registro?.hallazgos?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1">
          {registro!.hallazgos!.map((h) => <p key={h.texto} className="text-sm text-amber-300"><TriangleAlert className="inline w-3.5 h-3.5 mr-1" />{h.texto}{h.recomendacion ? <span className="text-zinc-400"> → {h.recomendacion}</span> : null}</p>)}
        </div>
      )}
      {registro?.observacion && <p className="text-sm text-zinc-300"><span className="text-zinc-500">Observación:</span> {registro.observacion}</p>}
      {registro && <p className="text-xs text-zinc-500">{registro.usuarioNombre} · {hora(registro.inspeccionadoEn)}</p>}
      {tipos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {tipos.map((f) => (
            <button key={f.tipo} onClick={() => fotos[f.tipo] && setAmpliada(fotos[f.tipo])} className="flex flex-col gap-1 text-left">
              <div className="aspect-3/4 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center">
                {fotos[f.tipo] ? <img src={fotos[f.tipo]} alt={f.etiqueta} className="w-full h-full object-cover" /> : <LoaderCircle className="w-5 h-5 text-zinc-600 animate-spin" />}
              </div>
              <span className="text-[11px] font-bold text-zinc-500">{f.etiqueta}</span>
            </button>
          ))}
        </div>
      )}
      {registro && tieneHallazgo(registro) && (
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={registro.levantado} onChange={(e) => socket.emit("insp:campana:levantado", { registroId: registro.id, levantado: e.target.checked }, () => undefined)} className="w-4 h-4 accent-red-600" />
          Levantamiento efectuado
        </label>
      )}
      {ampliada && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6" onClick={() => setAmpliada(null)}>
          <img src={ampliada} alt="Foto" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

export default function InspeccionesPage({ socket }: { socket: Socket | null }) {
  const [campanas, setCampanas] = useState<CampanaInspeccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activaId, setActivaId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleInspeccion | null>(null);
  const [modal, setModal] = useState<{ campana: CampanaInspeccion | null } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [texto, setTexto] = useState("");
  const [elegido, setElegido] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargarLista = useCallback(() => {
    socket?.emit("insp:campana:list", {}, (res: any) => {
      setCargando(false);
      if (res?.success) setCampanas(res.lista || []);
    });
  }, [socket]);

  const cargarDetalle = useCallback(() => {
    if (!socket || !activaId) return;
    socket.emit("insp:detalle", { id: activaId }, (res: any) => {
      if (res?.success) setDetalle({ campana: res.campana, extintores: res.extintores || [], registros: res.registros || [] });
    });
  }, [socket, activaId]);

  useEffect(() => { cargarLista(); }, [cargarLista]);
  useEffect(() => {
    setDetalle(null);
    setElegido(null);
    cargarDetalle();
  }, [cargarDetalle]);

  useEffect(() => {
    if (!socket) return;
    const alCambiar = () => {
      if (espera.current) clearTimeout(espera.current);
      espera.current = setTimeout(() => { cargarLista(); cargarDetalle(); }, 400);
    };
    socket.on("insp:cambio", alCambiar);
    return () => { socket.off("insp:cambio", alCambiar); };
  }, [socket, cargarLista, cargarDetalle]);

  useEffect(() => {
    if (!activaId && campanas.length > 0) setActivaId((campanas.find((c) => c.estado === "abierta") || campanas[0]).id);
  }, [campanas, activaId]);

  const registroDe = useMemo(() => new Map((detalle?.registros || []).map((r) => [r.extintorUid, r])), [detalle]);
  const extintores = detalle?.extintores || [];
  const conteo = {
    total: extintores.length,
    inspeccionados: extintores.filter((e) => registroDe.get(e.uid)?.estado === "inspeccionado").length,
    noEncontrados: extintores.filter((e) => registroDe.get(e.uid)?.estado === "no_encontrado").length,
    hallazgos: extintores.filter((e) => tieneHallazgo(registroDe.get(e.uid))).length,
  };
  const pendientes = conteo.total - conteo.inspeccionados - conteo.noEncontrados;

  const lista = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return extintores.filter((e) => {
      const r = registroDe.get(e.uid);
      if (filtro === "pendientes" && r) return false;
      if (filtro === "inspeccionados" && r?.estado !== "inspeccionado") return false;
      if (filtro === "no_encontrados" && r?.estado !== "no_encontrado") return false;
      if (filtro === "hallazgos" && !tieneHallazgo(r)) return false;
      return !q || [e.nInterno, e.nSerie, e.area].some((v) => String(v || "").toLowerCase().includes(q));
    }).sort((a, b) => String(a.nInterno || a.nSerie).localeCompare(String(b.nInterno || b.nSerie), "es", { numeric: true }));
  }, [extintores, registroDe, filtro, texto]);

  const exportar = (formato: "registro" | "observaciones") => {
    if (!socket || !activaId) return;
    setExportando(formato);
    setError(null);
    socket.timeout(120000).emit("insp:campana:exportar", { id: activaId, formato }, (err: Error | null, res: any) => {
      setExportando(null);
      if (err || !res?.success) setError(res?.error || "No se pudo generar el Excel");
      else downloadBase64(res.data, res.fileName, MIME_XLSX);
    });
  };

  const cambiarEstado = (c: CampanaInspeccion) => socket?.emit("insp:campana:estado", { id: c.id, estado: c.estado === "abierta" ? "cerrada" : "abierta" }, (res: any) => {
    if (!res?.success) setError(res?.error || "No se pudo cambiar el estado");
  });

  const eliminar = async (c: CampanaInspeccion) => {
    const ok = await confirmar({ titulo: "¿Eliminar esta inspección?", mensaje: "Se borran también los registros y fotos de los técnicos. No se puede deshacer.", textoConfirmar: "Eliminar", peligro: true });
    if (!ok) return;
    socket?.emit("insp:campana:delete", { id: c.id }, () => { setActivaId(null); cargarLista(); });
  };

  const activa = detalle?.campana || campanas.find((c) => c.id === activaId) || null;
  const extElegido = extintores.find((e) => e.uid === elegido) || null;
  const pestanas: { id: Filtro; etiqueta: string; n: number }[] = [
    { id: "todos", etiqueta: "Todos", n: conteo.total },
    { id: "pendientes", etiqueta: "No inspeccionados", n: pendientes },
    { id: "inspeccionados", etiqueta: "Inspeccionados", n: conteo.inspeccionados },
    { id: "no_encontrados", etiqueta: "No encontrados", n: conteo.noEncontrados },
    { id: "hallazgos", etiqueta: "Con hallazgos", n: conteo.hallazgos },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-red-500" />Inspecciones</h2>
          <p className="text-sm text-zinc-500 mt-1">Habilita una inspección por empresa o sede y sigue el avance de los técnicos en tiempo real.</p>
        </div>
        <button onClick={() => setModal({ campana: null })} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold"><Plus className="w-4 h-4" />Habilitar inspección</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-5">
        <div className="flex flex-col gap-2 rounded-2xl bg-zinc-900/50 border border-zinc-800 p-3 lg:max-h-[80vh] overflow-y-auto">
          {cargando && <p className="text-xs text-zinc-500 p-3">Cargando…</p>}
          {!cargando && campanas.length === 0 && <p className="text-xs text-zinc-500 p-3">Aún no hay inspecciones. Usa «Habilitar inspección».</p>}
          {campanas.map((c) => {
            const hechos = c.inspeccionados + c.noEncontrados;
            return (
              <button key={c.id} onClick={() => setActivaId(c.id)} className={`text-left px-3 py-2.5 rounded-xl border flex flex-col gap-1.5 ${c.id === activaId ? "bg-red-950/30 border-red-900/50" : "border-transparent hover:bg-zinc-800/60"}`}>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-sm font-bold text-zinc-100 truncate">{c.empresaNombre}</p>
                  {c.estado === "cerrada" ? <Lock className="w-3.5 h-3.5 text-zinc-500" /> : <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                </div>
                <p className="text-[11px] text-zinc-500 truncate">{c.sedeNombre || "Toda la empresa"} · {textoPeriodo(c.periodo)}</p>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${c.total ? (hechos / c.total) * 100 : 0}%` }} /></div>
                <p className="text-[11px] text-zinc-500">{hechos}/{c.total} revisados</p>
              </button>
            );
          })}
        </div>

        {activa ? (
          <div className="flex flex-col gap-4 min-w-0">
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4 flex flex-col gap-4">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-black text-white truncate">{activa.empresaNombre}</p>
                  <p className="text-sm text-zinc-500">{activa.sedeNombre || "Toda la empresa"} · {textoPeriodo(activa.periodo)} · {activa.estado === "abierta" ? <span className="text-emerald-400 font-bold">Abierta para los técnicos</span> : <span className="text-zinc-400 font-bold">Cerrada</span>}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => exportar("registro")} disabled={!!exportando} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold disabled:opacity-50">
                    {exportando === "registro" ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Registro de inspección
                  </button>
                  <button onClick={() => exportar("observaciones")} disabled={!!exportando} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold disabled:opacity-50">
                    {exportando === "observaciones" ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Observación y levantamiento
                  </button>
                  <button onClick={() => setModal({ campana: activa })} className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center" title="Editar datos" aria-label="Editar datos"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => cambiarEstado(activa)} className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center" title={activa.estado === "abierta" ? "Cerrar inspección" : "Reabrir inspección"} aria-label={activa.estado === "abierta" ? "Cerrar inspección" : "Reabrir inspección"}>
                    {activa.estado === "abierta" ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                  </button>
                  <button onClick={() => eliminar(activa)} className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-red-900/60 text-zinc-300 flex items-center justify-center" title="Eliminar" aria-label="Eliminar inspección"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[["No inspeccionados", pendientes, "text-zinc-200"], ["Inspeccionados", conteo.inspeccionados, "text-emerald-400"], ["No encontrados", conteo.noEncontrados, "text-amber-400"], ["Con hallazgos", conteo.hallazgos, "text-red-400"]].map(([k, v, c]) => (
                  <div key={k as string} className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5">
                    <p className={`text-2xl font-black ${c}`}>{v as number}</p>
                    <p className="text-[11px] font-bold text-zinc-500">{k as string}</p>
                  </div>
                ))}
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${conteo.total ? (conteo.inspeccionados / conteo.total) * 100 : 0}%` }} />
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${conteo.total ? (conteo.noEncontrados / conteo.total) * 100 : 0}%` }} />
              </div>
              {error && <p className="text-sm font-bold text-red-400">{error}</p>}
            </div>

            {extElegido && <DetalleRegistro socket={socket!} extintor={extElegido} registro={registroDe.get(extElegido.uid)} onClose={() => setElegido(null)} />}

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex-1 min-w-48">
                <Search className="w-4 h-4 text-zinc-500" />
                <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="N° interno, serie o ubicación" className="flex-1 bg-transparent text-sm text-zinc-200 outline-none" />
              </div>
              {pestanas.map((p) => (
                <button key={p.id} onClick={() => setFiltro(p.id)} className={`px-3 py-2 rounded-xl text-xs font-bold ${filtro === p.id ? "bg-red-950/40 text-red-300 border border-red-900/50" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}>{p.etiqueta} ({p.n})</button>
              ))}
            </div>

            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_9rem_10rem_8rem] gap-3 px-4 py-2.5 text-[11px] font-black text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <span>Extintor</span><span>Ubicación</span><span>Estado</span><span>Técnico</span>
              </div>
              {!detalle && <p className="text-sm text-zinc-500 p-4">Cargando…</p>}
              {lista.map((e) => {
                const r = registroDe.get(e.uid);
                return (
                  <button key={e.uid} onClick={() => setElegido(e.uid)} className={`w-full grid grid-cols-1 md:grid-cols-[1fr_9rem_10rem_8rem] gap-1 md:gap-3 px-4 py-2.5 text-left text-sm border-b border-zinc-800/60 hover:bg-zinc-800/40 ${e.uid === elegido ? "bg-red-950/20" : ""}`}>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-zinc-200 font-bold">{nombreExtintor(e)}</span>
                      {tieneHallazgo(r) && <TriangleAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </span>
                    <span className="text-zinc-400 truncate">{e.area || "—"}</span>
                    <span><Estado r={r} /></span>
                    <span className="text-zinc-500 text-xs truncate">{r ? `${r.usuarioNombre} · ${hora(r.inspeccionadoEn)}` : ""}</span>
                  </button>
                );
              })}
              {detalle && lista.length === 0 && <p className="text-sm text-zinc-500 p-4">No hay extintores en esta lista.</p>}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-8 text-sm text-zinc-500">Elige o habilita una inspección.</div>
        )}
      </div>

      {modal && socket && (
        <CampanaInspeccionModal
          socket={socket}
          campana={modal.campana}
          onClose={() => setModal(null)}
          onGuardada={(id) => { setModal(null); setActivaId(id); cargarLista(); cargarDetalle(); }}
        />
      )}
    </div>
  );
}
