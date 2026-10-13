import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export type EmpresaResumen = { id: string; slug: string; razonSocial: string; ultimoServicio?: string | null; extintores?: number; cantidad?: number };

export type Resumen = {
  empresas: number;
  extintores: number;
  deBaja: number;
  serviciosMes: number;
  serviciosMesAnterior: number;
  extintoresAtendidosMes: number;
  ultimos6Meses: { mes: string; servicios: number }[];
  vencidos: number;
  porVencer: number;
  incompletos: number;
  empresasConIncompletos: EmpresaResumen[];
  empresasSinServicioReciente: EmpresaResumen[];
  totalEmpresasSinServicioReciente: number;
};

const EVENTOS_QUE_CAMBIAN_RESUMEN = ["alertas:changed", "servicio:recientesChanged", "empresa:list", "extintor:updated"];

export function useResumen(socket: Socket | null) {
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    if (!socket) return;
    let pendiente: ReturnType<typeof setTimeout> | null = null;
    const cargar = () => {
      socket.emit("resumen:get", {}, (res: any) => {
        if (res?.success) setResumen(res.resumen);
      });
    };
    const cargarConPausa = () => {
      if (pendiente) clearTimeout(pendiente);
      pendiente = setTimeout(cargar, 800);
    };
    cargar();
    socket.on("connect", cargar);
    EVENTOS_QUE_CAMBIAN_RESUMEN.forEach((ev) => socket.on(ev, cargarConPausa));
    return () => {
      if (pendiente) clearTimeout(pendiente);
      socket.off("connect", cargar);
      EVENTOS_QUE_CAMBIAN_RESUMEN.forEach((ev) => socket.off(ev, cargarConPausa));
    };
  }, [socket]);

  return resumen;
}
