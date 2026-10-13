import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import type { Sede } from "../types";
import { confirmar } from "../components/ui/Notificaciones";

export function useSedes(socket: Socket | null, empresaId: string | undefined) {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedeModal, setSedeModal] = useState(false);
  const [editingSede, setEditingSede] = useState<Sede | null>(null);
  const [savingSede, setSavingSede] = useState(false);

  useEffect(() => {
    if (!socket || !empresaId) return;

    const onList = (payload: { empresaId: string; list: Sede[] }) => {
      if (payload.empresaId === empresaId) setSedes(payload.list);
    };
    const pedir = () => socket.emit("sede:list", { empresaId });
    socket.on("sede:list", onList);
    socket.on("connect", pedir);
    pedir();

    return () => {
      socket.off("sede:list", onList);
      socket.off("connect", pedir);
    };
  }, [socket, empresaId]);

  const openCreateSede = () => { setEditingSede({ id: "", empresaId: empresaId || "", nombre: "", slug: "" }); setSedeModal(true); };
  const openEditSede = (sede: Sede) => { setEditingSede(sede); setSedeModal(true); };

  const saveSede = () => {
    if (!socket || !editingSede) return;
    setSavingSede(true);
    const esNueva = !editingSede.id;
    socket.emit("sede:save", editingSede, (res: any) => {
      setSavingSede(false);
      if (res?.success) {
        setSedeModal(false);
        setEditingSede(null);
        toast.success(esNueva ? "Sede registrada" : "Sede actualizada");
      } else toast.error(res?.error || "No se pudo guardar la sede");
    });
  };

  const deleteSede = async (id: string, role: string) => {
    if (!socket || !empresaId) return;
    const ok = await confirmar({
      titulo: "¿Eliminar esta sede?",
      mensaje: "Sus extintores no se perderán: pasarán a quedar sin sede asignada.",
      textoConfirmar: "Eliminar sede",
      peligro: true,
    });
    if (!ok) return;
    socket.emit("sede:delete", { id, empresaId, role }, (res: any) => {
      if (res?.success) toast.success("Sede eliminada");
      else toast.error(res?.error || "No se pudo eliminar la sede");
    });
  };

  return { sedes, sedeModal, setSedeModal, editingSede, setEditingSede, savingSede, openCreateSede, openEditSede, saveSede, deleteSede };
}
