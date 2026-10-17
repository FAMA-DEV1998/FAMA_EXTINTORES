import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, Combine, History, Plus } from "lucide-react";
import { MESES } from "../../../constants";
import { useEmpresaScope } from "../empresas/EmpresaScopeContext";
import { useServicios } from "../../../hooks/useServicios";
import { anioFromFecha, mesFromFecha } from "../../../utils/fechas";
import { ordinalServicio } from "../../../utils/historial";
import FusionServiciosModal from "./FusionServiciosModal";

export default function HistorialMesPage() {
  const { anio, mes } = useParams<{ anio: string; mes: string }>();
  const navigate = useNavigate();
  const scope = useEmpresaScope() as any;
  const { selectedEmpresa, activeSede, socket, sedes, role } = scope;
  const [fusionModal, setFusionModal] = useState(false);
  const puedeUnificar = role === "admin" || role === "boss";

  const anioNumero = parseInt(anio || "");
  const mesInfo = MESES.find((m) => m.label.toLowerCase() === mes);
  const mesNumero = mesInfo ? parseInt(mesInfo.value) : null;

  const { servicios, savingServicio, saveServicio } =
    useServicios(socket, selectedEmpresa?.id, activeSede?.id ?? null);

  const bloqueadoRegistrar = !activeSede && sedes.sedes.length > 0;

  const registros = servicios
    .filter((s: any) => anioFromFecha(s.fechaRetiro) === anioNumero && mesFromFecha(s.fechaRetiro) === mesNumero)
    .sort((a: any, b: any) => (a.secuencia ?? 0) - (b.secuencia ?? 0));

  const formatFecha = (f: string) => f ? f.split("-").reverse().join("/") : "—";

  const handleRegistrarServicio = () => {
    if (bloqueadoRegistrar || !mesNumero || isNaN(anioNumero)) return;
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const hoy = new Date();
    const diaDefault = hoy.getFullYear() === anioNumero && hoy.getMonth() + 1 === mesNumero ? hoy.getDate() : 1;
    const fecha = `${anioNumero}-${pad2(mesNumero)}-${pad2(diaDefault)}`;
    saveServicio({ fechaRetiro: fecha, fechaEntrega: fecha, extintorUids: [] }, (ok, id) => {
      if (ok && id) navigate(id);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Link to={`../..?anio=${anioNumero}`} relative="path" className="flex items-center gap-1 self-start text-xs font-bold text-zinc-500 hover:text-white transition-colors">
        <ChevronLeft className="w-4 h-4" />Volver a {anioNumero}
      </Link>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xl font-black text-white flex items-center gap-3">
          <History className="w-5 h-5 text-red-500" />Historial · {mesInfo?.label || mes} {anioNumero}
          <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">
            {registros.length}
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
        {puedeUnificar && registros.length > 1 && (
          <button
            onClick={() => setFusionModal(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-bold text-zinc-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <Combine className="w-4 h-4" /> Unificar servicios
          </button>
        )}
        <button
          onClick={handleRegistrarServicio}
          disabled={savingServicio || bloqueadoRegistrar}
          title={bloqueadoRegistrar ? "No se pueden registrar nuevos servicios en el historial previo a sedes" : undefined}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Registrar Servicio
        </button>
        </div>
      </div>

      {registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
          <History className="w-14 h-14 text-zinc-700" strokeWidth={1.5} />
          <p className="text-base font-medium">No hay registros para {mesInfo?.label || mes} {anioNumero}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {registros.map((s: any, index: number) => (
            <Link
              key={s.id}
              to={s.id}
              className="flex flex-col gap-2 p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl hover:border-red-700 hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">{ordinalServicio(index + 1)} Servicio</span>
                <ArrowRight className="w-5 h-5 text-zinc-500" />
              </div>
              <p className="text-xs font-bold text-zinc-400">{s.extintorUids.length} extintor{s.extintorUids.length === 1 ? "" : "es"} · Retiro {formatFecha(s.fechaRetiro)}</p>
              {s.notas && <p className="text-xs text-zinc-500 italic truncate">{s.notas}</p>}
            </Link>
          ))}
        </div>
      )}
      {puedeUnificar && (
        <FusionServiciosModal isOpen={fusionModal} onClose={() => setFusionModal(false)} socket={socket} empresaId={selectedEmpresa?.id} sedeId={activeSede?.id ?? null} servicios={servicios} seleccionInicial={registros.map((s: any) => s.id)} />
      )}
    </div>
  );
}
