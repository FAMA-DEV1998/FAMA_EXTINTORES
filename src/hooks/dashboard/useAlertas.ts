import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

const STORAGE_KEY = "fama_alertas_anticipacion_dias";

export const ANTICIPACION_OPCIONES = [
  { value: 15, label: "15 días" },
  { value: 30, label: "1 mes" },
  { value: 60, label: "2 meses" },
  { value: 90, label: "3 meses" },
  { value: 180, label: "6 meses" },
];

const anticipacionValida = (valor: number) => ANTICIPACION_OPCIONES.some((o) => o.value === valor);

const anticipacionGuardada = () => {
  const guardado = Number(localStorage.getItem(STORAGE_KEY));
  return anticipacionValida(guardado) ? guardado : 30;
};

export function useAlertas(socket: Socket | null) {
  const [anticipacionDias, setAnticipacionDias] = useState<number>(anticipacionGuardada);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [totalVencidas, setTotalVencidas] = useState(0);
  const [totalProximas, setTotalProximas] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const cargar = () => {
      setLoading(true);
      socket.emit("alertas:vencimientos", { anticipacionDias }, (res: any) => {
        setLoading(false);
        if (res?.success) {
          setEmpresas(res.empresas || []);
          setTotalVencidas(res.totalVencidas || 0);
          setTotalProximas((res.totalAlertas || 0) - (res.totalVencidas || 0));
        }
      });
    };
    cargar();
    socket.on("alertas:changed", cargar);
    return () => { socket.off("alertas:changed", cargar); };
  }, [socket, anticipacionDias]);

  const cambiarAnticipacion = (dias: number) => {
    localStorage.setItem(STORAGE_KEY, String(dias));
    setAnticipacionDias(dias);
  };

  const recargar = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit("alertas:vencimientos", { anticipacionDias }, (res: any) => {
      setLoading(false);
      if (res?.success) {
        setEmpresas(res.empresas || []);
        setTotalVencidas(res.totalVencidas || 0);
        setTotalProximas((res.totalAlertas || 0) - (res.totalVencidas || 0));
      }
    });
  };

  return { anticipacionDias, cambiarAnticipacion, empresas, totalVencidas, totalProximas, loading, recargar };
}

export function useAlertasBadge(socket: Socket | null) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const cargar = () => {
      socket.emit("alertas:vencimientos", { anticipacionDias: anticipacionGuardada() }, (res: any) => {
        if (res?.success) setTotal(res.totalAlertas || 0);
      });
    };
    cargar();
    socket.on("alertas:changed", cargar);
    return () => { socket.off("alertas:changed", cargar); };
  }, [socket]);

  return total;
}