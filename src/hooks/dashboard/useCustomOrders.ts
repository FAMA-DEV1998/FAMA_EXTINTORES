import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { EmpresaData, Extintor } from "../../types";
import { getEstadoPrioridad, getWeightInKg } from "../../utils/helpers";

export function useCustomOrders(
  socket: Socket | null,
  selectedEmpresa: EmpresaData | null,
  extintores: Extintor[],
  pesoCounts: Record<string, number>,
  estadoCounts: [string, number][]
) {
  const [weightOrderModal, setWeightOrderModal] = useState(false);
  const [customWeightOrder, setCustomWeightOrder] = useState<string[]>([]);

  const [estadoOrderModal, setEstadoOrderModal] = useState(false);
  const [customEstadoOrder, setCustomEstadoOrder] = useState<string[]>([]);

  const [agenteOrderModal, setAgenteOrderModal] = useState(false);
  const [customAgenteOrder, setCustomAgenteOrder] = useState<string[]>([]);

  const setFromEmpresaData = (data: EmpresaData) => {
    setCustomWeightOrder(data.weightOrder || []);
    setCustomEstadoOrder(data.estadoOrder || []);
    setCustomAgenteOrder(data.agenteOrder || []);
  };

  const persistOrders = (overrides: Partial<{ weightOrder: string[]; estadoOrder: string[]; agenteOrder: string[] }>) => {
    if (!socket || !selectedEmpresa?.id) return;
    socket.emit("empresa:save", {
      id: selectedEmpresa.id,
      weightOrder: customWeightOrder,
      estadoOrder: customEstadoOrder,
      agenteOrder: customAgenteOrder,
      ...overrides,
    });
  };

  useEffect(() => {
    const availableWeights = Object.keys(pesoCounts);

    if (availableWeights.length > 0) {
      setCustomWeightOrder((prev) => {
        const missing = availableWeights.filter(w => !prev.includes(w));

        if (missing.length === 0) return prev;

        return [...prev, ...missing].sort((a, b) => getWeightInKg(a) - getWeightInKg(b));
      });
    }
  }, [extintores]); 


  useEffect(() => {
    const availableEstados = estadoCounts.map(([v]) => v);

    if (availableEstados.length > 0) {
      setCustomEstadoOrder((prev) => {
        const missing = availableEstados.filter(es => !prev.includes(es));
        if (missing.length === 0) return prev;
        return [...prev, ...missing].sort((a, b) => getEstadoPrioridad(a) - getEstadoPrioridad(b));
      });
    }
  }, [extintores]);

  return {
    weightOrderModal,
    setWeightOrderModal,
    customWeightOrder,
    setCustomWeightOrder,
    estadoOrderModal,
    setEstadoOrderModal,
    customEstadoOrder,
    setCustomEstadoOrder,
    agenteOrderModal,
    setAgenteOrderModal,
    customAgenteOrder,
    setCustomAgenteOrder,
    setFromEmpresaData,
    persistOrders,
  };
}