import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export interface VozCorreccionRow {
  id: number;
  tipo: string;
  clave: string;
  valor: string;
  usos: number;
  vecesCorregido: number;
  updatedAt: string;
}

export function useVozAprendizaje(socket: Socket | null, role: string) {
  const [lista, setLista] = useState<VozCorreccionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit("voz:correcciones:listDetalle", { role }, (res: any) => {
      setLoading(false);
      if (res?.success) setLista(res.lista || []);
    });
  };

  useEffect(() => {
    cargar();
    if (!socket) return;
    socket.on("voz:correcciones:updated", cargar);
    return () => { socket.off("voz:correcciones:updated", cargar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const actualizarValor = (id: number, valor: string, onDone?: (ok: boolean) => void) => {
    if (!socket) return;
    setSaving(true);
    socket.emit("voz:correcciones:update", { role, id, valor }, (res: any) => {
      setSaving(false);
      if (res?.success) setLista(res.lista || []);
      onDone?.(!!res?.success);
    });
  };

  const eliminar = (id: number, onDone?: (ok: boolean) => void) => {
    if (!socket) return;
    setSaving(true);
    socket.emit("voz:correcciones:delete", { role, id }, (res: any) => {
      setSaving(false);
      if (res?.success) setLista(res.lista || []);
      onDone?.(!!res?.success);
    });
  };

  const crear = (tipo: string, clave: string, valor: string, onDone?: (ok: boolean) => void) => {
    if (!socket) return;
    setSaving(true);
    socket.emit("voz:correcciones:create", { role, tipo, clave, valor }, (res: any) => {
      setSaving(false);
      if (res?.success) setLista(res.lista || []);
      onDone?.(!!res?.success);
    });
  };

  return { lista, loading, saving, cargar, actualizarValor, eliminar, crear };
}