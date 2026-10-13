import { useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { confirmar } from "../../../components/ui/Notificaciones";

const nombreArchivo = () => `fama-respaldo-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-")}.json`;

export function useRespaldo(socket: Socket | null) {
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    if (!socket || descargando) return;
    const ok = await confirmar({
      titulo: "¿Descargar respaldo completo?",
      mensaje: "Se generará un archivo con todas las empresas, extintores, servicios, fotos, certificados y configuraciones. Guárdalo en un lugar seguro: contiene información de tus clientes.",
      textoConfirmar: "Descargar",
    });
    if (!ok) return;
    setDescargando(true);
    const aviso = toast.loading("Preparando respaldo… puede tardar si hay muchas fotos");
    socket.timeout(5 * 60 * 1000).emit("respaldo:descargar", {}, (err: Error | null, res: any) => {
      setDescargando(false);
      if (err || !res?.success) {
        toast.error(res?.error || "No se pudo generar el respaldo", { id: aviso });
        return;
      }
      const blob = new Blob([JSON.stringify(res.respaldo)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo();
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Respaldo descargado", { id: aviso });
    });
  };

  return { descargar, descargando };
}
