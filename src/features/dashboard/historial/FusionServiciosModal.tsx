import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Clock, Combine, FileText, LoaderCircle, RotateCcw, Star, Trash2, TriangleAlert, X } from "lucide-react";
import { confirmar } from "../../../components/ui/Notificaciones";
import { useFusionServicios } from "./useFusionServicios";
import { estadoColor } from "../../../utils/estadosExtintor";
import { ordinalServicio } from "../../../utils/historial";
import { mesAnioLabel } from "../../../utils/fechas";
import type { Servicio } from "../../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  socket: Socket | null;
  empresaId: string | undefined;
  sedeId: string | null;
  servicios: Servicio[];
  seleccionInicial?: string[];
}

const PASOS = ["Servicios", "Cambios", "Confirmar"];

const mesClaveDe = (fecha: string) => (fecha || "").slice(0, 7) || "sin-fecha";
const formatFecha = (f?: string) => (f ? f.split("-").reverse().join("/") : "—");

export default function FusionServiciosModal({ isOpen, onClose, socket, empresaId, sedeId, servicios, seleccionInicial }: Props) {
  const { preview, cargandoPreview, cargarPreview, limpiarPreview, ejecutando, ejecutar, revertir, historial } = useFusionServicios(socket, empresaId);

  const [paso, setPaso] = useState(0);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [destinoId, setDestinoId] = useState("");
  const [elecciones, setElecciones] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<{ logId: string } | null>(null);
  const [error, setError] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const ordenados = useMemo(
    () => [...servicios].sort((a, b) => (b.fechaRetiro || "").localeCompare(a.fechaRetiro || "") || (b.secuencia ?? 0) - (a.secuencia ?? 0)),
    [servicios],
  );

  const etiquetas = useMemo(() => {
    const mapa: Record<string, string> = {};
    const porMes = new Map<string, Servicio[]>();
    servicios.forEach((s) => {
      const clave = mesClaveDe(s.fechaRetiro);
      if (!porMes.has(clave)) porMes.set(clave, []);
      porMes.get(clave)!.push(s);
    });
    porMes.forEach((lista) => {
      lista.sort((a, b) => (a.secuencia ?? 0) - (b.secuencia ?? 0)).forEach((s, i) => {
        mapa[s.id] = `${ordinalServicio(i + 1)} servicio · ${mesAnioLabel(s.fechaRetiro)}`;
      });
    });
    return mapa;
  }, [servicios]);

  const etiquetaDe = (id: string, fecha?: string) => etiquetas[id] || `Servicio · ${mesAnioLabel(fecha || "")}`;

  useEffect(() => {
    if (!isOpen) return;
    const inicial = (seleccionInicial || []).filter((id) => servicios.some((s) => s.id === id));
    setPaso(0);
    setSeleccion(inicial);
    setDestinoId(inicial.length ? [...inicial].sort((a, b) => {
      const sa = servicios.find((s) => s.id === a)!;
      const sb = servicios.find((s) => s.id === b)!;
      return (sa.fechaRetiro || "").localeCompare(sb.fechaRetiro || "") || (sa.secuencia ?? 0) - (sb.secuencia ?? 0);
    })[0] : "");
    setElecciones({});
    setResultado(null);
    setError("");
    setMostrarHistorial(false);
    limpiarPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const historialDelAmbito = historial.filter((log: any) => (log.sedeId || null) === (sedeId || null));

  const elegirDestino = (id: string) => {
    setDestinoId(id);
    limpiarPreview();
  };

  const toggleServicio = (id: string) => {
    const next = seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id];
    setSeleccion(next);
    if (!next.includes(destinoId)) setDestinoId(next[0] || "");
    limpiarPreview();
  };

  const revisarCambios = () => {
    if (seleccion.length < 2) { setError("Selecciona al menos dos servicios"); return; }
    if (!destinoId) { setError("Elige el servicio que se conservará"); return; }
    setError("");
    setElecciones({});
    cargarPreview(destinoId, seleccion, (ok, err) => {
      if (ok) setPaso(1);
      else setError(err || "No se pudo cargar la vista previa");
    });
  };

  const eleccionEfectiva = (ext: any): string | null => elecciones[ext.uid] || ext.servicioEstadoElegido;

  const handleConfirmar = () => {
    if (!preview) return;
    const eleccionesPayload: Record<string, string> = {};
    preview.extintores.forEach((ext: any) => {
      const id = eleccionEfectiva(ext);
      if (id) eleccionesPayload[ext.uid] = id;
    });
    ejecutar({ servicioDestinoId: destinoId, servicioIds: seleccion, elecciones: eleccionesPayload }, (ok, logId, err) => {
      if (ok) setResultado({ logId: logId || "" });
      else setError(err || "No se pudo unificar los servicios");
    });
  };

  const textoEstado = (estado: any) => {
    if (!estado) return "Sin datos registrados";
    const partes = [estado.ma && `MA: ${estado.ma}`, estado.ph && `PH: ${estado.ph}`, estado.recarga && `Recarga: ${estado.recarga}`].filter(Boolean);
    return partes.join(" · ") || "Sin trabajos marcados";
  };

  const certificados = preview?.certificados;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Combine className="w-5 h-5 text-red-500" />Unificar Servicios</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Junta varios servicios de esta empresa en uno solo, conservando extintores, estados y evidencias</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMostrarHistorial((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300">
              {mostrarHistorial ? <ArrowLeft className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {mostrarHistorial ? "Volver" : "Unificaciones anteriores"}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300" aria-label="Cerrar"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {mostrarHistorial ? (
          <div className="flex-1 overflow-y-auto p-6">
            {historialDelAmbito.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-10">Todavía no se ha unificado ningún servicio aquí.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {historialDelAmbito.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between gap-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-200 truncate">
                        {(log.resumen?.fechasOrigen?.length || 0) + 1} servicios unificados en {mesAnioLabel(log.resumen?.fechaDestino || "")} ({formatFecha(log.resumen?.fechaDestino)})
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Unificados: {(log.resumen?.fechasOrigen || []).map(formatFecha).join(", ") || "—"} · {log.resumen?.extintores ?? 0} extintores
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{new Date(log.createdAt).toLocaleString("es-PE")}{log.revertidoEn ? " · Revertida" : ""}</p>
                    </div>
                    {!log.revertidoEn && (
                      <button
                        onClick={async () => {
                          const ok = await confirmar({ titulo: "¿Revertir esta unificación?", mensaje: "Los servicios unificados volverán a aparecer por separado, tal como estaban antes.", textoConfirmar: "Revertir" });
                          if (ok) revertir(log.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-800/60 hover:bg-amber-700/60 text-xs font-bold text-amber-200 shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />Revertir
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : resultado ? (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-4 text-center">
            <CircleCheck className="w-14 h-14 text-emerald-500" />
            <p className="text-base font-bold text-zinc-100">Servicios unificados correctamente</p>
            <p className="text-sm text-zinc-400 max-w-md">{seleccion.length} servicios quedaron unificados en {preview ? etiquetaDe(preview.destino.id, preview.destino.fechaRetiro) : "el servicio conservado"}. Puedes deshacer esta acción si algo no quedó como esperabas.</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const ok = await confirmar({ titulo: "¿Deshacer la unificación recién realizada?", textoConfirmar: "Deshacer" });
                  if (ok) revertir(resultado.logId, (exito) => { if (exito) onClose(); });
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-800/60 hover:bg-amber-700/60 text-sm font-bold text-amber-200"
              >
                <RotateCcw className="w-4 h-4" />Deshacer unificación
              </button>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-200">Cerrar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-stretch justify-between px-6 pt-4 pb-2 shrink-0">
              {PASOS.map((titulo, i) => {
                const activo = paso === i;
                const completado = i < paso;
                const bloqueado = i > 0 && !preview;
                return (
                  <button
                    key={titulo}
                    disabled={bloqueado}
                    onClick={() => !bloqueado && setPaso(i)}
                    className="flex-1 flex flex-col items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${activo ? "bg-red-700 text-white shadow-md" : completado ? "bg-emerald-800/70 text-emerald-100" : "bg-zinc-800 text-zinc-500"}`}>
                      {completado ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`text-[9px] font-bold ${activo ? "text-zinc-200" : "text-zinc-600"}`}>{titulo}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {error && <p className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-2.5"><TriangleAlert className="w-4 h-4 shrink-0" />{error}</p>}

              {paso === 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-zinc-500">Marca los servicios que corresponden a un mismo trabajo y elige con <Star className="w-3 h-3 inline -mt-0.5" /> cuál se conserva. El servicio conservado mantiene su fecha; los demás se integran en él y desaparecen del historial.</p>
                  {ordenados.length < 2 ? (
                    <p className="text-sm text-zinc-500 py-6 text-center">Se necesitan al menos dos servicios registrados para unificar.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto pr-1">
                      {ordenados.map((s) => {
                        const seleccionado = seleccion.includes(s.id);
                        const esDestino = seleccionado && destinoId === s.id;
                        return (
                          <div
                            key={s.id}
                            className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all ${esDestino ? "bg-emerald-950/20 border-emerald-700/60" : seleccionado ? "bg-zinc-900/60 border-red-700/60" : "bg-zinc-950/30 border-zinc-800/60"}`}
                          >
                            <label className="flex items-center justify-between gap-2 cursor-pointer">
                              <span className="text-sm font-black text-white">{etiquetaDe(s.id, s.fechaRetiro)}</span>
                              <input type="checkbox" checked={seleccionado} onChange={() => toggleServicio(s.id)} className="accent-red-600 w-4 h-4" />
                            </label>
                            <p className="text-xs font-bold text-zinc-400">{s.extintorUids.length} extintor{s.extintorUids.length === 1 ? "" : "es"} · Retiro {formatFecha(s.fechaRetiro)} · Entrega {formatFecha(s.fechaEntrega)}</p>
                            {s.notas && <p className="text-xs text-zinc-500 italic truncate">{s.notas}</p>}
                            {seleccionado && (
                              <button
                                onClick={() => elegirDestino(s.id)}
                                className={`self-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black ${esDestino ? "bg-emerald-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"}`}
                              >
                                <Star className="w-3.5 h-3.5" />{esDestino ? "Se conserva" : "Conservar este"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {paso === 1 && preview && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 p-4 rounded-2xl border bg-emerald-950/20 border-emerald-800/50">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1"><Star className="w-3 h-3" />Se conserva</p>
                      <p className="text-sm font-black text-white">{etiquetaDe(preview.destino.id, preview.destino.fechaRetiro)}</p>
                      <p className="text-xs text-zinc-400">Retiro {formatFecha(preview.destino.fechaRetiro)} · Entrega {formatFecha(preview.destino.fechaEntrega)}</p>
                      <p className="text-xs text-zinc-400">{preview.destino.cantidadExtintores} → <span className="font-bold text-emerald-300">{preview.resultado.cantidadExtintores} extintores</span>{preview.resultado.extintoresNuevos > 0 ? ` (+${preview.resultado.extintoresNuevos})` : ""}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 p-4 rounded-2xl border bg-red-950/20 border-red-900/40">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1"><Trash2 className="w-3 h-3" />Se integran y salen del historial</p>
                      {preview.origenes.map((o: any) => (
                        <p key={o.id} className="text-xs text-zinc-300"><span className="font-bold">{etiquetaDe(o.id, o.fechaRetiro)}</span> · {o.cantidadExtintores} extintor{o.cantidadExtintores === 1 ? "" : "es"} · Retiro {formatFecha(o.fechaRetiro)}</p>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-zinc-400 bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-4">
                    <p><span className="text-zinc-200 font-bold">Notas resultantes:</span> {preview.resultado.notas || "—"}</p>
                    <p className="flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0 mt-px" />
                      <span>
                        {certificados?.destino
                          ? "El servicio conservado mantiene su certificado."
                          : certificados?.mover
                            ? `El certificado de ${etiquetaDe(certificados.mover.servicioId)} pasará al servicio conservado.`
                            : "Ninguno de los servicios tiene certificado generado."}
                        {certificados?.sinMover?.length > 0 && ` ${certificados.sinMover.length} certificado${certificados.sinMover.length === 1 ? "" : "s"} adicional${certificados.sinMover.length === 1 ? "" : "es"} quedará${certificados.sinMover.length === 1 ? "" : "n"} guardado${certificados.sinMover.length === 1 ? "" : "s"} en Certificados sin servicio asociado.`}
                      </span>
                    </p>
                  </div>

                  {preview.resultado.conflictos > 0 && (
                    <p className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-xl px-4 py-2.5">
                      <TriangleAlert className="w-4 h-4 shrink-0" />{preview.resultado.conflictos} extintor{preview.resultado.conflictos === 1 ? " tiene" : "es tienen"} datos distintos entre servicios. Elige cuáles se conservan; las evidencias de todos se mantienen.
                    </p>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-zinc-800/60">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-900/60 border-b border-zinc-800/60 text-left">
                          <th className="px-3 py-2.5 font-black text-zinc-500 uppercase text-[10px]">Extintor</th>
                          <th className="px-3 py-2.5 font-black text-zinc-500 uppercase text-[10px]">Presente en</th>
                          <th className="px-3 py-2.5 font-black text-zinc-500 uppercase text-[10px]">Datos que quedarán</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.extintores.map((ext: any) => {
                          const elegido = eleccionEfectiva(ext);
                          const opcion = ext.opciones.find((o: any) => o.servicioId === elegido);
                          const totalEvidencias = ext.opciones.reduce((acc: number, o: any) => acc + o.evidencias, 0);
                          return (
                            <tr key={ext.uid} className={`border-b border-zinc-800/40 last:border-0 align-top ${ext.conflicto ? "bg-amber-950/10" : ""}`}>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <p className="font-bold text-zinc-200">{ext.nSerie || "—"} {ext.nuevoEnDestino && <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-950/50 border border-emerald-900/50 text-[9px] font-bold text-emerald-300">Se agrega</span>}</p>
                                <p className="text-zinc-500">{ext.nInterno || "—"} · {ext.marca || "—"} · {ext.agenteExtintor || "—"}{ext.peso ? ` · ${ext.peso} ${ext.unidadPeso}` : ""}</p>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {ext.servicioIds.map((id: string) => (
                                    <span key={id} className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${id === preview.destino.id ? "bg-emerald-950/40 text-emerald-300" : "bg-zinc-800 text-zinc-300"}`}>{etiquetaDe(id)}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                {ext.conflicto ? (
                                  <select
                                    value={elegido || ""}
                                    onChange={(e) => setElecciones((prev) => ({ ...prev, [ext.uid]: e.target.value }))}
                                    className="bg-zinc-950 border border-amber-800/60 rounded-lg px-2 py-1.5 text-xs text-zinc-200 max-w-72"
                                  >
                                    {ext.opciones.map((o: any) => (
                                      <option key={o.servicioId} value={o.servicioId}>{etiquetaDe(o.servicioId)} — {o.estado.estadoExtintor || "Sin estado"}</option>
                                    ))}
                                  </select>
                                ) : null}
                                <div className={`flex flex-wrap items-center gap-1.5 ${ext.conflicto ? "mt-1.5" : ""}`}>
                                  {opcion?.estado?.estadoExtintor && (
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${estadoColor[opcion.estado.estadoExtintor] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>{opcion.estado.estadoExtintor}</span>
                                  )}
                                  <span className="text-zinc-400">{textoEstado(opcion?.estado)}</span>
                                  {totalEvidencias > 0 && <span className="text-zinc-500">· {totalEvidencias} evidencia{totalEvidencias === 1 ? "" : "s"}</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {preview.extintores.length === 0 && (
                          <tr><td colSpan={3} className="px-3 py-6 text-center text-zinc-500">Ninguno de los servicios tiene extintores asociados.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {paso === 2 && preview && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-bold text-zinc-200">Resumen de la unificación</p>
                  <div className="flex flex-col gap-1.5 text-xs text-zinc-400 bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-4">
                    <p>{preview.origenes.length} servicio{preview.origenes.length === 1 ? "" : "s"} se integrará{preview.origenes.length === 1 ? "" : "n"} en <span className="text-zinc-200 font-bold">{etiquetaDe(preview.destino.id, preview.destino.fechaRetiro)}</span>, que conserva su fecha de retiro ({formatFecha(preview.destino.fechaRetiro)}) y entrega ({formatFecha(preview.destino.fechaEntrega)}).</p>
                    <p>El servicio quedará con {preview.resultado.cantidadExtintores} extintor{preview.resultado.cantidadExtintores === 1 ? "" : "es"}{preview.resultado.extintoresNuevos > 0 ? `, ${preview.resultado.extintoresNuevos} de ellos agregados desde los otros servicios` : ""}.</p>
                    {preview.resultado.conflictos > 0 && <p>{preview.resultado.conflictos} extintor{preview.resultado.conflictos === 1 ? "" : "es"} con datos distintos usará{preview.resultado.conflictos === 1 ? "" : "n"} la versión elegida en el paso anterior.</p>}
                    <p>Las evidencias fotográficas de todos los servicios se conservan.</p>
                    <p>El estado actual de los extintores se recalculará a partir del historial resultante.</p>
                  </div>
                  <p className="text-[11px] text-amber-400 font-bold">Esta acción puede revertirse después desde "Unificaciones anteriores" si algo no queda correcto.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 flex justify-between gap-2 shrink-0">
              <button
                onClick={() => (paso === 0 ? onClose() : setPaso(paso - 1))}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-300"
              >
                {paso !== 0 && <ArrowLeft className="w-4 h-4" />}
                {paso === 0 ? "Cancelar" : "Atrás"}
              </button>
              {paso === 0 ? (
                <button onClick={revisarCambios} disabled={cargandoPreview || seleccion.length < 2} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50">
                  {cargandoPreview && <LoaderCircle className="w-4 h-4 animate-spin" />}
                  {cargandoPreview ? "Calculando..." : `Revisar cambios${seleccion.length >= 2 ? ` (${seleccion.length})` : ""}`}
                  {!cargandoPreview && <ArrowRight className="w-4 h-4" />}
                </button>
              ) : paso === 2 ? (
                <button onClick={handleConfirmar} disabled={ejecutando} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50">
                  {ejecutando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <CircleCheck className="w-4 h-4" />}
                  {ejecutando ? "Unificando..." : "Confirmar unificación"}
                </button>
              ) : (
                <button onClick={() => setPaso(paso + 1)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white">
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
