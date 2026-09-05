import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export function useServiciosRecientes(socket: Socket | null, limit = 8) {
  const [recientes, setRecientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit("servicio:recientes", { limit }, (res: any) => {
      setLoading(false);
      if (res?.success) setRecientes(res.list || []);
    });
  };

  useEffect(() => {
    if (!socket) return;
    cargar();
    socket.on("servicio:recientesChanged", cargar);
    return () => { socket.off("servicio:recientesChanged", cargar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, limit]);

  return { recientes, loading };
}