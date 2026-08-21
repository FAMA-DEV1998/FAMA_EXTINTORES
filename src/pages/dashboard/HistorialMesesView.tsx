import { useState } from "react";
import { Link } from "react-router-dom";
import { MESES } from "../../constants";
import { useEmpresaScope } from "../../context/EmpresaScopeContext";
import { useServicios } from "../../hooks/dashboard";
import { anioFromFecha, mesFromFecha } from "../../utils/helpers";

const ANIO_DEFAULT = 2026;

/**
 * Historial — Nivel 1: el Año es la primera referencia temporal (filtro
 * independiente del Mes, predeterminado en 2026). Al cambiar el año se
 * recalculan las 12 tarjetas de mes para ese año. Cada tarjeta indica
 * claramente si hay o no registros. Flujo: Año → Mes → Registrar Servicio.
 */
export default function HistorialMesesView() {
  const scope = useEmpresaScope() as any;
  const { selectedEmpresa, activeSede, socket } = scope;

  const { servicios } = useServicios(socket, selectedEmpresa?.id, activeSede?.id ?? null);

  const [anio, setAnio] = useState(ANIO_DEFAULT);

  // Años disponibles para el filtro: los que ya tienen registros + siempre
  // el año predeterminado, para que nunca falte como opción.
  const aniosDisponibles = [...new Set([ANIO_DEFAULT, ...servicios.map((s: any) => anioFromFecha(s.fechaRetiro)).filter((y: number | null): y is number => y !== null)])]
    .sort((a, b) => b - a);

  const serviciosDelAnio = servicios.filter((s: any) => anioFromFecha(s.fechaRetiro) === anio);

  const countByMes: Record<number, number> = {};
  serviciosDelAnio.forEach((s: any) => {
    const m = mesFromFecha(s.fechaRetiro);
    if (m) countByMes[m] = (countByMes[m] || 0) + 1;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <h3 className="text-xl font-black text-white flex items-center gap-3">
          📜 Historial de Servicios
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500">{serviciosDelAnio.length} registro{serviciosDelAnio.length === 1 ? "" : "s"} en {anio}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Año</span>
            <select
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value))}
              className="rounded-xl px-3.5 py-2 text-sm font-bold border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 cursor-pointer"
            >
              {aniosDisponibles.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {MESES.map((m) => {
          const count = countByMes[parseInt(m.value)] || 0;
          const hasRecord = count > 0;
          return (
            <Link
              key={m.value}
              to={`${anio}/${m.label.toLowerCase()}`}
              className={`flex flex-col gap-3 p-5 rounded-2xl border transition-all hover:-translate-y-1 ${
                hasRecord
                  ? "bg-red-950/20 border-red-900/40 hover:border-red-700 hover:shadow-xl hover:shadow-red-900/10"
                  : "bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-lg font-black ${hasRecord ? "text-white" : "text-zinc-500"}`}>{m.label}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${hasRecord ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-zinc-700"}`} />
              </div>
              {hasRecord ? (
                <span className="text-xs font-bold text-red-400">
                  {count} registro{count === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="text-xs font-medium text-zinc-600">Sin registros</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}