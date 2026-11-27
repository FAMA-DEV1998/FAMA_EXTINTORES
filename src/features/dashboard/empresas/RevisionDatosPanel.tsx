import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { ArrowRight, CalendarX2, ChevronDown, FileQuestion, ClipboardCheck, Copy, Download, EyeOff, GitMerge, LoaderCircle, MapPin, Tag, TriangleAlert, Upload } from "lucide-react";
import LimpiezaDatosModal, { type ModoLimpieza } from "./LimpiezaDatosModal";
import type { SedePorObservacion } from "./useResumenEmpresas";
import { usePreferenciaLocal } from "../../../hooks/usePreferenciaLocal";

export type ParDuplicado = { clave: string; a: { id: string; razonSocial: string }; b: { id: string; razonSocial: string }; motivo: string; sugerencia?: { origen: string; destino: string; sedeDestinoId: string | null } };

interface Props {
  socket: Socket | null;
  sinClasificar: number;
  filtrandoSinClasificar: boolean;
  onVerSinClasificar: () => void;
  pares: ParDuplicado[];
  onUnificar: (par: ParDuplicado) => void;
  onOcultarPar: (clave: string) => void;
  onImportar: () => void;
  sedesObservacion: SedePorObservacion[];
  nombreEmpresa: (id: string) => string;
  onReasignar: (items: SedePorObservacion[]) => Promise<void>;
}

