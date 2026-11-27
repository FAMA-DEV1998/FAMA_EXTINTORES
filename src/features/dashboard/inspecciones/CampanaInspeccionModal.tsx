import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { LoaderCircle, X } from "lucide-react";
import type { CampanaInspeccion } from "../../../types";
import { useTeclaEscape } from "../../../hooks/useTeclaEscape";

type Opcion = { id: string; razonSocial: string; sedes: { id: string; nombre: string }[] };

const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-600";

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const CAMPOS: { clave: keyof CampanaInspeccion; etiqueta: string; ejemplo: string }[] = [
  { clave: "domicilio", etiqueta: "Domicilio (dirección, distrito, provincia)", ejemplo: "Se toma de la sede o empresa si lo dejas vacío" },
  { clave: "actividadEconomica", etiqueta: "Actividad económica", ejemplo: "Ej.: Transporte de carga, almacenamiento" },
  { clave: "responsableInspeccion", etiqueta: "Responsable de la inspección", ejemplo: "Ej.: Antonio Barrera Monzón" },
  { clave: "cargoInspector", etiqueta: "Cargo del inspector", ejemplo: "Ej.: Jefe de taller" },
  { clave: "nroTrabajadores", etiqueta: "N° de trabajadores del centro", ejemplo: "Opcional" },
  { clave: "responsableAutorizacion", etiqueta: "Responsable de autorizar correctivos (cliente)", ejemplo: "Ej.: Ing. David Sedano" },
  { clave: "responsableSIG", etiqueta: "Responsable del registro (SIG)", ejemplo: "Ej.: Magali Ulloa Fernández" },
  { clave: "responsableRegistro", etiqueta: "Responsable de registro (pie del formato)", ejemplo: "Nombre" },
  { clave: "cargoRegistro", etiqueta: "Cargo del responsable de registro", ejemplo: "Cargo" },
];

export default function CampanaInspeccionModal({ socket, campana, onClose, onGuardada }: { socket: Socket; campana: CampanaInspeccion | null; onClose: () => void; onGuardada: (id: string) => void }) {
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [d, setD] = useState<Record<string, string>>(() => ({
    empresaId: campana?.empresaId || "", sedeId: campana?.sedeId || "", periodo: campana?.periodo || mesActual(),
    ...Object.fromEntries(CAMPOS.map((c) => [c.clave, String(campana?.[c.clave] ?? "")])),
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useTeclaEscape(true, onClose);

  useEffect(() => {
    socket.emit("insp:campana:opciones", {}, (res: any) => { if (res?.success) setOpciones(res.empresas || []); });
  }, [socket]);

  const sedes = opciones.find((o) => o.id === d.empresaId)?.sedes || [];

  const guardar = () => {
    setGuardando(true);
    setError(null);
    socket.emit("insp:campana:save", { ...d, id: campana?.id, sedeId: d.sedeId || null }, (res: any) => {
      setGuardando(false);
      if (res?.success) onGuardada(res.id);
      else setError(res?.error || "No se pudo guardar");
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white">{campana ? "Editar inspección" : "Habilitar inspección"}</h3>
          <button onClick={onClose} aria-label="Cerrar"><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        <label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">Empresa</span>
          <select className={inputCls} value={d.empresaId} disabled={!!campana} onChange={(e) => setD({ ...d, empresaId: e.target.value, sedeId: "" })}>
            <option value="">Elige una empresa…</option>
            {opciones.map((o) => <option key={o.id} value={o.id}>{o.razonSocial}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">Sede</span>
            <select className={inputCls} value={d.sedeId} disabled={!!campana || sedes.length === 0} onChange={(e) => setD({ ...d, sedeId: e.target.value })}>
              <option value="">Toda la empresa</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">Mes de la inspección</span>
            <input type="month" className={inputCls} value={d.periodo} onChange={(e) => setD({ ...d, periodo: e.target.value })} />
          </label>
        </div>
        <p className="text-xs text-zinc-500 -mt-1">Estos datos salen en la cabecera de los Excel. Puedes completarlos después.</p>
        {CAMPOS.map((c) => (
          <label key={c.clave} className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">{c.etiqueta}</span>
            <input className={inputCls} value={d[c.clave]} placeholder={c.ejemplo} onChange={(e) => setD({ ...d, [c.clave]: e.target.value })} />
          </label>
        ))}
        {error && <p className="text-sm font-bold text-red-400">{error}</p>}
        <button onClick={guardar} disabled={guardando || !d.empresaId || !d.periodo} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold">
          {guardando && <LoaderCircle className="w-4 h-4 animate-spin" />}{campana ? "Guardar cambios" : "Habilitar para los técnicos"}
        </button>
      </div>
    </div>
  );
}
