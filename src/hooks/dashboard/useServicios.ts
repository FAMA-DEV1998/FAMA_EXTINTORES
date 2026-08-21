import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Servicio } from "../../types";

export function useServicios(socket: Socket | null, empresaId: string | undefined, sedeId: string | null) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioModal, setServicioModal] = useState(false);
  const [savingServicio, setSavingServicio] = useState(false);

  useEffect(() => {
    if (!socket || !empresaId) return;

    const onList = (payload: { empresaId: string; sedeId: string | null; list: Servicio[] }) => {
      if (payload.empresaId === empresaId && payload.sedeId === sedeId) setServicios(payload.list);
    };
    socket.on("servicio:list", onList);
    socket.emit("servicio:list", { empresaId, sedeId });

    return () => { socket.off("servicio:list", onList); };
  }, [socket, empresaId, sedeId]);

  const saveServicio = (data: { fechaRetiro: string; fechaEntrega: string; extintorUids: string[]; notas?: string }) => {
    if (!socket || !empresaId) return;
    setSavingServicio(true);
    socket.emit("servicio:save", { empresaId, sedeId, ...data }, (res: any) => {
      setSavingServicio(false);
      if (res?.success) setServicioModal(false);
      else alert(res?.error || "No se pudo registrar el servicio");
    });
  };

  const deleteServicio = (id: string) => {
    if (!socket || !empresaId || !confirm("¿Eliminar este registro del historial?")) return;
    socket.emit("servicio:delete", { id, empresaId, sedeId });
  };

  const addExtintorToServicio = (servicioId: string, uid: string) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:addExtintor", { id: servicioId, uid, empresaId, sedeId });
  };

  const setExtintorEstado = (servicioId: string, uid: string, estado: Record<string, any>) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:setExtintorEstado", { id: servicioId, uid, estado, empresaId, sedeId });
  };

  return { servicios, servicioModal, setServicioModal, savingServicio, saveServicio, deleteServicio, addExtintorToServicio, setExtintorEstado };
}