export default function RevisionDatosPanel({ socket, sinClasificar, filtrandoSinClasificar, onVerSinClasificar, pares, onUnificar, onOcultarPar, onImportar, sedesObservacion, nombreEmpresa, onReasignar }: Props) {
  const [verObs, setVerObs] = useState(false);
  const [reasignando, setReasignando] = useState<string | null>(null);
  const reasignar = async (clave: string, items: SedePorObservacion[]) => { setReasignando(clave); await onReasignar(items); setReasignando(null); };
  const obsPorEmpresa = Array.from(sedesObservacion.reduce((m, x) => m.set(x.empresaId, [...(m.get(x.empresaId) || []), x]), new Map<string, SedePorObservacion[]>()));
  const [abierto, setAbierto] = usePreferenciaLocal("fama_revision_datos_abierto", true);
  const [verPares, setVerPares] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [limpieza, setLimpieza] = useState<ModoLimpieza | null>(null);
  const [conteos, setConteos] = useState<{ servicios: number | null; internos: number | null; sinServicio: number | null }>({ servicios: null, internos: null, sinServicio: null });
  const contar = useCallback(() => {
    if (!socket) return;
    socket.emit("datos:serviciosVacios", {}, (res: any) => { if (res?.success) setConteos((p) => ({ ...p, servicios: res.servicios.length })); });
    socket.emit("datos:internosSinCodigo", {}, (res: any) => { if (res?.success) setConteos((p) => ({ ...p, internos: res.extintores.length })); });
    socket.emit("datos:sinServicio", {}, (res: any) => { if (res?.success) setConteos((p) => ({ ...p, sinServicio: res.extintores.length })); });
  }, [socket]);
  useEffect(() => { contar(); }, [contar]);
  const pendientes = (sinClasificar > 0 ? 1 : 0) + (pares.length > 0 ? 1 : 0) + (sedesObservacion.length > 0 ? 1 : 0) + (conteos.servicios ? 1 : 0) + (conteos.internos ? 1 : 0) + (conteos.sinServicio ? 1 : 0);

  const exportar = () => {
    if (!socket) return;
    setExportando(true);
    socket.emit("datos:exportar", {}, (res: any) => {
      setExportando(false);
      if (!res?.success) { toast.error(res?.error || "No se pudo exportar"); return; }
      const url = URL.createObjectURL(new Blob([JSON.stringify(res.datos, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `fama-datos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <section className="mb-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/30">
      <button onClick={() => setAbierto(!abierto)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-xs font-black text-zinc-300 uppercase tracking-wider">
          <ClipboardCheck className="w-4 h-4 text-zinc-400" />Revisión de datos
          {pendientes > 0 && <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] normal-case tracking-normal">{pendientes} por revisar</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
              <p className="flex items-center gap-2 text-xs font-black text-zinc-200"><TriangleAlert className={`w-4 h-4 ${sinClasificar ? "text-amber-400" : "text-zinc-600"}`} />Sin clasificar</p>
              <p className="text-2xl font-black tabular-nums text-white leading-none">{sinClasificar}</p>
              <p className="text-[11px] text-zinc-500">Empresas sin tipo de cliente (Persona, RUC 10 o RUC 20).</p>
              {sinClasificar > 0 && (
                <button onClick={onVerSinClasificar} className={`self-start mt-auto px-3 py-1.5 rounded-lg text-[11px] font-black border ${filtrandoSinClasificar ? "bg-amber-500 border-amber-500 text-zinc-950" : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500"}`}>
                  {filtrandoSinClasificar ? "Mostrando solo estas" : "Ver solo estas"}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
              <p className="flex items-center gap-2 text-xs font-black text-zinc-200"><Copy className={`w-4 h-4 ${pares.length ? "text-amber-400" : "text-zinc-600"}`} />Duplicados y sedes</p>
              <p className="text-2xl font-black tabular-nums text-white leading-none">{pares.length}</p>
              <p className="text-[11px] text-zinc-500">Mismo RUC, nombre parecido, extintores con la misma serie o empresas que parecen sedes de otra.</p>
              {pares.length > 0 && (
                <button onClick={() => setVerPares(!verPares)} className="self-start mt-auto px-3 py-1.5 rounded-lg text-[11px] font-black border bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500">
                  {verPares ? "Ocultar lista" : "Revisar"}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
              <p className="flex items-center gap-2 text-xs font-black text-zinc-200"><MapPin className={`w-4 h-4 ${sedesObservacion.length ? "text-amber-400" : "text-zinc-600"}`} />Sede según observación</p>
              <p className="text-2xl font-black tabular-nums text-white leading-none">{sedesObservacion.length}</p>
              <p className="text-[11px] text-zinc-500">Extintores cuya observación menciona otra sede de la misma empresa.</p>
              {sedesObservacion.length > 0 && (
                <button onClick={() => setVerObs(!verObs)} className="self-start mt-auto px-3 py-1.5 rounded-lg text-[11px] font-black border bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500">
                  {verObs ? "Ocultar lista" : "Revisar"}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
              <p className="flex items-center gap-2 text-xs font-black text-zinc-200"><FileQuestion className={`w-4 h-4 ${conteos.sinServicio ? "text-amber-400" : "text-zinc-600"}`} />Extintores sin servicio</p>
              <p className="text-2xl font-black tabular-nums text-white leading-none">{conteos.sinServicio ?? "…"}</p>
              <p className="text-[11px] text-zinc-500">Registrados pero fuera de todo servicio (sin historial), para agregarlos al que corresponde.</p>
              {!!conteos.sinServicio && (
                <button onClick={() => setLimpieza("sinServicio")} className="self-start mt-auto px-3 py-1.5 rounded-lg text-[11px] font-black border bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500">
                  Revisar
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
              <p className="flex items-center gap-2 text-xs font-black text-zinc-200"><CalendarX2 className={`w-4 h-4 ${conteos.servicios ? "text-amber-400" : "text-zinc-600"}`} />Servicios vacíos</p>
              <p className="text-2xl font-black tabular-nums text-white leading-none">{conteos.servicios ?? "…"}</p>
              <p className="text-[11px] text-zinc-500">Servicios sin extintores ni certificado, para revisarlos y eliminarlos.</p>
              {!!conteos.servicios && (
                <button onClick={() => setLimpieza("servicios")} className="self-start mt-auto px-3 py-1.5 rounded-lg text-[11px] font-black border bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500">
                  Revisar
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
              <p className="flex items-center gap-2 text-xs font-black text-zinc-200"><Tag className={`w-4 h-4 ${conteos.internos ? "text-amber-400" : "text-zinc-600"}`} />N° interno sin código</p>
              <p className="text-2xl font-black tabular-nums text-white leading-none">{conteos.internos ?? "…"}</p>
              <p className="text-[11px] text-zinc-500">Extintores con interno «SN», «S/N» o vacío, para pasarlos a «S/TAG».</p>
              {!!conteos.internos && (
                <button onClick={() => setLimpieza("internos")} className="self-start mt-auto px-3 py-1.5 rounded-lg text-[11px] font-black border bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500">
                  Revisar
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
              <p className="flex items-center gap-2 text-xs font-black text-zinc-200"><Download className="w-4 h-4 text-zinc-400" />Exportar e importar</p>
              <p className="text-[11px] text-zinc-500">Descarga empresas, sedes y extintores en JSON para analizarlos, e importa un plan para unificar, crear sedes o reasignar extintores.</p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <button onClick={exportar} disabled={exportando} className="px-3 py-1.5 rounded-lg text-[11px] font-black border bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500 flex items-center gap-1.5 disabled:opacity-50">
                  {exportando ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}Exportar datos
                </button>
                <button onClick={onImportar} className="px-3 py-1.5 rounded-lg text-[11px] font-black border bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />Importar plan
                </button>
              </div>
            </div>
          </div>

          {verObs && obsPorEmpresa.length > 0 && (
            <div className="flex flex-col gap-3">
              {obsPorEmpresa.map(([empresaId, items]) => (
                <div key={empresaId} className="rounded-xl border border-amber-900/40 bg-amber-950/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-amber-900/30">
                    <p className="text-sm font-black text-zinc-100">{nombreEmpresa(empresaId)} <span className="text-[11px] font-bold text-zinc-500">{items.length} extintor{items.length === 1 ? "" : "es"}</span></p>
                    <button onClick={() => reasignar(empresaId, items)} disabled={!!reasignando} className="px-3 py-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-zinc-950 text-[11px] font-black flex items-center gap-1.5 disabled:opacity-50">
                      {reasignando === empresaId && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}Reasignar todos
                    </button>
                  </div>
                  <ul className="divide-y divide-zinc-800/50">
                    {items.map((x) => (
                      <li key={x.uid} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-2.5 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-zinc-200">{x.nSerie || "—"} <span className="text-zinc-500 font-medium">· {x.nInterno || "s/interno"}</span></p>
                          <p className="text-[11px] text-sky-300/90 italic truncate">«{x.observaciones}»</p>
                        </div>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold shrink-0"><span className="text-zinc-400">{x.sedeActual || "Sin sede"}</span><ArrowRight className="w-3 h-3 text-zinc-600" /><span className="text-amber-300">{x.sedeSugerida}</span></p>
                        <button onClick={() => reasignar(x.uid, [x])} disabled={!!reasignando} className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500 flex items-center gap-1 disabled:opacity-50">
                          {reasignando === x.uid && <LoaderCircle className="w-3 h-3 animate-spin" />}Reasignar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-[11px] text-zinc-500">Cada reasignación queda registrada como traslado de sede; el QR y los certificados no cambian.</p>
            </div>
          )}

          {verPares && pares.length > 0 && (
            <ul className="flex flex-col divide-y divide-zinc-800/60 rounded-xl border border-amber-900/40 bg-amber-950/10">
              {pares.map((p) => (
                <li key={p.clave} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-100 truncate">{p.sugerencia ? <>{p.sugerencia.origen === p.a.id ? p.a.razonSocial : p.b.razonSocial} <span className="text-zinc-500 font-medium">→</span> {p.sugerencia.destino === p.a.id ? p.a.razonSocial : p.b.razonSocial}</> : <>{p.a.razonSocial} <span className="text-zinc-500 font-medium">↔</span> {p.b.razonSocial}</>}</p>
                    <p className="text-[11px] text-amber-400/90">{p.motivo}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => onOcultarPar(p.clave)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center gap-1" title="No son la misma empresa"><EyeOff className="w-3.5 h-3.5" />No es duplicado</button>
                    <button onClick={() => onUnificar(p)} className="px-3 py-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-zinc-950 text-[11px] font-black flex items-center gap-1.5"><GitMerge className="w-3.5 h-3.5" />Unificar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <LimpiezaDatosModal modo={limpieza} socket={socket} onClose={() => setLimpieza(null)} onCambio={contar} />
    </section>
  );
}
