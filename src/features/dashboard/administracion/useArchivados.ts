import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { confirmar } from "../../../components/ui/Notificaciones";

export type ArchivedTab = "empresas" | "extintores" | "inventario" | "cotizaciones";

export function useArchivados(socket: Socket | null, role: string) {
  const [archivedView, setArchivedView] = useState(false);
  const [archivedEmpresas, setArchivedEmpresas] = useState<any[]>([]);
  const [archivedExtintores, setArchivedExtintores] = useState<any[]>([]);
  const [archivedInventario, setArchivedInventario] = useState<any[]>([]);
  const [archivedCotizaciones, setArchivedCotizaciones] = useState<any[]>([]);
  const [archivedTab, setArchivedTab] = useState<ArchivedTab>("empresas");
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [expandedArchived, setExpandedArchived] = useState<Record<string, boolean>>({});

  const fetchAll = (onDone?: () => void) => {
    if (!socket) {
      onDone?.();
      return;
    }
    let pending = 4;
    const done = () => {
      pending -= 1;
      if (pending === 0) onDone?.();
    };
    socket.emit("empresa:deleted:list", { role }, (res: any) => {
      if (res?.success) setArchivedEmpresas(res.list);
      done();
    });
    socket.emit("extintor:deleted:list", { role }, (res: any) => {
      if (res?.success) setArchivedExtintores(res.rows);
      done();
    });
    socket.emit("inventario:deleted:list", {}, (res: any) => {
      if (res?.success) setArchivedInventario(res.rows);
      done();
    });
    socket.emit("cotizacion:deleted:list", {}, (res: any) => {
      if (res?.success) setArchivedCotizaciones(res.rows);
      done();
    });
  };

  useEffect(() => {
    if (!socket) return;
    const handleArchivedChange = () => {
      if (archivedView) fetchAll();
    };
    socket.on("extintor:archived:changed", handleArchivedChange);
    return () => {
      socket.off("extintor:archived:changed", handleArchivedChange);
    };
  }, [socket, archivedView, role]);

  const openArchivedView = () => {
    if (!socket || (role !== "boss" && role !== "admin")) return;
    setLoadingArchived(true);
    setArchivedTab("empresas");
    fetchAll(() => setLoadingArchived(false));
    setArchivedView(true);
  };

  const refreshArchived = () => fetchAll();

  const emitirAccion = (evento: string, payload: Record<string, unknown>, mensajeExito: string) => {
    if (!socket) return;
    socket.emit(evento, payload, (res: any) => {
      if (res?.success) {
        toast.success(mensajeExito);
        refreshArchived();
      } else toast.error(res?.error || "No se pudo completar la acción");
    });
  };

  const confirmarEliminacion = (mensaje: string) => confirmar({
    titulo: "¿Eliminar permanentemente?",
    mensaje,
    textoConfirmar: "Eliminar para siempre",
    peligro: true,
  });

  const soloBoss = () => {
    if (role === "boss") return true;
    toast.error("Solo el Boss puede eliminar permanentemente");
    return false;
  };

  const restoreEmpresa = (id: string) => emitirAccion("empresa:restore", { id, role }, "Empresa restaurada");

  const hardDeleteEmpresa = async (id: string) => {
    if (!socket || !(await confirmarEliminacion("Se eliminará la empresa y todos sus extintores. Esta acción NO se puede deshacer."))) return;
    emitirAccion("empresa:hardDelete", { id, role }, "Empresa eliminada permanentemente");
  };

  const restoreExtintor = (rowIndex: number, empresaId: string) => emitirAccion("extintor:restore", { rowIndex, id: empresaId, role }, "Extintor restaurado");

  const hardDeleteExtintor = async (rowIndex: number) => {
    if (!soloBoss()) return;
    if (!socket || !(await confirmarEliminacion("El extintor se eliminará de forma definitiva. Esta acción NO se puede deshacer."))) return;
    emitirAccion("extintor:hardDelete", { rowIndex, role }, "Extintor eliminado permanentemente");
  };

  const restoreInventario = (id: string) => emitirAccion("inventario:restore", { id }, "Producto restaurado");

  const hardDeleteInventario = async (id: string) => {
    if (!soloBoss()) return;
    if (!socket || !(await confirmarEliminacion("El producto se eliminará de forma definitiva. Esta acción NO se puede deshacer."))) return;
    emitirAccion("inventario:hardDelete", { id }, "Producto eliminado permanentemente");
  };

  const restoreCotizacion = (id: string) => emitirAccion("cotizacion:restore", { id }, "Cotización restaurada");

  const hardDeleteCotizacion = async (id: string) => {
    if (!soloBoss()) return;
    if (!socket || !(await confirmarEliminacion("La cotización se eliminará de forma definitiva. Esta acción NO se puede deshacer."))) return;
    emitirAccion("cotizacion:hardDelete", { id }, "Cotización eliminada permanentemente");
  };

  return {
    archivedView,
    setArchivedView,
    archivedEmpresas,
    archivedExtintores,
    archivedInventario,
    archivedCotizaciones,
    archivedTab,
    setArchivedTab,
    loadingArchived,
    expandedArchived,
    setExpandedArchived,
    openArchivedView,
    refreshArchived,
    restoreEmpresa,
    hardDeleteEmpresa,
    restoreExtintor,
    hardDeleteExtintor,
    restoreInventario,
    hardDeleteInventario,
    restoreCotizacion,
    hardDeleteCotizacion,
  };
}
