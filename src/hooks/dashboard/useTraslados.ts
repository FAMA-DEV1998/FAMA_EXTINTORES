import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { TrasladoSede } from "../../types";

export function useTraslados(socket: Socket | null, extintorUid: string | undefined) {
  const [traslados, setTraslados] = useState<TrasladoSede[]>([]);
  const [trasladoModal, setTrasladoModal] = useState(false);
  const [savingTraslado, setSavingTraslado] = useState(false);

  useEffect(() => {
    if (!socket || !extintorUid) return;

    const onList = (payload: { extintorUid: string; list: TrasladoSede[] }) => {
      if (payload.extintorUid === extintorUid) setTraslados(payload.list);
    };
    socket.on("traslado:list", onList);
    socket.emit("traslado:list", { extintorUid });

    return () => { socket.off("traslado:list", onList); };
  }, [socket, extintorUid]);

  const trasladarExtintor = (data: {
    extintorUid: string;
    rowIndex: number;
    empresaId: string;
    sedeOrigenId: string | null;
    sedeDestinoId: string;
    fecha: string;
    motivo?: string;
  }, onDone?: (ok: boolean, error?: string) => void) => {
    if (!socket) return;
    setSavingTraslado(true);
    socket.emit("traslado:create", data, (res: any) => {
      setSavingTraslado(false);
      if (res?.success) setTrasladoModal(false);
      onDone?.(!!res?.success, res?.error);
    });
  };

  return { traslados, trasladoModal, setTrasladoModal, savingTraslado, trasladarExtintor };
}