import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export type DatosDirectorio = { extintores: number; ultimoServicio: string | null; areas: string[] };

const CLAVE = "fama_directorio_empresas";
const EVENTOS = ["empresa:list", "servicio:recientesChanged", "extintor:updated", "fusion:changed"];

const leerCache = (): Record<string, DatosDirectorio> => {
  try { return JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch { return {}; }
};

export function useDirectorioEmpresas(socket: Socket | null, conectado: boolean) {
  const [directorio, setDirectorio] = useState<Record<string, DatosDirectorio>>(leerCache);

  useEffect(() => {
    if (!socket || !conectado) return;
    let pendiente: ReturnType<typeof setTimeout> | null = null;
    const cargar = () => {
      socket.emit("empresas:directorio", {}, (res: any) => {
        if (!res?.success) return;
        setDirectorio(res.directorio || {});
        try { localStorage.setItem(CLAVE, JSON.stringify(res.directorio || {})); } catch { /* sin almacenamiento */ }
      });
    };
    const conPausa = () => {
      if (pendiente) clearTimeout(pendiente);
      pendiente = setTimeout(cargar, 1500);
    };
    cargar();
    EVENTOS.forEach((ev) => socket.on(ev, conPausa));
    return () => {
      if (pendiente) clearTimeout(pendiente);
      EVENTOS.forEach((ev) => socket.off(ev, conPausa));
    };
  }, [socket, conectado]);

  return directorio;
}
