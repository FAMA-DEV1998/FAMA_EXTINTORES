import { useEmpresaScope } from "../../context/EmpresaScopeContext";
import { useExportActions } from "../../hooks/dashboard";
import { WhatsappModal } from "../../components/modals";
import ExtintorInventoryPanel from "../../components/dashboard/ExtintorInventoryPanel";

export default function HistorialView() {
    const scope = useEmpresaScope() as any;
    const { selectedEmpresa, customOrders, activeSede, socket } = scope;

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

    return (
        <>
            <ExtintorInventoryPanel
                variant="historial"
                onExportExcel={exportExcel}
                exporting={exporting}
                onWhatsapp={openWhatsappModal}
                hasWhatsapp={!!selectedEmpresa?.celular}
            />
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
        </>
    );
}