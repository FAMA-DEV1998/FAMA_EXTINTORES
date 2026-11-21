import { useEffect, useState } from "react";
import { CalendarCheck, Circle, PhoneCall } from "lucide-react";
import type { EstadoSeguimiento, Seguimiento } from "./useAlertas";

export const ESTADOS_SEGUIMIENTO: { value: EstadoSeguimiento; label: string; icono: typeof Circle; clase: string; activo: string }[] = [
  { value: "pendiente", label: "Pendiente", icono: Circle, clase: "text-zinc-400 bg-zinc-800/60 border-zinc-700", activo: "bg-zinc-200 border-zinc-200 text-zinc-950" },
  { value: "contactado", label: "Contactado", icono: PhoneCall, clase: "text-sky-300 bg-sky-950/40 border-sky-900/60", activo: "bg-sky-500 border-sky-500 text-zinc-950" },
  { value: "agendado", label: "Agendado", icono: CalendarCheck, clase: "text-emerald-300 bg-emerald-950/40 border-emerald-900/60", activo: "bg-emerald-500 border-emerald-500 text-zinc-950" },
];

const fechaCorta = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
};

export function SeguimientoPill({ s }: { s?: Seguimiento }) {
  const e = ESTADOS_SEGUIMIENTO.find((x) => x.value === (s?.estado || "pendiente"))!;
  const Icono = e.icono;
  const detalle = s?.estado === "agendado" && s.fecha ? fechaCorta(s.fecha) : s?.estado === "contactado" ? fechaCorta(s.actualizadoEn) : "";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black whitespace-nowrap ${e.clase}`} title={s?.nota || undefined}>
      <Icono className="w-3 h-3" />{e.label}{detalle && <span className="font-bold opacity-80">· {detalle}</span>}
    </span>
  );
}

interface Props {
  empresaId: string;
  seguimiento?: Seguimiento;
  onGuardar: (data: { empresaId: string; estado: EstadoSeguimiento; fecha?: string | null; nota?: string }, onDone?: (ok: boolean) => void) => void;
}

export default function SeguimientoAlerta({ empresaId, seguimiento, onGuardar }: Props) {
  const [estado, setEstado] = useState<EstadoSeguimiento>(seguimiento?.estado || "pendiente");
  const [fecha, setFecha] = useState(seguimiento?.fecha || "");
  const [nota, setNota] = useState(seguimiento?.nota || "");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setEstado(seguimiento?.estado || "pendiente");
    setFecha(seguimiento?.fecha || "");
    setNota(seguimiento?.nota || "");
  }, [seguimiento?.estado, seguimiento?.fecha, seguimiento?.nota]);

  const cambios = estado !== (seguimiento?.estado || "pendiente") || (fecha || "") !== (seguimiento?.fecha || "") || nota !== (seguimiento?.nota || "");
  const guardar = () => {
    setGuardando(true);
    onGuardar({ empresaId, estado, fecha: estado === "agendado" ? fecha : null, nota: nota.trim() }, () => setGuardando(false));
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Seguimiento comercial</p>
        {seguimiento && seguimiento.estado !== "pendiente" && (
          <p className="text-[10px] text-zinc-600">Actualizado {fechaCorta(seguimiento.actualizadoEn)}{seguimiento.usuario && ` por ${seguimiento.usuario}`}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-950" role="group" aria-label="Estado del seguimiento">
          {ESTADOS_SEGUIMIENTO.map((e) => {
            const Icono = e.icono;
            return (
              <button key={e.value} onClick={() => setEstado(e.value)} aria-pressed={estado === e.value} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${estado === e.value ? e.activo : "text-zinc-500 hover:text-zinc-300"}`}>
                <Icono className="w-3.5 h-3.5" />{e.label}
              </button>
            );
          })}
        </div>
        {estado === "agendado" && (
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha agendada" className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-600 [color-scheme:dark]" />
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={nota} onChange={(e) => setNota(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && cambios) guardar(); }} maxLength={500} placeholder="Nota (ej: Pidió cotización, llamar el lunes)" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-600" />
        <button onClick={guardar} disabled={!cambios || guardando || (estado === "agendado" && !fecha)} className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-black disabled:opacity-40">{guardando ? "Guardando…" : "Guardar"}</button>
      </div>
    </div>
  );
}
