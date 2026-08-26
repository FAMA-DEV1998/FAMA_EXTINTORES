import { useState } from "react";
import { useEmpresaScope } from "../../context/EmpresaScopeContext";
import { useExportActions, useServicios } from "../../hooks/dashboard";
import { WhatsappModal, ServicioModal } from "../../components/modals";
import ExtintorInventoryPanel from "../../components/dashboard/ExtintorInventoryPanel";

export default function HistorialView() {
  const scope = useEmpresaScope() as any;
  const { selectedEmpresa, customOrders, activeSede, socket, extintores } = scope;

  const exportActions = useExportActions(
    socket,
    selectedEmpresa,
    customOrders.customWeightOrder,
    customOrders.customEstadoOrder,
    customOrders.customAgenteOrder,
    activeSede?.id ?? null
  );
  const {
    exporting, whatsappModal, setWhatsappModal, whatsappFormat, setWhatsappFormat,
    whatsappMsg, setWhatsappMsg, exportExcel, executeWhatsapp, openWhatsappModal,
  } = exportActions;

  const servicios = useServicios(socket, selectedEmpresa?.id, activeSede?.id ?? null);
  const { servicios: servicioList, servicioModal, setServicioModal, savingServicio, saveServicio, deleteServicio } = servicios;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const uidToLabel: Record<string, string> = Object.fromEntries(
    extintores.map((e: any) => [e.uid, e.nSerie || "S/N"])
  );

  const formatFecha = (f: string) => f ? f.split("-").reverse().join("/") : "—";
  const formatMesAno = (f: string) => {
    if (!f) return "";
    const [y, m] = f.split("-");
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${meses[parseInt(m) - 1] || m} ${y}`;
  };

  return (
    <div className="flex flex-col gap-8">
      <ExtintorInventoryPanel
        variant="historial"
        onExportExcel={exportExcel}
        exporting={exporting}
        onWhatsapp={openWhatsappModal}
        hasWhatsapp={!!selectedEmpresa?.celular}
      />

      {/* ── Registro de Servicios (historial real: retiro/entrega) ── */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-zinc-800/60 bg-zinc-950/30 flex items-center justify-between">
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            📜 Registro de Servicios
            <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">
              {servicioList.length}
            </span>
          </h3>
          <button
            onClick={() => setServicioModal(true)}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Registrar Servicio
          </button>
        </div>

        {servicioList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-zinc-500 bg-zinc-950/20">
            <span className="text-5xl drop-shadow-md opacity-80">📜</span>
            <p className="text-sm font-medium">Aún no hay servicios registrados en este historial.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {servicioList.map((s: any) => {
              const isOpen = expandedId === s.id;
              return (
                <div key={s.id} className="px-6 py-4">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                    className="w-full flex items-center justify-between gap-4 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg bg-red-950/30 border border-red-900/40 text-red-400 text-[11px] font-black uppercase tracking-wider shrink-0">
                        {formatMesAno(s.fechaRetiro)}
                      </span>
                      <p className="text-sm font-bold text-zinc-200 truncate">
                        {s.extintorUids.length} extintor{s.extintorUids.length === 1 ? "" : "es"} · Retiro {formatFecha(s.fechaRetiro)} → Entrega {formatFecha(s.fechaEntrega)}
                      </p>
                    </div>
                    <span className="text-zinc-500 text-sm shrink-0">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-3 flex flex-col gap-3 pl-1">
                      {s.notas && <p className="text-xs text-zinc-400 italic">{s.notas}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {s.extintorUids.map((uid: string) => (
                          <span key={uid} className="px-2 py-1 rounded-md text-[11px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
                            {uidToLabel[uid] || "Extintor eliminado"}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => deleteServicio(s.id)}
                        className="self-start text-xs font-bold text-red-400 hover:text-red-300 mt-1"
                      >
                        🗑️ Eliminar este registro
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedEmpresa && (
        <WhatsappModal
          isOpen={whatsappModal}
          onClose={() => setWhatsappModal(false)}
          empresa={selectedEmpresa}
          format={whatsappFormat}
          setFormat={setWhatsappFormat}
          msg={whatsappMsg}
          setMsg={setWhatsappMsg}
          exporting={exporting}
          onExecute={executeWhatsapp}
        />
      )}
      <ServicioModal
        isOpen={servicioModal}
        onClose={() => setServicioModal(false)}
        onSave={saveServicio}
        saving={savingServicio}
      />
    </div>
  );
}