import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export function useArchivedManager(socket: Socket | null, role: string) {
  const [archivedView, setArchivedView] = useState(false);
  const [archivedEmpresas, setArchivedEmpresas] = useState<any[]>([]);
  const [archivedExtintores, setArchivedExtintores] = useState<any[]>([]);
  const [archivedTab, setArchivedTab] = useState<"empresas" | "extintores">("empresas");
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [expandedArchived, setExpandedArchived] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!socket) return;
    const handleArchivedChange = () => {
      if (archivedView) {
        socket.emit("empresa:deleted:list", { role }, (res: any) => {
          if (res?.success) setArchivedEmpresas(res.list);
        });
        socket.emit("extintor:deleted:list", { role }, (res: any) => {
          if (res?.success) setArchivedExtintores(res.rows);
        });
      }
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

    socket.emit("empresa:deleted:list", { role }, (res: any) => {
      if (res?.success) setArchivedEmpresas(res.list);
    });
    socket.emit("extintor:deleted:list", { role }, (res: any) => {
      setLoadingArchived(false);
      if (res?.success) setArchivedExtintores(res.rows);
    });
    setArchivedView(true);
  };

  const refreshArchived = () => {
    if (!socket) return;
    socket.emit("empresa:deleted:list", { role }, (res: any) => {
      if (res?.success) setArchivedEmpresas(res.list);
    });
    socket.emit("extintor:deleted:list", { role }, (res: any) => {
      if (res?.success) setArchivedExtintores(res.rows);
    });
  };

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

  return {
    archivedView,
    setArchivedView,
    archivedEmpresas,
    archivedExtintores,
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
  };
}