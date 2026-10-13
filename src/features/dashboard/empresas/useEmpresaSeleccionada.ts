import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { EmpresaItem, EmpresaData, Extintor, DashView } from "../../../types";

export function useEmpresaSeleccionada(
  socket: Socket | null,
  onEmpresaData?: (data: EmpresaData) => void
) {
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [empresasCargadas, setEmpresasCargadas] = useState(false);
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

    const onList = (list: EmpresaItem[]) => {
      setEmpresas(list);
      setEmpresasCargadas(true);
    };
    const onData = (data: EmpresaData) => {
      setSelectedEmpresa(data);
      setLoadingDetail(false);
      onEmpresaData?.(data);
    };
    const onDataUpdated = (data: EmpresaData) => {
      setSelectedEmpresa((prev) => prev && prev.id === data.id ? { ...prev, ...data } : prev);
    };
    const onExtintores = ({ id, rows }: { id: string; rows: Extintor[] }) => {
      if (id === selectedEmpresaIdRef.current) setExtintores(rows);
    };
    const onReconexion = () => {
      if (selectedEmpresaIdRef.current) socket.emit("empresa:get", { id: selectedEmpresaIdRef.current });
    };

    socket.on("empresa:list", onList);
    socket.on("empresa:data", onData);
    socket.on("empresa:data:updated", onDataUpdated);
    socket.on("extintor:updated", onExtintores);
    socket.on("connect", onReconexion);

    return () => {
      socket.off("empresa:list", onList);
      socket.off("empresa:data", onData);
      socket.off("empresa:data:updated", onDataUpdated);
      socket.off("extintor:updated", onExtintores);
      socket.off("connect", onReconexion);
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
    empresasCargadas,
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
