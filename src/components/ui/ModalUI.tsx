import React from "react";

// CAMBIO UX: Añadido ring de foco, placeholder más visible y padding lateral mejorado.
export const modalInput = "w-full bg-zinc-950/50 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all";

export function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest border-b border-zinc-800/60 pb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

export function ModalField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}