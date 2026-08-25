import { useState } from "react";
import type { Socket } from "socket.io-client";
import type { Extintor, Servicio } from "../../types";
import { useServicios } from "../../hooks/dashboard";
import { agruparCambios, diffSnapshots, estadoColor, serviciosDelExtintor } from "../../utils/helpers";

interface HistorialViewProps {
  socket: Socket | null;
  activeId: string;
  activeSedeId: string | null;
  extintores: Extintor[];
}

export default function HistorialView({ socket, activeId, activeSedeId, extintores }: HistorialViewProps) {
  const { servicios, saveServicio, savingServicio } = useServicios(socket, activeId, activeSedeId);

  const [creando, setCreando] = useState(false);
  const [fechaRetiro, setFechaRetiro] = useState(() => new Date().toISOString().slice(0, 10));
  const [fechaEntrega, setFechaEntrega] = useState(() => new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState("");
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [historialUid, setHistorialUid] = useState<string | null>(null);

  const toggle = (uid: string) => {
    setSeleccionados((p) => p.includes(uid) ? p.filter((u) => u !== uid) : [...p, uid]);
  };

  const handleGuardar = () => {
    if (seleccionados.length === 0) return;
    saveServicio({ fechaRetiro, fechaEntrega, extintorUids: seleccionados, notas: notas || undefined });
    setCreando(false);
    setSeleccionados([]);
    setNotas("");
  };

  const formatFecha = (f: string) => f ? f.split("-").reverse().join("/") : "—";

  const extintorHistorial = historialUid ? extintores.find((e) => e.uid === historialUid) : null;
  const eventosExtintor = extintorHistorial ? serviciosDelExtintor(servicios, extintorHistorial.uid) : [];

  return (
    <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-5 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-black text-zinc-800">📜 Historial de Servicios</h2>
        <button
          onClick={() => setCreando((v) => !v)}
          className="px-4 py-2.5 rounded-xl bg-red-700 text-white font-bold text-sm hover:bg-red-600 shadow-md active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span className="text-lg leading-none">+</span> Registrar Servicio
        </button>
      </div>

      {creando && (
        <div className="flex flex-col gap-4 p-4 bg-white border-2 border-red-200 rounded-2xl shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha Retiro</label>
              <input type="date" value={fechaRetiro} onChange={(e) => setFechaRetiro(e.target.value)} className="border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha Entrega</label>
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className="border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold" />
            </div>
          </div>

          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas (opcional)"
            className="border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none min-h-16"
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Extintores ({seleccionados.length} seleccionados)</span>
            <div className="border-2 border-zinc-200 rounded-xl divide-y divide-zinc-100 max-h-48 overflow-y-auto">
              {extintores.length === 0 && <p className="text-sm text-zinc-400 px-3 py-4 text-center">No hay extintores en este contexto</p>}
              {extintores.map((ext) => (
                <label key={ext.uid} className="flex items-center gap-3 px-3 py-2.5">
                  <input type="checkbox" checked={seleccionados.includes(ext.uid)} onChange={() => toggle(ext.uid)} className="accent-red-600 w-4 h-4" />
                  <span className="text-sm font-bold text-zinc-700">{ext.nSerie || "S/N"}</span>
                  <span className="text-xs text-zinc-400">{ext.marca || "—"}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setCreando(false)} className="px-4 py-2 rounded-xl border-2 border-zinc-200 text-sm font-bold text-zinc-500">Cancelar</button>
            <button onClick={handleGuardar} disabled={seleccionados.length === 0 || savingServicio} className="px-5 py-2 rounded-xl bg-red-700 text-white text-sm font-bold disabled:opacity-50">
              {savingServicio ? "Guardando..." : "Guardar Servicio"}
            </button>
          </div>
        </div>
      )}

      {servicios.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl">
          <span className="text-5xl opacity-80">📜</span>
          <p className="text-sm font-bold text-zinc-500">Sin servicios registrados</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {servicios.map((s: Servicio) => {
            const abierto = expandido === s.id;
            return (
              <div key={s.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandido(abierto ? null : s.id)} className="w-full flex items-center justify-between p-4 text-left">
                  <div>
                    <p className="text-sm font-bold text-zinc-800">{s.extintorUids.length} extintor{s.extintorUids.length === 1 ? "" : "es"}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Retiro {formatFecha(s.fechaRetiro)} · Entrega {formatFecha(s.fechaEntrega)}</p>
                  </div>
                  <span className="text-zinc-400">{abierto ? "▲" : "▼"}</span>
                </button>
                {abierto && (
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    {s.notas && <p className="text-xs text-zinc-500 italic">{s.notas}</p>}
                    {s.extintorUids.map((uid) => {
                      const ext = extintores.find((e) => e.uid === uid);
                      const snap = s.extintorEstados?.[uid];
                      return (
                        <div key={uid} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-50">
                          <span className="text-xs font-bold text-zinc-700">{ext?.nSerie || "Extintor eliminado"}</span>
                          <div className="flex items-center gap-2">
                            {snap?.estadoExtintor && (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${estadoColor[snap.estadoExtintor as string] || "bg-zinc-100 text-zinc-500 border-zinc-200"}`}>
                                {snap.estadoExtintor}
                              </span>
                            )}
                            {ext && (
                              <button onClick={() => setHistorialUid(uid)} className="text-[11px] font-bold text-red-600">Historial</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {extintorHistorial && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-800">📜 {extintorHistorial.nSerie || "S/N"}</h3>
              <button onClick={() => setHistorialUid(null)} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">✕</button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex flex-col gap-4">
              {eventosExtintor.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-6">Sin eventos registrados</p>
              ) : (
                eventosExtintor.map((s, idx) => {
                  const snap = s.extintorEstados?.[extintorHistorial.uid] || {};
                  const anterior = idx > 0 ? (eventosExtintor[idx - 1].extintorEstados?.[extintorHistorial.uid] || null) : null;
                  const grupos = agruparCambios(diffSnapshots(anterior, snap));
                  return (
                    <div key={s.id} className="flex flex-col gap-2 pb-3 border-b border-zinc-100 last:border-0">
                      <span className="text-xs font-bold text-zinc-500">{formatFecha(s.fechaRetiro)} → {formatFecha(s.fechaEntrega)}</span>
                      {grupos.map((g) => (
                        <div key={g.grupo} className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-zinc-400 uppercase">{g.grupo}</span>
                          {g.items.map((c) => (
                            <div key={c.campo} className="flex items-center gap-1.5 text-xs">
                              <span className="font-bold text-zinc-600">{c.campo}:</span>
                              <span className="text-zinc-500">{idx === 0 ? c.nuevo : `${c.anterior} → ${c.nuevo}`}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}