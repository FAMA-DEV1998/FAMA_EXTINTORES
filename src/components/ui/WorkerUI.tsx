import React from "react";

// CAMBIO UX: Añadido ring de foco, padding más amplio para móviles (py-3) y placeholder más claro.
export const inputCls =
  "w-full border-2 border-zinc-200 rounded-xl px-3.5 py-3 text-sm font-bold text-zinc-800 bg-zinc-50 placeholder-zinc-400 focus:outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-600/10 transition-all shadow-sm";

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    // CAMBIO UX: Paddings aumentados (p-5 md:p-7) para mayor "respiración" visual.
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-7 flex flex-col gap-5 shadow-sm hover:shadow-md transition-shadow">
      {/* CAMBIO UX: Acento visual rojo a la izquierda del título, igual que en el Dashboard */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
        <span className="w-1 h-4 bg-red-600 rounded-full" />
        <h3 className="text-xs md:text-[13px] font-black text-red-700 uppercase tracking-widest">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* CAMBIO UX: Fuente en negrita, un poco más de tamaño y espaciado a la izquierda */}
      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
        {label}
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
      // CAMBIO UX: Cambio de color al estar activo (fondo claro, borde rojo) para no competir con el botón de "Guardar"
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${checked ? "bg-red-50 border-red-600 text-red-800 shadow-[0_4px_15px_rgba(220,38,38,0.1)] hover:-translate-y-0.5" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300"}`}
    >
      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs font-black shrink-0 transition-colors ${checked ? "bg-red-600 border-red-600 text-white" : "border-zinc-300 bg-white text-transparent"}`}>
        ✓
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
      // CAMBIO UX: Verde más vibrante (emerald-500), sombra luminosa para feedback táctil y animación suave
      className={`w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all active:scale-90 ${checked ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5" : "bg-zinc-50 border-zinc-200 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-400"}`}
    >
      {checked ? "✓" : ""}
    </button>
  );
}