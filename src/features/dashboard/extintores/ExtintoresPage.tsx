import { useEmpresaScope } from "../empresas/EmpresaScopeContext";
import { useExportacion } from "../exportacion/useExportacion";
import TablaExtintoresPanel from "./TablaExtintoresPanel";

export default function ExtintoresPage() {
  const scope = useEmpresaScope() as any;
  const { selectedEmpresa, customOrders, activeSede, socket } = scope;

  const { exporting, exportExcel } = useExportacion(
    socket,
    selectedEmpresa,
    customOrders.customWeightOrder,
    customOrders.customEstadoOrder,
    customOrders.customAgenteOrder,
    activeSede?.id ?? null,
    "all",
    undefined,
    undefined,
    customOrders.customSedeOrder
  );

  return <TablaExtintoresPanel variant="resumen" onExportExcel={exportExcel} exporting={exporting} />;
}
