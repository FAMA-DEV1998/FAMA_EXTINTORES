import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Servicio } from "../../types";

const claveSede = (sedeId?: string | null): string =>
  sedeId === undefined ? "__todas__" : sedeId === null ? "__sin_sede__" : sedeId;

export function useServicios(socket: Socket | null, empresaId: string | undefined, sedeId: string | null | undefined) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioModal, setServicioModal] = useState(false);
  const [savingServicio, setSavingServicio] = useState(false);

  useEffect(() => {
    if (!socket || !empresaId) return;

    const onList = (payload: { empresaId: string; filtro: string; list: Servicio[] }) => {
      if (payload.empresaId === empresaId && payload.filtro === claveSede(sedeId)) setServicios(payload.list);
    };
    socket.on("servicio:list", onList);
    socket.emit("servicio:list", { empresaId, sedeId });

    return () => { socket.off("servicio:list", onList); };
  }, [socket, empresaId, sedeId]);

  const saveServicio = (data: { fechaRetiro: string; fechaEntrega: string; extintorUids?: string[]; notas?: string }, onDone?: (ok: boolean, id?: string, error?: string) => void) => {
    if (!socket || !empresaId) return;
    setSavingServicio(true);
    socket.emit("servicio:save", { empresaId, sedeId, ...data }, (res: any) => {
      setSavingServicio(false);
      if (res?.success) setServicioModal(false);
      else alert(res?.error || "No se pudo registrar el servicio");
      onDone?.(!!res?.success, res?.id, res?.error);
    });
  };

  const deleteServicio = (id: string) => {
    if (!socket || !empresaId || !confirm("¿Eliminar este registro del historial?")) return;
    socket.emit("servicio:delete", { id, empresaId, sedeId });
  };

  const updateServicioDatos = (id: string, fechaRetiro: string, fechaEntrega: string, notas?: string) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:updateDatos", { id, fechaRetiro, fechaEntrega, notas, empresaId, sedeId });
  };

  const addExtintorToServicio = (servicioId: string, uid: string, onDone?: (ok: boolean, error?: string) => void) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:addExtintor", { id: servicioId, uid, empresaId, sedeId }, (res: any) => {
      onDone?.(!!res?.success, res?.error);
    });
  };

  const removeExtintorDeServicio = (servicioId: string, uid: string) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:removeExtintor", { id: servicioId, uid, empresaId, sedeId });
  };

  const setExtintorEstado = (servicioId: string, uid: string, estado: Record<string, any>) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:setExtintorEstado", { id: servicioId, uid, estado, empresaId, sedeId });
  };

  return { servicios, servicioModal, setServicioModal, savingServicio, saveServicio, deleteServicio, updateServicioDatos, addExtintorToServicio, removeExtintorDeServicio, setExtintorEstado };
}

export function useServiciosExtintor(socket: Socket | null, empresaId: string | undefined, uid: string | undefined) {
  const [servicios, setServicios] = useState<Servicio[]>([]);

  useEffect(() => {
    if (!socket || !empresaId || !uid) { setServicios([]); return; }

    const onList = (payload: { empresaId: string; uid: string; list: Servicio[] }) => {
      if (payload.empresaId === empresaId && payload.uid === uid) setServicios(payload.list);
    };
    socket.on("servicio:listByExtintor", onList);
    socket.emit("servicio:listByExtintor", { empresaId, uid });

    return () => { socket.off("servicio:listByExtintor", onList); };
  }, [socket, empresaId, uid]);

  return { servicios };
}