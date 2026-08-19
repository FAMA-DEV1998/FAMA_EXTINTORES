import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Sede } from "../../types";

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
    socket.on("sede:list", onList);
    socket.emit("sede:list", { empresaId });

    return () => { socket.off("sede:list", onList); };
  }, [socket, empresaId]);

  const openCreateSede = () => { setEditingSede({ id: "", empresaId: empresaId || "", nombre: "", slug: "" }); setSedeModal(true); };
  const openEditSede = (sede: Sede) => { setEditingSede(sede); setSedeModal(true); };

  const saveSede = () => {
    if (!socket || !editingSede) return;
    setSavingSede(true);
    socket.emit("sede:save", editingSede, (res: any) => {
      setSavingSede(false);
      if (res?.success) setSedeModal(false);
    });
  };

  const deleteSede = (id: string, role: string) => {
    if (!socket || !empresaId || !confirm("¿Eliminar esta sede? Sus extintores no se perderán: pasarán a quedar sin sede asignada.")) return;
    socket.emit("sede:delete", { id, empresaId, role });
  };

  return { sedes, sedeModal, setSedeModal, editingSede, setEditingSede, savingSede, openCreateSede, openEditSede, saveSede, deleteSede };
}