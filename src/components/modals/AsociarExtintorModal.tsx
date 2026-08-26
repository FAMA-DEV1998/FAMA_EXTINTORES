import { useState } from "react";
import { COMP_KEYS, COMP_LABELS } from "../../constants";
import type { Extintor } from "../../types";
import { estadoColor, serviceBadge, formatRealizadoPH, formatVencimPH } from "../../utils/helpers";

type Props = {
  isOpen: boolean;
  disponibles: Extintor[];
  onClose: () => void;
  onConfirm: (uid: string) => void;
  saving?: boolean;
};

export default function AsociarExtintorModal({ isOpen, disponibles, onClose, onConfirm, saving }: Props) {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!seleccionado) return;
    onConfirm(seleccionado);
    setSeleccionado(null);
    setBusqueda("");
  };

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? disponibles.filter((e) =>
        (e.nSerie || "").toLowerCase().includes(q) ||
        (e.nInterno || "").toLowerCase().includes(q) ||
        (e.marca || "").toLowerCase().includes(q)
      )
    : disponibles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">🔗 Asociar Extintor Existente</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Selecciona un extintor — la información corresponde a su último servicio anterior a la fecha de este registro.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 shrink-0">✕</button>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">🔎</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por N° Serie, N° Interno o Marca..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition-all"
            />
          </div>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="text-sm text-zinc-500 px-2 py-6 text-center">
              {disponibles.length === 0 ? "Todos los extintores de este contexto ya están asociados a este registro." : "Ningún extintor coincide con la búsqueda."}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtrados.map((ext) => {
                const checked = seleccionado === ext.uid;
                const badges = serviceBadge(ext.ma, ext.recarga, ext.ph);
                const componentesInstalados = COMP_KEYS.filter((k) => ext[k] === "SI");
                return (
                  <label
                    key={ext.uid}
                    className={`flex flex-col gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      checked
                        ? "bg-red-950/20 border-red-700 shadow-[0_0_0_1px_rgba(220,38,38,0.3)]"
                        : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="asociar-extintor"
                        checked={checked}
                        onChange={() => setSeleccionado(ext.uid)}
                        className="accent-red-600 w-4 h-4 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white text-base leading-tight truncate">{ext.nSerie || "S/N"}</p>
                        <p className="text-[11px] text-zinc-500 truncate">N° Interno: {ext.nInterno || "—"}</p>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${estadoColor[ext.estadoExtintor || ""] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                        {ext.estadoExtintor || "Sin estado"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pl-7 py-2 border-y border-zinc-800/60 text-[11px]">
                      <div>
                        <span className="text-zinc-500 uppercase tracking-wide block">Marca</span>
                        <span className="font-bold text-zinc-300">{ext.marca || "—"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 uppercase tracking-wide block">Agente</span>
                        <span className="font-bold text-zinc-300">{ext.agenteExtintor || "—"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 uppercase tracking-wide block">Peso</span>
                        <span className="font-bold text-zinc-300">{ext.peso ? `${ext.peso} ${ext.unidadPeso}` : "—"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 uppercase tracking-wide block">Fabricación</span>
                        <span className="font-bold text-zinc-300">{ext.fechaFabricacion || "—"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 uppercase tracking-wide block">PH Realizado</span>
                        <span className="font-bold text-zinc-300">{formatRealizadoPH(ext.mesRealizadoPH, ext.realizadoPH) || "—"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 uppercase tracking-wide block">Vencimiento PH</span>
                        <span className="font-bold text-zinc-300">{formatVencimPH(ext.vencimPH) || "—"}</span>
                      </div>
                    </div>

                    {(badges.length > 0 || componentesInstalados.length > 0 || ext.servicioExtra || ext.motivoBaja || ext.observaciones) && (
                      <div className="pl-7 flex flex-col gap-2">
                        {badges.length > 0 && (
                          <div>
                            <span className="text-zinc-500 uppercase tracking-wide text-[11px] block mb-1">Servicios</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {badges.map((b) => (
                                <span key={b.label} className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${b.cls}`}>{b.label}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {ext.servicioExtra && (
                          <div>
                            <span className="text-zinc-500 uppercase tracking-wide text-[11px] block mb-1">Adicionales</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {ext.servicioExtra.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                                <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-900/40 text-amber-400 border border-amber-800">✨ {s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {componentesInstalados.length > 0 && (
                          <div>
                            <span className="text-zinc-500 uppercase tracking-wide text-[11px] block mb-1">Componentes instalados</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {componentesInstalados.map((k) => (
                                <span key={k} className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-900/40 text-blue-400 border border-blue-800">🔩 {COMP_LABELS[k]}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(ext.motivoBaja || ext.observaciones) && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {ext.motivoBaja && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-950/50 text-red-400 border border-red-900">⚠️ {ext.motivoBaja}</span>
                            )}
                            {ext.observaciones && (
                              <span className="text-[10px] text-zinc-500 italic truncate max-w-60">"{ext.observaciones}"</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex items-center gap-3 justify-between shrink-0 bg-zinc-900/50">
          <span className="text-xs font-bold text-zinc-500">
            {seleccionado ? "1 seleccionado" : ""}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Cancelar</button>
            <button onClick={handleConfirm} disabled={!seleccionado || saving} className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Asociando..." : "Asociar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}