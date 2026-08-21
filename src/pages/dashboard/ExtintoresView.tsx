import { useEmpresaScope } from "../../context/EmpresaScopeContext";
import { useExportActions } from "../../hooks/dashboard";
import ExtintorInventoryPanel from "../../components/dashboard/ExtintorInventoryPanel";

export default function ExtintoresView() {
  const scope = useEmpresaScope() as any;
  const { selectedEmpresa, customOrders, activeSede, socket } = scope;

  const { exporting, exportExcel } = useExportActions(
    socket,
    selectedEmpresa,
    customOrders.customWeightOrder,
    customOrders.customEstadoOrder,
    customOrders.customAgenteOrder,
    activeSede?.id ?? null,
    "all"
  );

  return <ExtintorInventoryPanel variant="resumen" onExportExcel={exportExcel} exporting={exporting} />;
}