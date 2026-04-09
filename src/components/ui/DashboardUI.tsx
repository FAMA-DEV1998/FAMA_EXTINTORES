import React from "react";
import type { Extintor } from "../../types";

export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 flex flex-col gap-3.5">
      {/* CAMBIO UX: Añadido un pequeño acento visual (línea roja) para mejor jerarquía */}
      <p className="text-[11px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 mb-1">
        <span className="w-1 h-3.5 bg-red-600 rounded-full" />
        {title}
      </p>
      {children}
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-4 group">
      {/* CAMBIO UX: Más contraste entre la etiqueta (sutil) y el valor (destacado) */}
      <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors shrink-0">
        {label}
      </span>
      <span className="text-sm font-bold text-zinc-100 text-right truncate">
        {value || "—"}
      </span>
    </div>
  );
}

export function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[] | { value: string; label: string }[];
}) {
  return (
    // CAMBIO UX: Mayor área táctil (py-2), bordes redondeados consistentes (xl), cursor pointer y focus ring
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition-all bg-zinc-900/80 focus:outline-none focus:ring-2 shadow-sm cursor-pointer ${
        value 
          ? "border-red-600 text-red-400 focus:ring-red-600/20" 
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 focus:ring-zinc-500/20 focus:border-zinc-500"
      }`}
    >
      <option value="">{label}: Todos</option>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        return <option key={val} value={val}>{lbl === "Sin definir" ? "⚠️ Sin definir" : lbl}</option>;
      })}
    </select>
  );
}

export function MetricPanel({
  title, data, total, accent,
}: {
  title: string;
  data: [string, number][];
  total: number;
  accent?: boolean;
}) {
  if (data.length === 0) return null;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl overflow-hidden shadow-sm">
      <div className={`px-5 py-3.5 border-b border-zinc-800/40 flex items-center justify-between ${accent ? "bg-red-950/30" : "bg-zinc-900/40"}`}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
          {title}
        </span>
        {accent && (
          <span className="text-xs font-black text-red-400 bg-red-950/50 px-2 py-0.5 rounded-md border border-red-900/50">
            {total} Total
          </span>
        )}
      </div>
      <div className="divide-y divide-zinc-800/30">
        {data.map(([label, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            // CAMBIO UX: Efecto hover sutil (desplazamiento) para invitar a la interacción visual
            <div key={label} className="flex items-center gap-3 px-5 py-3 group hover:bg-zinc-800/40 transition-all hover:pl-6">
              <span className={`text-sm font-semibold flex-1 truncate flex items-center gap-2 ${label === "Sin definir" ? "text-amber-400" : "text-zinc-200"}`}>
                {label === "Sin definir" && <span className="text-amber-500 text-xs">⚠️</span>}
                {label}
              </span>
              
              {/* CAMBIO UX: Barras más gruesas (h-2) y un brillo sutil en las barras acentuadas */}
              <div className="w-24 h-2 rounded-full bg-zinc-800/80 overflow-hidden shrink-0 hidden sm:block shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${accent ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-zinc-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm font-black text-white w-8 text-right">
                {count}
              </span>
              <span className="text-[10px] font-medium text-zinc-500 w-10 text-right">
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ComponentDots({ ext }: { ext: Extintor }) {
  const comps = [
    { key: "valvula", label: "Válvula" },
    { key: "manguera", label: "Manguera" },
    { key: "manometro", label: "Manómetro" },
    { key: "tobera", label: "Tobera" },
  ] as const;

  const activos = comps.filter((c) => ext[c.key as keyof Extintor] === "SI");

  if (activos.length === 0) return <span className="text-zinc-600 font-medium">—</span>;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {activos.map((c) => (
        // CAMBIO UX: Etiquetas ligeramente más legibles y con un pequeño indicador visual de "check" implícito
        <span
          key={c.key}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border bg-emerald-950/40 text-emerald-400 border-emerald-800/60 shadow-sm"
        >
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          {c.label}
        </span>
      ))}
    </div>
  );
}