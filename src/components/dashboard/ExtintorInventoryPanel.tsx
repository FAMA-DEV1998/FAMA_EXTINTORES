import { COMP_LABELS } from "../../constants";
import { estadoColor, serviceBadge } from "../../utils/helpers";
import { FilterSelect, MetricPanel, ComponentDots } from "../ui/DashboardUI";
import { ExtintorModal, ObservationModal, EvidenciaModal, WeightSortModal } from "../modals";
import { useEmpresaScope } from "../../context/EmpresaScopeContext";

interface ExtintorInventoryPanelProps {
    variant: "resumen" | "historial";
    // Solo se usan cuando variant === "historial"
    onExportExcel?: () => void;
    exporting?: boolean;
    onWhatsapp?: () => void;
    hasWhatsapp?: boolean;
}

export default function ExtintorInventoryPanel({ variant, onExportExcel, exporting, onWhatsapp, hasWhatsapp }: ExtintorInventoryPanelProps) {
    const scope = useEmpresaScope();
    const {
        estadoCounts, marcaCounts, agenteCounts, pesoCounts, serviceCounts, compCounts,
        pesoEntriesWithAgents, duplicateSeries, duplicateInternos,
        showMetrics, setShowMetrics, obsModal, setObsModal, evidencia,
    } = scope as any;
    const {
        fMarca, setFMarca, fAgente, setFAgente, fEstado, setFEstado, fPeso, setFPeso,
        fServicio, setFServicio, fComponente, setFComponente,
        filteredExt, sortedExt, totalExtintores, hasFilters,
    } = scope.filters;
    const {
        customEstadoOrder, setEstadoOrderModal, customAgenteOrder, setAgenteOrderModal,
        customWeightOrder, setWeightOrderModal,
    } = scope.customOrders;
    const {
        extintorModal, setExtintorModal, extintorForm, setExtintorForm, editingRowIndex, saving,
        openAddExtintor, openEditExtintor, saveExtintor, deleteExtintor,
    } = scope.extintorForm;
    const { MARCAS, AGENTES, RECARGAS, MOTIVOS_BAJA, SERVICIOS_EXTRA } = scope.catalogLists;
    const { customWeightOrder: cwOrder, setCustomWeightOrder, persistOrders } = scope.customOrders;
    const { setCustomEstadoOrder, setCustomAgenteOrder } = scope.customOrders;
    const { weightOrderModal, estadoOrderModal, agenteOrderModal } = scope.customOrders;

    return (
        <div className="flex flex-col gap-8">

            {variant === "historial" && (
                <div className="flex flex-wrap items-center gap-2.5 -mb-2">
                    <button onClick={onExportExcel} disabled={exporting} className="px-4 py-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 text-sm font-bold text-emerald-400 border border-emerald-800/50 transition-all flex items-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-900/20 active:scale-95">
                        {exporting ? "⏳ Generando..." : "📥 Exportar Excel"}
                    </button>
                    {hasWhatsapp && (
                        <button onClick={onWhatsapp} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(52,211,153,0.2)] hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:-translate-y-0.5 active:scale-95">
                            📲 Enviar por WhatsApp
                        </button>
                    )}
                </div>
            )}
            {/* ── Métricas ── */}
            <div className="flex flex-col gap-4 bg-zinc-900/20 p-5 rounded-3xl border border-zinc-800/40">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        📊 Panel de Métricas
                    </h3>
                    <button
                        onClick={() => setShowMetrics((p: any) => !p)}
                        className="px-4 py-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
                    >
                        {showMetrics ? "Ocultar" : "Mostrar Detalles"} <span className="text-[10px]">{showMetrics ? "▲" : "▼"}</span>
                    </button>
                </div>

                {showMetrics && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <MetricPanel title="Estado de Extintores" data={estadoCounts} total={totalExtintores} accent />
                            <MetricPanel title="Inventario por Marca" data={marcaCounts} total={totalExtintores} />
                            <MetricPanel title="Tipo de Agente" data={agenteCounts} total={totalExtintores} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MetricPanel title="Capacidad / Peso" data={pesoEntriesWithAgents} total={totalExtintores} />
                            <MetricPanel title="Servicios Aplicados" data={Object.entries(serviceCounts)} total={totalExtintores} />
                            <MetricPanel title="Componentes Reemplazados" data={Object.entries(compCounts).map(([k, v]) => [COMP_LABELS[k] || k, v] as [string, number])} total={totalExtintores} />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Tabla de extintores ── */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl">
                <div className="px-6 py-5 border-b border-zinc-800/60 bg-zinc-950/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                        <h3 className="text-xl font-black text-white flex items-center gap-3">
                            🧯 Extintores Registrados
                            <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">
                                {hasFilters ? `${filteredExt.length} filtrados de ${totalExtintores}` : `Total: ${totalExtintores}`}
                            </span>
                        </h3>
                        <button
                            onClick={openAddExtintor}
                            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> Agregar Extintor
                        </button>
                    </div>

                    {/* Filtros */}
                    <div className="flex flex-wrap gap-3 items-center bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50">
                        <span className="text-xs font-bold text-zinc-500 ml-1 mr-2 uppercase tracking-wider hidden lg:block">Filtros:</span>
                        <FilterSelect label="Marca" value={fMarca} onChange={setFMarca} options={marcaCounts.map(([v]: [string]) => v)} />
                        <FilterSelect label="Agente" value={fAgente} onChange={setFAgente} options={agenteCounts.map(([v]: [string]) => v)} />
                        <FilterSelect label="Estado" value={fEstado} onChange={setFEstado} options={estadoCounts.map(([v]: [string]) => v)} />
                        <FilterSelect
                            label="Peso"
                            value={fPeso}
                            onChange={setFPeso}
                            options={Object.keys(pesoCounts)}
                        />
                        <FilterSelect label="Servicio" value={fServicio} onChange={setFServicio} options={["Mantenimiento", "Recarga", "Prueba Hidrostatica"]} />
                        <FilterSelect label="Comp. Nuevo" value={fComponente} onChange={setFComponente}
                            options={[
                                { value: "valvula", label: "Válvula" },
                                { value: "manguera", label: "Manguera" },
                                { value: "manometro", label: "Manómetro" },
                                { value: "tobera", label: "Tobera" },
                            ]} />
                        {hasFilters && (
                            <button
                                onClick={() => {
                                    setFMarca(""); setFAgente(""); setFEstado("");
                                    setFServicio(""); setFComponente(""); setFPeso("");
                                }}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/30 hover:bg-red-900/40 transition-all ml-auto sm:ml-0"
                            >
                                Limpiar
                            </button>
                        )}
                        <div className="flex gap-2 ml-auto sm:ml-0 flex-wrap">
                            <button
                                onClick={() => setEstadoOrderModal(true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all flex items-center gap-1.5"
                            >
                                <span className="text-sm">📌</span>
                                {customEstadoOrder.length > 0 ? `Estado (${customEstadoOrder.length})` : "Ord. Estado"}
                            </button>
                            <button
                                onClick={() => setAgenteOrderModal(true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all flex items-center gap-1.5"
                            >
                                <span className="text-sm">🧯</span>
                                {customAgenteOrder.length > 0 ? `Tipo (${customAgenteOrder.length})` : "Ord. Tipo"}
                            </button>
                            <button
                                onClick={() => setWeightOrderModal(true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all flex items-center gap-1.5"
                            >
                                <span className="text-sm">⚖️</span>
                                {customWeightOrder.length > 0 ? `Peso (${customWeightOrder.length})` : "Ord. Pesos"}
                            </button>
                        </div>
                    </div>
                </div>

                {filteredExt.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-zinc-500 bg-zinc-950/20">
                        <span className="text-6xl drop-shadow-md opacity-80">🧯</span>
                        <p className="text-base font-medium">{hasFilters ? "No hay extintores que coincidan con los filtros aplicados." : "Aún no se han registrado extintores para esta empresa."}</p>
                        {!hasFilters && (
                            <button onClick={openAddExtintor} className="mt-2 text-sm font-bold text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4 transition-colors">
                                Registrar el primero
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[65vh] relative scroll-smooth rounded-b-3xl">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-20 shadow-md">
                                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-950 backdrop-blur-md">
                                    <th className="px-5 py-4 border-b border-zinc-800">#</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">N° Serie</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">N° Interno</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">Marca</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">Agente</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">Peso</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">Estado</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">Fab.</th>
                                    <th className="px-5 py-4 border-b border-zinc-800" title="Prueba Hidrostática Realizada">PH Realiz.</th>
                                    <th className="px-5 py-4 border-b border-zinc-800" title="Prueba Hidrostática Vencimiento">PH Venc.</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">Servicio</th>
                                    <th className="px-5 py-4 border-b border-zinc-800 min-w-35">Comp. Nuevos</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">Serv. Extra</th>
                                    <th className="px-5 py-4 border-b border-zinc-800">Motivo Baja</th>
                                    <th className="px-5 py-4 border-b border-zinc-800 max-w-50">Observaciones</th>
                                    <th className="px-5 py-4 border-b border-zinc-800 text-center sticky right-0 bg-zinc-950 backdrop-blur-md">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40">
                                {sortedExt.map((ext, i) => {
                                    const badges = serviceBadge(ext.ma, ext.recarga, ext.ph);
                                    return (
                                        <tr
                                            key={ext.rowIndex}
                                            className={`hover:bg-zinc-800/40 transition-colors group ${i % 2 === 0 ? "bg-transparent" : "bg-zinc-900/20"}`}
                                        >
                                            <td className="px-5 py-3.5 text-red-500 font-black">
                                                {i + 1}
                                            </td>
                                            <td className={`px-5 py-3.5 transition-colors ${ext.nSerie && duplicateSeries.has(ext.nSerie.trim()) ? "bg-yellow-500/20" : ""}`}>
                                                <span className={`font-bold ${ext.nSerie && duplicateSeries.has(ext.nSerie.trim()) ? "text-yellow-400" : "text-zinc-100"}`} title={ext.nSerie && duplicateSeries.has(ext.nSerie.trim()) ? "⚠️ Número de Serie duplicado en el inventario" : ""}>
                                                    {ext.nSerie || "—"}
                                                </span>
                                            </td>
                                            <td className={`px-5 py-3.5 transition-colors ${ext.nInterno && duplicateInternos.has(ext.nInterno.trim()) ? "bg-yellow-500/20" : ""}`}>
                                                <span className={`font-medium ${ext.nInterno && duplicateInternos.has(ext.nInterno.trim()) ? "text-yellow-400" : "text-zinc-400"}`} title={ext.nInterno && duplicateInternos.has(ext.nInterno.trim()) ? "⚠️ Número Interno duplicado en el inventario" : ""}>
                                                    {ext.nInterno || "—"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-zinc-300">
                                                {ext.marca || "—"}
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-zinc-300">
                                                {ext.agenteExtintor || "—"}
                                            </td>
                                            <td className="px-5 py-3.5 font-bold text-zinc-300 whitespace-nowrap">
                                                {ext.peso ? `${ext.peso} ${ext.unidadPeso}` : "—"}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span
                                                    className={`inline-block px-3 py-1 rounded-lg text-[11px] font-bold border shadow-sm ${estadoColor[ext.estadoExtintor] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}
                                                >
                                                    {ext.estadoExtintor || "—"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-zinc-400 text-xs">
                                                {ext.fechaFabricacion || "—"}
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-zinc-400 text-xs">
                                                {ext.realizadoPH || "—"}
                                            </td>
                                            <td className="px-5 py-3.5 font-bold text-zinc-300 text-xs">
                                                {ext.vencimPH || "—"}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {badges.length > 0
                                                        ? badges.map((b) => (
                                                            <span
                                                                key={b.label}
                                                                className={`px-2.5 py-1 rounded-md text-[10px] font-black border shadow-sm ${b.cls}`}
                                                            >
                                                                {b.label}
                                                            </span>
                                                        ))
                                                        : <span className="text-zinc-600 font-medium">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <ComponentDots ext={ext} />
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {ext.servicioExtra ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {ext.servicioExtra.split(",").map(s => s.trim()).filter(Boolean).map(s => (
                                                            <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-900/40 text-amber-400 border border-amber-800 shadow-sm whitespace-nowrap">
                                                                {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-600 font-medium">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {ext.motivoBaja ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {ext.motivoBaja.split(",").map(m => m.trim()).filter(Boolean).map(m => (
                                                            <span key={m} className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-900/40 text-red-400 border border-red-800 shadow-sm whitespace-nowrap">
                                                                {m}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-600 font-medium">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs max-w-50">
                                                {ext.observaciones ? (
                                                    <button
                                                        onClick={() => setObsModal(ext.observaciones)}
                                                        className="text-left truncate block text-zinc-400 hover:text-zinc-100 transition-colors underline decoration-dotted underline-offset-4 cursor-pointer w-full font-medium"
                                                        title="Ver observación completa"
                                                    >
                                                        {ext.observaciones}
                                                    </button>
                                                ) : (
                                                    <span className="text-zinc-600 font-medium">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 sticky right-0 bg-zinc-950/80 backdrop-blur-md group-hover:bg-zinc-800/90 transition-colors border-l border-zinc-800/40">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {ext.evidencia === "__HAS_EVIDENCIA__" && (
                                                        <button
                                                            onClick={() => evidencia.open(ext)}
                                                            className="w-8 h-8 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/80 text-sm flex items-center justify-center border border-emerald-800/50 hover:border-emerald-600 transition-all hover:shadow-md hover:shadow-emerald-900/20 relative"
                                                            title={`Ver ${ext.evidenciaCount || 1} foto(s)`}
                                                        >
                                                            📷
                                                            {(ext.evidenciaCount || 0) > 1 && (
                                                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center">{ext.evidenciaCount}</span>
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openEditExtintor(ext)}
                                                        className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-sm flex items-center justify-center border border-zinc-700 transition-all hover:shadow-md"
                                                        title="Editar Extintor"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => deleteExtintor(ext.rowIndex)}
                                                        className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-red-900/80 text-sm flex items-center justify-center border border-zinc-700 hover:border-red-700/80 transition-all hover:shadow-md"
                                                        title="Eliminar Extintor"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ════ MODALES DEL INVENTARIO ════ */}
            {extintorModal && (
                <ExtintorModal form={extintorForm} setForm={setExtintorForm} isEditing={editingRowIndex !== null} onClose={() => setExtintorModal(false)} onSave={saveExtintor} saving={saving} marcas={MARCAS} agentes={AGENTES} recargas={RECARGAS} motivosBaja={MOTIVOS_BAJA} serviciosExtra={SERVICIOS_EXTRA} socket={scope.socket} userRole={scope.role} />
            )}
            <ObservationModal observation={obsModal} onClose={() => setObsModal(null)} />
            <EvidenciaModal
                isOpen={evidencia.isOpen}
                loading={evidencia.loading}
                list={evidencia.list}
                extInfo={evidencia.extInfo}
                activeIdx={evidencia.activeIdx}
                setActiveIdx={evidencia.setActiveIdx}
                onClose={evidencia.close}
            />
            <WeightSortModal
                isOpen={estadoOrderModal}
                onClose={() => scope.customOrders.setEstadoOrderModal(false)}
                availableWeights={estadoCounts.map(([v]: [string, number]) => v)}
                currentOrder={customEstadoOrder}
                onSave={(newOrder: string[]) => { setCustomEstadoOrder(newOrder); scope.customOrders.setEstadoOrderModal(false); persistOrders({ estadoOrder: newOrder }); }}
            />
            <WeightSortModal
                isOpen={agenteOrderModal}
                onClose={() => scope.customOrders.setAgenteOrderModal(false)}
                availableWeights={agenteCounts.map(([v]: [string, number]) => v)}
                currentOrder={customAgenteOrder}
                onSave={(newOrder: string[]) => { setCustomAgenteOrder(newOrder); scope.customOrders.setAgenteOrderModal(false); persistOrders({ agenteOrder: newOrder }); }}
            />
            <WeightSortModal
                isOpen={weightOrderModal}
                onClose={() => scope.customOrders.setWeightOrderModal(false)}
                availableWeights={Object.keys(pesoCounts)}
                currentOrder={cwOrder}
                onSave={(newOrder: string[]) => { setCustomWeightOrder(newOrder); scope.customOrders.setWeightOrderModal(false); persistOrders({ weightOrder: newOrder }); }}
            />
        </div>
    );
}