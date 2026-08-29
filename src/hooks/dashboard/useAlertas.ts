import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

const STORAGE_KEY = "fama_alertas_anticipacion_dias";

export const ANTICIPACION_OPCIONES = [
  { value: 30, label: "1 mes" },
  { value: 60, label: "2 meses" },
  { value: 90, label: "3 meses" },
  { value: 180, label: "6 meses" },
  { value: 270, label: "9 meses" },
  { value: 360, label: "12 meses" },
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
  const [empresasSilenciadas, setEmpresasSilenciadas] = useState<any[]>([]);
  const [loadingSilenciadas, setLoadingSilenciadas] = useState(false);
  const [extintoresSilenciados, setExtintoresSilenciados] = useState<any[]>([]);
  const [loadingExtintoresSilenciados, setLoadingExtintoresSilenciados] = useState(false);

  const cargarSilenciadas = () => {
    if (!socket) return;
    setLoadingSilenciadas(true);
    socket.emit("alertas:empresasSilenciadas", {}, (res: any) => {
      setLoadingSilenciadas(false);
      if (res?.success) setEmpresasSilenciadas(res.empresas || []);
    });
  };

  const cargarExtintoresSilenciados = () => {
    if (!socket) return;
    setLoadingExtintoresSilenciados(true);
    socket.emit("alertas:extintoresSilenciados", {}, (res: any) => {
      setLoadingExtintoresSilenciados(false);
      if (res?.success) setExtintoresSilenciados(res.extintores || []);
    });
  };

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
    cargarSilenciadas();
    cargarExtintoresSilenciados();
    socket.on("alertas:changed", cargar);
    socket.on("alertas:changed", cargarSilenciadas);
    socket.on("alertas:changed", cargarExtintoresSilenciados);
    return () => {
      socket.off("alertas:changed", cargar);
      socket.off("alertas:changed", cargarSilenciadas);
      socket.off("alertas:changed", cargarExtintoresSilenciados);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const descartarAlerta = (uid: string, motivo: string, onDone?: (ok: boolean) => void) => {
    if (!socket) return;
    socket.emit("alertas:descartar", { uid, descartar: true, motivo }, (res: any) => {
      onDone?.(!!res?.success);
      cargarExtintoresSilenciados();
    });
  };

  const reactivarAlerta = (uid: string, onDone?: (ok: boolean) => void) => {
    if (!socket) return;
    socket.emit("alertas:descartar", { uid, descartar: false }, (res: any) => {
      onDone?.(!!res?.success);
      cargarExtintoresSilenciados();
    });
  };

  const descartarAlertaEmpresa = (empresaId: string, motivo: string, onDone?: (ok: boolean) => void) => {
    if (!socket) return;
    socket.emit("alertas:descartarEmpresa", { empresaId, descartar: true, motivo }, (res: any) => {
      onDone?.(!!res?.success);
      cargarSilenciadas();
    });
  };

  const reactivarAlertaEmpresa = (empresaId: string, onDone?: (ok: boolean) => void) => {
    if (!socket) return;
    socket.emit("alertas:descartarEmpresa", { empresaId, descartar: false }, (res: any) => {
      onDone?.(!!res?.success);
      cargarSilenciadas();
    });
  };

  return {
    anticipacionDias, cambiarAnticipacion, empresas, totalVencidas, totalProximas, loading, recargar,
    descartarAlerta, reactivarAlerta, descartarAlertaEmpresa, reactivarAlertaEmpresa,
    empresasSilenciadas, loadingSilenciadas, extintoresSilenciados, loadingExtintoresSilenciados,
  };
}

export function useAlertasBadge(socket: Socket | null) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const cargar = () => {
      socket.emit("alertas:vencimientos", { anticipacionDias: anticipacionGuardada() }, (res: any) => {
        if (res?.success) {
          const count = (res.empresas || []).reduce(
            (acc: number, emp: any) => acc + emp.sedes.reduce(
              (acc2: number, sede: any) => acc2 + sede.alertas.filter((a: any) => a.revision?.vencido).length,
              0,
            ),
            0,
          );
          setTotal(count);
        }
      });
    };
    cargar();
    socket.on("alertas:changed", cargar);
    return () => { socket.off("alertas:changed", cargar); };
  }, [socket]);

  return total;
}