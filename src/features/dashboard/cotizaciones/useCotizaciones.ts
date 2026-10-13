import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import type { Cotizacion } from "../../../types";
import { confirmar } from "../../../components/ui/Notificaciones";

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

  const archivar = async (id: string) => {
    if (!socket) return;
    const ok = await confirmar({ titulo: "¿Archivar esta cotización?", mensaje: "Podrás restaurarla luego desde Archivados.", textoConfirmar: "Archivar", peligro: true });
    if (!ok) return;
    socket.emit("cotizacion:delete", { id }, (res: any) => {
      if (res?.success === false) toast.error(res?.error || "No se pudo archivar la cotización");
      else toast.success("Cotización archivada");
    });
  };

  const obtenerProximoNumero = (fecha: string, onDone: (numero: string) => void) => {
    if (!socket) return;
    socket.emit("cotizacion:proximoNumero", { fecha }, (res: any) => {
      if (res?.success) onDone(res.numero);
    });
  };

  return { cotizaciones, saving, guardar, archivar, obtenerProximoNumero };
}
