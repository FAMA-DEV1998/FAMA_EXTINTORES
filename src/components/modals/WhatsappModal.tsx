import React from "react";
import type { EmpresaData } from "../../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  empresa: EmpresaData;
  format: "excel" | "pdf";
  setFormat: React.Dispatch<React.SetStateAction<"excel" | "pdf">>;
  msg: string;
  setMsg: React.Dispatch<React.SetStateAction<string>>;
  exporting: boolean;
  onExecute: () => void;
};

export default function WhatsappModal({
  isOpen, onClose, empresa, format, setFormat, msg, setMsg, exporting, onExecute
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white">📲 Enviar por WhatsApp</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto">
          {/* Destinatario */}
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60">
            <span className="text-2xl drop-shadow-md">👤</span>
            <div>
              <p className="text-sm font-bold text-zinc-200">{empresa.nombresApellidos || "Sin nombre"}</p>
              <p className="text-xs text-zinc-400 font-medium tracking-wide mt-0.5">{empresa.celular}</p>
            </div>
          </div>

          {/* Formato */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-0.5">Formato del archivo</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFormat("excel")} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all hover:-translate-y-0.5 ${format === "excel" ? "bg-emerald-900/40 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"}`}>
                <span className="text-lg">📊</span> Excel
              </button>
              <button type="button" onClick={() => setFormat("pdf")} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all hover:-translate-y-0.5 ${format === "pdf" ? "bg-red-900/40 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"}`}>
                <span className="text-lg">📄</span> PDF
              </button>
            </div>
          </div>

          {/* Mensaje */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-0.5">Mensaje</label>
            <textarea className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none" value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} />
            <p className="text-[10px] font-medium text-zinc-500 text-right mt-1">{msg.length} caracteres</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end shrink-0 bg-zinc-900/50">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
          <button onClick={onExecute} disabled={exporting || !msg.trim()} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 disabled:opacity-50 transition-all hover:-translate-y-0.5 flex items-center gap-2">
            {exporting ? "⏳ Generando..." : "📲 Descargar y Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}