import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Cotizacion } from "../../types";

export function useCotizaciones(socket: Socket | null) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onList = (list: Cotizacion[]) => setCotizaciones(list);
    socket.on("cotizacion:list", onList);
    socket.emit("cotizacion:list");

    return () => { socket.off("cotizacion:list", onList); };
  }, [socket]);

  const guardar = (data: Cotizacion, onDone?: (ok: boolean, error?: string, numero?: string, id?: string) => void) => {
    if (!socket) return;
    setSaving(true);
    socket.emit("cotizacion:save", data, (res: any) => {
      setSaving(false);
      onDone?.(!!res?.success, res?.error, res?.numero, res?.id);
    });
  };

  const archivar = (id: string) => {
    if (!socket || !confirm("¿Archivar esta cotización? Podrás restaurarla luego desde Archivados.")) return;
    socket.emit("cotizacion:delete", { id });
  };

  const obtenerProximoNumero = (fecha: string, onDone: (numero: string) => void) => {
    if (!socket) return;
    socket.emit("cotizacion:proximoNumero", { fecha }, (res: any) => {
      if (res?.success) onDone(res.numero);
    });
  };

  return { cotizaciones, saving, guardar, archivar, obtenerProximoNumero };
}