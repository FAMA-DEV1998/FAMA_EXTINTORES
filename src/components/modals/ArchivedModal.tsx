import React from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tab: "empresas" | "extintores";
  setTab: React.Dispatch<React.SetStateAction<"empresas" | "extintores">>;
  empresas: any[];
  extintores: any[];
  loading: boolean;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onRestoreEmpresa: (id: string) => void;
  onHardDeleteEmpresa: (id: string) => void;
  onRestoreExtintor: (rowIndex: number, empresaId: string) => void;
  onHardDeleteExtintor: (rowIndex: number) => void;
  userRole: string;
};

export default function ArchivedModal({
  isOpen, onClose, tab, setTab, empresas, extintores, loading,
  expanded, setExpanded, onRestoreEmpresa, onHardDeleteEmpresa,
  onRestoreExtintor, onHardDeleteExtintor, userRole
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">🗂️ Elementos Archivados</h3>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">Restaurar o eliminar permanentemente</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 shrink-0 bg-zinc-950/30">
          <button onClick={() => setTab("empresas")} className={`flex-1 py-3.5 text-[13px] font-bold transition-all border-b-2 ${tab === "empresas" ? "text-red-400 border-red-500 bg-red-950/10" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"}`}>
            🏢 Empresas ({empresas.length})
          </button>
          <button onClick={() => setTab("extintores")} className={`flex-1 py-3.5 text-[13px] font-bold transition-all border-b-2 ${tab === "extintores" ? "text-red-400 border-red-500 bg-red-950/10" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"}`}>
            🧯 Extintores ({extintores.length})
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
            </div>
          ) : tab === "empresas" ? (
            empresas.length === 0 ? (
              <div className="text-center py-16 text-zinc-600 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800/60">
                <p className="text-5xl mb-3 drop-shadow-md opacity-80">🏢</p>
                <p className="text-sm font-medium">No hay empresas en la papelera</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {empresas.map((emp) => (
                  <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 rounded-2xl transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-zinc-100 truncate">{emp.razonSocial}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-700/50">RUC: {emp.ruc || "—"}</span>
                        <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-700/50">{emp.distrito || "—"}</span>
                        <span className="text-[11px] text-zinc-500 ml-1">Archivado el: {new Date(emp.deletedAt).toLocaleDateString("es-PE")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => onRestoreEmpresa(emp.id)} className="px-4 py-2 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/60 text-xs font-bold text-emerald-400 border border-emerald-900/50 hover:border-emerald-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5">
                        ♻️ Restaurar
                      </button>
                      {userRole === "boss" && (
                        <button onClick={() => onHardDeleteEmpresa(emp.id)} className="px-4 py-2 rounded-xl bg-red-950/20 hover:bg-red-900/40 text-xs font-bold text-red-400 border border-red-900/30 hover:border-red-800/60 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5">
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            extintores.length === 0 ? (
              <div className="text-center py-16 text-zinc-600 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800/60">
                <p className="text-5xl mb-3 drop-shadow-md opacity-80">🧯</p>
                <p className="text-sm font-medium">No hay extintores en la papelera</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {Object.entries(
                  extintores.reduce((acc: any, ext: any) => {
                    const empId = ext.empresaId;
                    if (!acc[empId]) {
                      acc[empId] = { empresa: ext.empresa || { razonSocial: empId }, extintores: [] };
                    }
                    acc[empId].extintores.push(ext);
                    return acc;
                  }, {})
                ).map(([empId, group]: [string, any]) => {
                  const isExpanded = expanded[empId];
                  return (
                    <div key={empId} className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
                      {/* Cabecera del Acordeón */}
                      <button
                        onClick={() => setExpanded((p) => ({ ...p, [empId]: !p[empId] }))}
                        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 transition-colors text-left ${isExpanded ? "bg-zinc-800/40 border-b border-zinc-800/80" : "bg-zinc-900/60 hover:bg-zinc-800/60"}`}
                      >
                        <div>
                          <p className="text-base font-black text-zinc-100 flex items-center gap-2">
                            🏢 {group.empresa.razonSocial}
                          </p>
                          <p className="text-xs text-zinc-500 font-medium mt-1 ml-6">
                            RUC: {group.empresa.ruc || "Sin RUC"} 
                            {group.empresa.fechaRetiro && ` · Retiro: ${group.empresa.fechaRetiro.split("-").reverse().join("/")}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 ml-6 sm:ml-0">
                          <span className="text-xs font-bold text-red-400 bg-red-950/30 border border-red-900/30 px-3 py-1 rounded-lg">
                            {group.extintores.length} archivado{group.extintores.length !== 1 ? 's' : ''}
                          </span>
                          <div className={`w-8 h-8 rounded-full bg-zinc-950/50 border border-zinc-800 flex items-center justify-center text-zinc-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                            ▼
                          </div>
                        </div>
                      </button>

                      {/* ══ CAMBIO UX/UI: TABLA MEJORADA ══ */}
                      {isExpanded && (
                        <div className="overflow-x-auto bg-zinc-950/20">
                          <table className="w-full text-sm">
                            <thead className="bg-zinc-900/80">
                              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <th className="px-5 py-4 border-b border-zinc-800/80">N° Serie</th>
                                <th className="px-5 py-4 border-b border-zinc-800/80">Marca</th>
                                <th className="px-5 py-4 border-b border-zinc-800/80">Agente</th>
                                <th className="px-5 py-4 border-b border-zinc-800/80">Estado</th>
                                <th className="px-5 py-4 border-b border-zinc-800/80">Archivado el</th>
                                <th className="px-5 py-4 border-b border-zinc-800/80 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40">
                              {group.extintores.map((ext: any, index: number) => (
                                <tr key={ext.rowIndex} className={`hover:bg-zinc-800/40 transition-colors group ${index % 2 === 0 ? "bg-transparent" : "bg-zinc-900/20"}`}>
                                  <td className="px-5 py-3.5 font-bold text-zinc-100">{ext.nSerie || "—"}</td>
                                  <td className="px-5 py-3.5 font-medium text-zinc-300">{ext.marca || "—"}</td>
                                  <td className="px-5 py-3.5 font-medium text-zinc-300">{ext.agenteExtintor || "—"}</td>
                                  <td className="px-5 py-3.5">
                                    <span className="inline-block px-3 py-1 rounded-lg text-[11px] font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-700/80 shadow-sm">
                                      {ext.estadoExtintor || "—"}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-zinc-500 font-medium text-xs">
                                    {new Date(ext.deletedAt).toLocaleDateString("es-PE")}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => onRestoreExtintor(ext.rowIndex, ext.empresaId)}
                                        title="Restaurar a la lista principal"
                                        className="px-3.5 py-1.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/60 text-[11px] font-bold text-emerald-400 border border-emerald-900/50 hover:border-emerald-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5"
                                      >
                                        ♻️ Restaurar
                                      </button>

                                      {userRole === "boss" && (
                                        <button
                                          onClick={() => onHardDeleteExtintor(ext.rowIndex)}
                                          title="Eliminar de forma permanente"
                                          className="px-3.5 py-1.5 rounded-xl bg-red-950/20 hover:bg-red-900/40 text-[11px] font-bold text-red-400 border border-red-900/30 hover:border-red-800/60 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5"
                                        >
                                          🗑️ Eliminar
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}