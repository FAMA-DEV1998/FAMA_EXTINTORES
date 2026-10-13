import { useEffect, useState, useSyncExternalStore } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { SocketSinSenal, type ResumenSinSenal } from "./SocketSinSenal";

const RESUMEN_INICIAL: ResumenSinSenal = {
  listo: false, conectado: false, sincronizando: false, pendientes: 0, fallidas: [], empresasDisponibles: new Set(), catalogos: null,
};

const sinSuscripcion = () => () => {};
const resumenInicial = () => RESUMEN_INICIAL;

export function useSocketSinSenal(real: Socket | null, usuarioId: string) {
  const [envoltura, setEnvoltura] = useState<SocketSinSenal | null>(null);

  useEffect(() => {
    if (!real) return;
    let vigente = true;
    const instancia = new SocketSinSenal(real, usuarioId);
    instancia.alSincronizar((enviados, fallidos) => {
      if (fallidos > 0) toast.error(`${fallidos} cambio${fallidos === 1 ? "" : "s"} guardado${fallidos === 1 ? "" : "s"} sin señal no se pudo enviar. Revísalo en el indicador de arriba.`, { duration: 8000 });
      else toast.success(`Listo: se enviaron ${enviados} cambio${enviados === 1 ? "" : "s"} que guardaste sin señal`);
    });
    instancia.iniciar().then(() => { if (vigente) setEnvoltura(instancia); });
    return () => {
      vigente = false;
      instancia.destruir();
      setEnvoltura(null);
    };
  }, [real, usuarioId]);

  const resumen = useSyncExternalStore(envoltura?.suscribir ?? sinSuscripcion, envoltura?.resumen ?? resumenInicial);

  return { socket: envoltura as unknown as Socket | null, sinSenal: envoltura, resumen };
}
