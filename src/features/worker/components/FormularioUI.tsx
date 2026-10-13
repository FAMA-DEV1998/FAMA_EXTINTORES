import React from "react";
import { Check, type LucideIcon } from "lucide-react";

export const inputCls =
  "w-full border-2 border-zinc-200 rounded-xl px-3.5 py-3 text-sm font-bold text-zinc-800 bg-zinc-50 placeholder-zinc-400 focus:outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-600/10 transition-all shadow-sm";

export function Card({ title, icon: Icono, children, faltante }: { title: string; icon?: LucideIcon; children: React.ReactNode; faltante?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-5 md:p-7 flex flex-col gap-5 shadow-sm hover:shadow-md transition-shadow ${faltante ? "border-2 border-amber-400" : "border border-zinc-200/80"}`}>
      <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
        <span className="w-1 h-4 bg-red-600 rounded-full" />
        {Icono && <Icono className="w-4 h-4 text-red-700" />}
        <h3 className="text-xs md:text-[13px] font-black text-red-700 uppercase tracking-widest flex-1">
          {title}
        </h3>
        {faltante && <EtiquetaFalta />}
      </div>
      {children}
    </div>
  );
}

function EtiquetaFalta() {
  return <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-wider normal-case">Falta</span>;
}

export function Field({ label, children, className = "", faltante }: { label: string; children: React.ReactNode; className?: string; faltante?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className} ${faltante ? "[&_input]:border-amber-400 [&_select]:border-amber-400" : ""}`}>
      <label className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ml-1 ${faltante ? "text-amber-700" : "text-zinc-500"}`}>
        {label}
        {faltante && <EtiquetaFalta />}
      </label>
      {children}
    </div>
  );
}

export function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${checked ? "bg-red-50 border-red-600 text-red-800 shadow-[0_4px_15px_rgba(220,38,38,0.1)] hover:-translate-y-0.5" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300"}`}
    >
      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-red-600 border-red-600 text-white" : "border-zinc-300 bg-white text-transparent"}`}>
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </span>
      {label}
    </button>
  );
}

export function SiNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const checked = value === "SI";
  return (
    <button
      type="button"
      onClick={() => onChange(checked ? "" : "SI")}
      aria-pressed={checked}
      className={`w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-xl border-2 flex items-center justify-center transition-all active:scale-90 ${checked ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5" : "bg-zinc-50 border-zinc-200 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-400"}`}
    >
      {checked && <Check className="w-6 h-6" strokeWidth={3} />}
    </button>
  );
}
