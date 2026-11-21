import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export type ResumenEmpresa = { extintores: number; sedes: number; ultimoServicio: string | null; servicios: number; vencidos: number; proximos: number };
export type DuplicadoPorExtintores = { a: string; b: string; compartidos: number; series: string[] };
export type SedePorObservacion = { uid: string; rowIndex: number; empresaId: string; nSerie: string; nInterno: string; observaciones: string; sedeActualId: string | null; sedeActual: string; sedeSugeridaId: string; sedeSugerida: string };
export type ResumenEmpresas = { porEmpresa: Record<string, ResumenEmpresa>; diasProximos: number; duplicadosPorExtintores: DuplicadoPorExtintores[]; sedesPorObservacion: SedePorObservacion[] };

const EVENTOS = ["alertas:changed", "servicio:recientesChanged", "empresa:list", "extintor:updated", "sede:list", "fusion:changed", "traslado:list"];

export function useResumenEmpresas(socket: Socket | null) {
  const [resumen, setResumen] = useState<ResumenEmpresas | null>(null);

  useEffect(() => {
    if (!socket) return;
    let pendiente: ReturnType<typeof setTimeout> | null = null;
    const cargar = () => {
      socket.emit("empresas:resumen", {}, (res: any) => {
        if (res?.success) setResumen({ porEmpresa: res.porEmpresa || {}, diasProximos: res.diasProximos || 90, duplicadosPorExtintores: res.duplicadosPorExtintores || [], sedesPorObservacion: res.sedesPorObservacion || [] });
      });
    };
    const cargarConPausa = () => {
      if (pendiente) clearTimeout(pendiente);
      pendiente = setTimeout(cargar, 800);
    };
    cargar();
    socket.on("connect", cargar);
    EVENTOS.forEach((ev) => socket.on(ev, cargarConPausa));
    return () => {
      if (pendiente) clearTimeout(pendiente);
      socket.off("connect", cargar);
      EVENTOS.forEach((ev) => socket.off(ev, cargarConPausa));
    };
  }, [socket]);

  return resumen;
}
