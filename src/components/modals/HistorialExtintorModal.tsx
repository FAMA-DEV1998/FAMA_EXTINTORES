import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import type { Extintor, Servicio, TrasladoSede } from "../../types";
import { MESES } from "../../constants";
import { agruparCambios, anioFromFecha, diffSnapshots, estadoColor, mesFromFecha, serviciosDelExtintor } from "../../utils/helpers";

type Props = {
  isOpen: boolean;
  extintor: Extintor | null;
  servicios: Servicio[];
  traslados: TrasladoSede[];
  sedeNameById: Record<string, string>;
  rutaBase: string;
  onClose: () => void;
};

type Evento =
  | { tipo: "servicio"; fecha: string; servicio: Servicio; anterior: Partial<Extintor> | null }
  | { tipo: "traslado"; fecha: string; traslado: TrasladoSede };

export default function HistorialExtintorModal({ isOpen, extintor, servicios, traslados, sedeNameById, rutaBase, onClose }: Props) {
  const navigate = useNavigate();

  if (!isOpen || !extintor) return null;

  const eventosServicio = serviciosDelExtintor(servicios, extintor.uid);
  const eventosTraslado = [...traslados].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

  const eventos: Evento[] = [
    ...eventosServicio.map((s, idx) => ({
      tipo: "servicio" as const,
      fecha: s.fechaRetiro,
      servicio: s,
      anterior: idx > 0 ? (eventosServicio[idx - 1].extintorEstados?.[extintor.uid] || null) : null,
    })),
    ...eventosTraslado.map((t) => ({ tipo: "traslado" as const, fecha: t.fecha, traslado: t })),
  ].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

  const formatFecha = (f: string) => f ? f.split("-").reverse().join("/") : "—";
  const mesLabelDe = (fecha: string) => {
    const mesNum = mesFromFecha(fecha);
    const anio = anioFromFecha(fecha);
    const mes = MESES.find((m) => parseInt(m.value) === mesNum)?.label;
    return mes && anio ? `${mes} ${anio}` : "—";
  };

  const irAlServicio = (s: Servicio) => {
    const anio = anioFromFecha(s.fechaRetiro);
    const mesNum = mesFromFecha(s.fechaRetiro);
    const mesLabel = MESES.find((m) => parseInt(m.value) === mesNum)?.label.toLowerCase();
    if (anio === null || !mesLabel) return;
    onClose();
    navigate(`${rutaBase}/historial/${anio}/${mesLabel}/${s.id}`);
  };

  const sedeLabel = (id: string | null) => id ? (sedeNameById[id] || "—") : "Sin sede";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">📜 Historial · {extintor.nSerie || "S/N"}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{eventos.length} evento{eventos.length === 1 ? "" : "s"} · orden cronológico</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300">✕</button>
        </div>

        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {eventos.length === 0 ? (
            <p className="text-sm text-zinc-500 px-2 py-6 text-center">Este extintor todavía no tiene eventos registrados en Historial.</p>
          ) : (
            <ol className="relative border-l-2 border-zinc-800 ml-3 flex flex-col gap-6">
              {eventos.map((ev, i) => {
                if (ev.tipo === "traslado") {
                  const t = ev.traslado;
                  return (
                    <li key={`t-${t.id}`} className="ml-5 relative">
                      <span className="absolute -left-6.75 top-1 w-4 h-4 rounded-full bg-amber-500 border-4 border-zinc-900 shadow-[0_0_0_2px_rgba(245,158,11,0.3)]" />
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-lg bg-amber-950/40 border border-amber-900/50 text-amber-400 text-xs font-black uppercase tracking-wider">
                          {mesLabelDe(t.fecha)}
                        </span>
                        <span className="text-[11px] font-bold text-zinc-500">Traslado · {formatFecha(t.fecha)}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800">
                        <p className="text-sm font-bold text-zinc-200">
                          🔀 {sedeLabel(t.sedeOrigenId)} → {sedeLabel(t.sedeDestinoId)}
                        </p>
                        {t.motivo && <p className="text-xs text-zinc-500 italic mt-1.5">{t.motivo}</p>}
                      </div>
                    </li>
                  );
                }

                const s = ev.servicio;
                const snap = s.extintorEstados?.[extintor.uid] || {};
                const grupos = agruparCambios(diffSnapshots(ev.anterior, snap));
                return (
                  <li key={s.id} className="ml-5 relative">
                    <span className="absolute -left-6.75 top-1 w-4 h-4 rounded-full bg-red-600 border-4 border-zinc-900 shadow-[0_0_0_2px_rgba(220,38,38,0.3)]" />

                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-black uppercase tracking-wider">
                        {mesLabelDe(s.fechaRetiro)}
                      </span>
                      {Object.keys(sedeNameById).length > 0 && (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${s.sedeId ? "bg-zinc-800/60 border-zinc-700 text-zinc-400" : "bg-sky-950/40 border-sky-900/50 text-sky-400"}`}>
                          {s.sedeId ? `🏬 ${sedeLabel(s.sedeId)}` : "📁 Antes de tener sedes"}
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-zinc-500">
                        Retiro {formatFecha(s.fechaRetiro)} → Entrega {formatFecha(s.fechaEntrega)}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800 hover:border-red-700/60 transition-all">
                      <button onClick={() => irAlServicio(s)} className="w-full text-left flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-2">
                          {snap?.estadoExtintor && (
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${estadoColor[snap.estadoExtintor as string] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                              {snap.estadoExtintor}
                            </span>
                          )}
                          {s.notas && <p className="text-xs text-zinc-500 italic truncate max-w-60">{s.notas}</p>}
                        </div>
                        <span className="text-zinc-500 text-xs font-bold shrink-0 group-hover:text-red-400 transition-colors">Ir al servicio →</span>
                      </button>

                      {grupos.length > 0 && (
                        <div className="mt-3.5 pt-3.5 border-t border-zinc-800/60 flex flex-col gap-3">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            {i === 0 ? "Datos registrados en este servicio" : "Qué cambió respecto al servicio anterior"}
                          </span>
                          {grupos.map((g) => (
                            <div key={g.grupo} className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                {g.grupo}
                              </span>
                              <div className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-4 gap-y-1.5 pl-2.5">
                                {g.items.map((c) => (
                                  <Fragment key={c.campo}>
                                    <span className="text-xs font-bold text-zinc-300 self-center">{c.campo}</span>
                                    <span className="text-xs">
                                      {ev.anterior === null ? (
                                        <span className="text-zinc-400">{c.nuevo}</span>
                                      ) : (
                                        <span className="flex items-center gap-1.5 flex-wrap">
                                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 line-through text-zinc-600">{c.anterior}</span>
                                          <span className="text-red-500">→</span>
                                          <span className="px-1.5 py-0.5 rounded bg-red-950/30 font-bold text-zinc-100 border border-red-900/30">{c.nuevo}</span>
                                        </span>
                                      )}
                                    </span>
                                  </Fragment>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end shrink-0 bg-zinc-900/50">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Cerrar</button>
        </div>
      </div>
    </div>
  );
}