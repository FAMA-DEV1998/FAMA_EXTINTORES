import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export type ArchivedTab = "empresas" | "extintores" | "inventario" | "cotizaciones";

export function useArchivedManager(socket: Socket | null, role: string) {
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

  const restoreEmpresa = (id: string) => {
    if (!socket) return;
    socket.emit("empresa:restore", { id, role }, (res: any) => {
      if (res?.success) refreshArchived();
    });
  };

  const hardDeleteEmpresa = (id: string) => {
    if (!socket || !confirm("⚠️ ELIMINAR PERMANENTEMENTE esta empresa y todos sus extintores? Esta acción NO se puede deshacer.")) return;
    socket.emit("empresa:hardDelete", { id, role }, (res: any) => {
      if (res?.success) refreshArchived();
    });
  };

  const restoreExtintor = (rowIndex: number, empresaId: string) => {
    if (!socket) return;
    socket.emit("extintor:restore", { rowIndex, id: empresaId, role }, (res: any) => {
      if (res?.success) refreshArchived();
    });
  };

  const hardDeleteExtintor = (rowIndex: number) => {
    if (role !== "boss") return alert("Solo el Boss puede eliminar permanentemente");
    if (!socket || !confirm("⚠️ ¿ELIMINAR PERMANENTEMENTE?")) return;
    socket.emit("extintor:hardDelete", { rowIndex, role }, (res: any) => {
      if (res?.success) refreshArchived();
    });
  };

  const restoreInventario = (id: string) => {
    if (!socket) return;
    socket.emit("inventario:restore", { id }, (res: any) => {
      if (res?.success) refreshArchived();
    });
  };

  const hardDeleteInventario = (id: string) => {
    if (role !== "boss") return alert("Solo el Boss puede eliminar permanentemente");
    if (!socket || !confirm("⚠️ ELIMINAR PERMANENTEMENTE este producto? Esta acción NO se puede deshacer.")) return;
    socket.emit("inventario:hardDelete", { id }, (res: any) => {
      if (res?.success) refreshArchived();
    });
  };

  const restoreCotizacion = (id: string) => {
    if (!socket) return;
    socket.emit("cotizacion:restore", { id }, (res: any) => {
      if (res?.success) refreshArchived();
    });
  };

  const hardDeleteCotizacion = (id: string) => {
    if (role !== "boss") return alert("Solo el Boss puede eliminar permanentemente");
    if (!socket || !confirm("⚠️ ELIMINAR PERMANENTEMENTE esta cotización? Esta acción NO se puede deshacer.")) return;
    socket.emit("cotizacion:hardDelete", { id }, (res: any) => {
      if (res?.success) refreshArchived();
    });
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