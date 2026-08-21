import { Link, useParams } from "react-router-dom";
import { MESES } from "../../constants";
import { useEmpresaScope } from "../../context/EmpresaScopeContext";
import { useServicios } from "../../hooks/dashboard";
import { anioFromFecha, mesFromFecha } from "../../utils/helpers";
import { ServicioModal } from "../../components/modals";

export default function HistorialMesRegistrosView() {
  const { anio, mes } = useParams<{ anio: string; mes: string }>();
  const scope = useEmpresaScope() as any;
  const { selectedEmpresa, activeSede, socket } = scope;

  const anioNumero = parseInt(anio || "");
  const mesInfo = MESES.find((m) => m.label.toLowerCase() === mes);
  const mesNumero = mesInfo ? parseInt(mesInfo.value) : null;

  const { servicios, servicioModal, setServicioModal, savingServicio, saveServicio } =
    useServicios(socket, selectedEmpresa?.id, activeSede?.id ?? null);

  const registros = servicios
    .filter((s: any) => anioFromFecha(s.fechaRetiro) === anioNumero && mesFromFecha(s.fechaRetiro) === mesNumero)
    .sort((a: any, b: any) => (b.fechaRetiro || "").localeCompare(a.fechaRetiro || ""));

  const formatFecha = (f: string) => f ? f.split("-").reverse().join("/") : "—";

  const handleSaveServicio = (data: { fechaRetiro: string; fechaEntrega: string; notas?: string }) => {
    saveServicio({ ...data, extintorUids: [] });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xl font-black text-white flex items-center gap-3">
          📜 Historial · {mesInfo?.label || mes} {anioNumero}
          <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">
            {registros.length}
          </span>
        </h3>
        <button
          onClick={() => setServicioModal(true)}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Registrar Servicio
        </button>
      </div>

      {registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
          <span className="text-6xl drop-shadow-md opacity-80">📜</span>
          <p className="text-base font-medium">No hay registros para {mesInfo?.label || mes} {anioNumero}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {registros.map((s: any) => (
            <Link
              key={s.id}
              to={s.id}
              className="flex flex-col gap-2 p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl hover:border-red-700 hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">{s.extintorUids.length} extintor{s.extintorUids.length === 1 ? "" : "es"}</span>
                <span className="text-zinc-500 text-lg">→</span>
              </div>
              <p className="text-xs font-bold text-zinc-400">
                Retiro {formatFecha(s.fechaRetiro)} · Entrega {formatFecha(s.fechaEntrega)}
              </p>
              {s.notas && <p className="text-xs text-zinc-500 italic truncate">{s.notas}</p>}
            </Link>
          ))}
        </div>
      )}

      {mesInfo && !isNaN(anioNumero) && (
        <ServicioModal
          isOpen={servicioModal}
          anio={anioNumero}
          mes={mesNumero as number}
          mesLabel={mesInfo.label}
          onClose={() => setServicioModal(false)}
          onSave={handleSaveServicio}
          saving={savingServicio}
        />
      )}
    </div>
  );
}