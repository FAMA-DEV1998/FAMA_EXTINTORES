import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export function useCertificados(socket: Socket | null, empresaId: string | undefined, sedeId: string | null) {
  const [certificados, setCertificados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = () => {
    if (!socket || !empresaId) return;
    setLoading(true);
    socket.emit("certificados:list", { empresaId, sedeId }, (res: any) => {
      setLoading(false);
      if (res?.success) setCertificados(res.certificados || []);
    });
  };

  useEffect(() => {
    if (!socket || !empresaId) return;
    cargar();
    socket.on("certificados:changed", cargar);
    return () => { socket.off("certificados:changed", cargar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, empresaId, sedeId]);

  const eliminar = (id: string, onDone?: (ok: boolean) => void) => {
    if (!socket || !empresaId) return;
    socket.emit("certificados:eliminar", { id, empresaId }, (res: any) => {
      onDone?.(!!res?.success);
    });
  };

  return { certificados, loading, recargar: cargar, eliminar };
}