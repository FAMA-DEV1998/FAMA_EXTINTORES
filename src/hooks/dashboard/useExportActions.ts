import { useState } from "react";
import type { Socket } from "socket.io-client";
import type { EmpresaData } from "../../types";
import { downloadBase64 } from "../../utils/helpers";

export function useExportActions(
  socket: Socket | null,
  selectedEmpresa: EmpresaData | null,
  customWeightOrder: string[],
  customEstadoOrder: string[],
  customAgenteOrder: string[],
  sedeId?: string | null,
  mode: "all" | "historial" = "historial",
  extintorUids?: string[],
  servicioId?: string
) {
  const [exporting, setExporting] = useState(false);

  const [whatsappModal, setWhatsappModal] = useState(false);
  const [whatsappFormat, setWhatsappFormat] = useState<"excel" | "pdf">("excel");
  const [whatsappMsg, setWhatsappMsg] = useState("");

  const exportExcel = () => {
    if (!socket || !selectedEmpresa?.id) return;
    setExporting(true);
    socket.emit("export:excel", {
      id: selectedEmpresa.id,
      sedeId,
      weightOrder: customWeightOrder,
      estadoOrder: customEstadoOrder,
      agenteOrder: customAgenteOrder,
      mode,
      extintorUids,
      servicioId,
    }, (res: any) => {
      setExporting(false);
      if (res?.success && res.data) {
        downloadBase64(res.data, res.fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      } else if (res && !res.success) {
        alert(res.error || "No se pudo exportar el Excel");
      }
    });
  };

  const openWhatsappLink = () => {
    if (!selectedEmpresa?.celular) return;
    let num = selectedEmpresa.celular.replace(/\D/g, "");
    if (num.length === 9 && num.startsWith("9")) num = "51" + num;
    const msg = encodeURIComponent(whatsappMsg);
    setTimeout(() => {
      window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
      setWhatsappModal(false);
    }, 1000);
  };

  const executeWhatsapp = () => {
    if (!socket || !selectedEmpresa?.id) return;
    setExporting(true);

    if (whatsappFormat === "excel") {
      socket.emit("export:excel", {
        id: selectedEmpresa.id,
        sedeId,
        weightOrder: customWeightOrder,
        estadoOrder: customEstadoOrder,
        agenteOrder: customAgenteOrder,
        mode,
        extintorUids,
        servicioId,
      }, (res: any) => {
        setExporting(false);
        if (res?.success && res.data) {
          downloadBase64(res.data, res.fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          openWhatsappLink();
        }
      });
    } else {
      socket.emit("export:pdf", {
        id: selectedEmpresa.id,
        sedeId,
        weightOrder: customWeightOrder,
        estadoOrder: customEstadoOrder,
        agenteOrder: customAgenteOrder,
        mode,
        extintorUids,
        servicioId,
      }, (res: any) => {
        setExporting(false);
        if (!res?.success) {
          alert(res?.error || "Error al generar PDF");
          return;
        }
        if (res.data) {
          const fileName = `${selectedEmpresa.razonSocial.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "")}_Extintores.pdf`;
          downloadBase64(res.data, fileName, "application/pdf");
          openWhatsappLink();
        }
      });
    }
  };

  const openWhatsappModal = () => {
    if (!selectedEmpresa) return;
    setWhatsappMsg(
      `Hola ${selectedEmpresa.nombresApellidos || ""},\n` +
      `Le envío el detalle de servicio de extintores de *${selectedEmpresa.razonSocial}*.\n` +
      `Adjunto el archivo con el inventario completo.`
    );
    setWhatsappFormat("excel");
    setWhatsappModal(true);
  };

  return {
    exporting,
    whatsappModal,
    setWhatsappModal,
    whatsappFormat,
    setWhatsappFormat,
    whatsappMsg,
    setWhatsappMsg,
    exportExcel,
    executeWhatsapp,
    openWhatsappModal,
  };
}