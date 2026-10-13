import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import type { Servicio } from "../types";
import { confirmar } from "../components/ui/Notificaciones";

const claveSede = (sedeId?: string | null): string =>
  sedeId === undefined ? "__todas__" : sedeId === null ? "__sin_sede__" : sedeId;

export function useServicios(socket: Socket | null, empresaId: string | undefined, sedeId: string | null | undefined) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [serviciosCargados, setServiciosCargados] = useState(false);
  const [savingServicio, setSavingServicio] = useState(false);

  useEffect(() => {
    setServiciosCargados(false);
    if (!socket || !empresaId) return;

    const onList = (payload: { empresaId: string; filtro: string; list: Servicio[] }) => {
      if (payload.empresaId === empresaId && payload.filtro === claveSede(sedeId)) {
        setServicios(payload.list);
        setServiciosCargados(true);
      }
    };
    const pedir = () => socket.emit("servicio:list", { empresaId, sedeId });
    socket.on("servicio:list", onList);
    socket.on("connect", pedir);
    pedir();

    return () => {
      socket.off("servicio:list", onList);
      socket.off("connect", pedir);
    };
  }, [socket, empresaId, sedeId]);

  const saveServicio = (data: { fechaRetiro: string; fechaEntrega: string; extintorUids?: string[]; notas?: string }, onDone?: (ok: boolean, id?: string, error?: string) => void) => {
    if (!socket || !empresaId) return;
    setSavingServicio(true);
    socket.emit("servicio:save", { empresaId, sedeId, ...data }, (res: any) => {
      setSavingServicio(false);
      if (!res?.success) toast.error(res?.error || "No se pudo registrar el servicio");
      onDone?.(!!res?.success, res?.id, res?.error);
    });
  };

  const deleteServicio = async (id: string, onDone?: () => void) => {
    if (!socket || !empresaId) return;
    const ok = await confirmar({
      titulo: "¿Eliminar este servicio?",
      mensaje: "Se eliminará el registro del historial. Esta acción no se puede deshacer.",
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;
    socket.emit("servicio:delete", { id, empresaId, sedeId }, (res: any) => {
      if (res?.success) {
        toast.success("Servicio eliminado");
        onDone?.();
      } else toast.error(res?.error || "No se pudo eliminar el servicio");
    });
  };

  const updateServicioDatos = (id: string, fechaRetiro: string, fechaEntrega: string, notas?: string) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:updateDatos", { id, fechaRetiro, fechaEntrega, notas, empresaId, sedeId }, (res: any) => {
      if (res?.success) toast.success("Datos del servicio actualizados");
      else toast.error(res?.error || "No se pudieron actualizar los datos");
    });
  };

  const addExtintorToServicio = (servicioId: string, uid: string, onDone?: (ok: boolean, error?: string) => void) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:addExtintor", { id: servicioId, uid, empresaId, sedeId }, (res: any) => {
      onDone?.(!!res?.success, res?.error);
    });
  };

  const removeExtintorDeServicio = (servicioId: string, uid: string) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:removeExtintor", { id: servicioId, uid, empresaId, sedeId }, (res: any) => {
      if (!res?.success) toast.error(res?.error || "No se pudo quitar el extintor");
    });
  };

  const setExtintorEstado = (servicioId: string, uid: string, estado: Record<string, any>) => {
    if (!socket || !empresaId) return;
    socket.emit("servicio:setExtintorEstado", { id: servicioId, uid, estado, empresaId, sedeId });
  };

  return { servicios, serviciosCargados, savingServicio, saveServicio, deleteServicio, updateServicioDatos, addExtintorToServicio, removeExtintorDeServicio, setExtintorEstado };
}

export function useServiciosExtintor(socket: Socket | null, empresaId: string | undefined, uid: string | undefined) {
  const [servicios, setServicios] = useState<Servicio[]>([]);

  useEffect(() => {
    if (!socket || !empresaId || !uid) { setServicios([]); return; }

    const onList = (payload: { empresaId: string; uid: string; list: Servicio[] }) => {
      if (payload.empresaId === empresaId && payload.uid === uid) setServicios(payload.list);
    };
    const pedir = () => socket.emit("servicio:listByExtintor", { empresaId, uid });
    socket.on("servicio:listByExtintor", onList);
    socket.on("connect", pedir);
    pedir();

    return () => {
      socket.off("servicio:listByExtintor", onList);
      socket.off("connect", pedir);
    };
  }, [socket, empresaId, uid]);

  return { servicios };
}
