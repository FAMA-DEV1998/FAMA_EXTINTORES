import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";

export function useFusionServicios(socket: Socket | null, empresaId: string | undefined) {
  const [preview, setPreview] = useState<any | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [historial, setHistorial] = useState<any[]>([]);

  const cargarPreview = (servicioDestinoId: string, servicioIds: string[], onDone?: (ok: boolean, error?: string) => void) => {
    if (!socket || !empresaId) return;
    setCargandoPreview(true);
    socket.emit("fusion:servicios:preview", { empresaId, servicioDestinoId, servicioIds }, (res: any) => {
      setCargandoPreview(false);
      setPreview(res?.success ? res.preview : null);
      onDone?.(!!res?.success, res?.error);
    });
  };

  const ejecutar = (payload: { servicioDestinoId: string; servicioIds: string[]; elecciones: Record<string, string> }, onDone?: (ok: boolean, logId?: string, error?: string) => void) => {
    if (!socket || !empresaId) return;
    setEjecutando(true);
    socket.emit("fusion:servicios:ejecutar", { empresaId, ejecutadoPor: "dashboard", ...payload }, (res: any) => {
      setEjecutando(false);
      onDone?.(!!res?.success, res?.logId, res?.error);
    });
  };

  const revertir = (logId: string, onDone?: (ok: boolean, error?: string) => void) => {
    if (!socket) return;
    socket.emit("fusion:servicios:revertir", { logId }, (res: any) => {
      if (res?.success) toast.success("Unificación revertida");
      else toast.error(res?.error || "No se pudo revertir la unificación");
      onDone?.(!!res?.success, res?.error);
    });
  };

  const cargarHistorial = () => {
    if (!socket || !empresaId) return;
    socket.emit("fusion:servicios:historial", { empresaId }, (res: any) => {
      if (res?.success) setHistorial(res.historial || []);
    });
  };

  useEffect(() => {
    if (!socket || !empresaId) return;
    cargarHistorial();
    const onChanged = (payload: { empresaId: string }) => {
      if (payload?.empresaId === empresaId) cargarHistorial();
    };
    socket.on("fusion:servicios:changed", onChanged);
    return () => { socket.off("fusion:servicios:changed", onChanged); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, empresaId]);

  const limpiarPreview = () => setPreview(null);

  return { preview, cargandoPreview, cargarPreview, limpiarPreview, ejecutando, ejecutar, revertir, historial };
}
