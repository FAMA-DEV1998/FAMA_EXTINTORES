import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";

export type EstadoSolicitud = "nuevo" | "atendido" | "descartado";

export interface SolicitudWeb {
  id: number;
  type: "contacto" | "cotizacion";
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  ruc: string | null;
  subject: string | null;
  message: string | null;
  items: { slug: string; name: string; qty: number }[];
  pageUrl: string | null;
  status: EstadoSolicitud;
  createdAt: string;
}

export function useSolicitudesWeb(socket: Socket | null) {
  const [solicitudes, setSolicitudes] = useState<SolicitudWeb[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit("web:leads:list", {}, (res: any) => {
      setLoading(false);
      if (res?.success) setSolicitudes(res.leads || []);
    });
  };

  useEffect(() => {
    if (!socket) return;
    cargar();
    socket.on("web:leads:changed", cargar);
    return () => { socket.off("web:leads:changed", cargar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const cambiarEstado = (id: number, status: EstadoSolicitud) => {
    if (!socket) return;
    setSolicitudes((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    socket.emit("web:lead:estado", { id, status }, (res: any) => {
      if (!res?.success) {
        toast.error(res?.error || "No se pudo actualizar la solicitud");
        cargar();
      }
    });
  };

  return { solicitudes, loading, cambiarEstado, recargar: cargar };
}

export function useSolicitudesWebBadge(socket: Socket | null) {
  const [nuevos, setNuevos] = useState(0);
  useEffect(() => {
    if (!socket) return;
    const cargar = () => socket.emit("web:leads:count", {}, (res: any) => { if (res?.success) setNuevos(res.nuevos); });
    const onCambio = (d: any) => {
      cargar();
      if (d?.nuevo) toast(`Nueva ${d.nuevo.type === "cotizacion" ? "cotización" : "consulta"} desde la web: ${d.nuevo.name}`, { icon: "🌐", duration: 6000 });
    };
    cargar();
    socket.on("web:leads:changed", onCambio);
    return () => { socket.off("web:leads:changed", onCambio); };
  }, [socket]);
  return nuevos;
}
