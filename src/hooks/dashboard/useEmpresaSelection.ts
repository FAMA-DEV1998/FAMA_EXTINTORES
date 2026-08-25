import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { EmpresaItem, EmpresaData, Extintor, DashView } from "../../types";

export function useEmpresaSelection(
  socket: Socket | null,
  onEmpresaData?: (data: EmpresaData) => void
) {
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [view, setView] = useState<DashView>("list");

  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaData | null>(null);
  const [extintores, setExtintores] = useState<Extintor[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const selectedEmpresaIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedEmpresaIdRef.current = selectedEmpresa?.id ?? null;
  }, [selectedEmpresa?.id]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("empresa:list");

    socket.on("empresa:list", (list: EmpresaItem[]) => setEmpresas(list));

    socket.on("empresa:data", (data: EmpresaData) => {
      setSelectedEmpresa(data);
      setLoadingDetail(false);
      onEmpresaData?.(data);
    });

    socket.on("empresa:data:updated", (data: EmpresaData) => {
      setSelectedEmpresa((prev) => prev && prev.id === data.id ? { ...prev, ...data } : prev);
    });

    socket.on("extintor:updated", ({ id, rows }: { id: string; rows: Extintor[] }) => {
      if (id === selectedEmpresaIdRef.current) setExtintores(rows);
    });

    return () => {
      socket.off("empresa:list");
      socket.off("empresa:data");
      socket.off("empresa:data:updated");
      socket.off("extintor:updated");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const openEmpresa = (emp: EmpresaItem) => {
    if (!socket) return;
    setLoadingDetail(true);
    setExtintores([]);
    setSelectedEmpresa(null);
    socket.emit("empresa:get", { id: emp.id });
    socket.emit("extintor:list", { id: emp.id });
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelectedEmpresa(null);
    setExtintores([]);
  };

  return {
    empresas,
    view,
    setView,
    selectedEmpresa,
    setSelectedEmpresa,
    extintores,
    loadingDetail,
    openEmpresa,
    goBack,
  };
}