import { useState } from "react";
import { createPortal } from "react-dom";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { Globe, LoaderCircle } from "lucide-react";
import { confirmar } from "../../../components/ui/Notificaciones";
import { publicarCertificadoWeb } from "../utils/web";
import { normalizarHojasGuardadas } from "../utils/hojas";
import type { CertificadoDatos } from "../types";
import CertificadoTemplate from "./CertificadoTemplate";

const CONTENEDOR = "certificado-lote-print-container";

interface Props {
  socket: Socket | null;
  pendientes: { id: string; datos: string }[];
}

export default function PublicarPendientes({ socket, pendientes }: Props) {
  const [hojas, setHojas] = useState<CertificadoDatos[]>([]);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<{ hecho: number; total: number } | null>(null);

  if (!pendientes.length && !progreso) return null;

  const publicarTodos = async () => {
    if (!socket || progreso) return;
    const lista = [...pendientes];
    const ok = await confirmar({
      titulo: `¿Publicar ${lista.length} certificado${lista.length === 1 ? "" : "s"} pendiente${lista.length === 1 ? "" : "s"}?`,
      mensaje: "Se generará el PDF de cada uno y quedará disponible en la web y en el QR de sus extintores. Puede tardar unos minutos: no cierres esta pantalla.",
      textoConfirmar: "Publicar",
    });
    if (!ok) return;
    let fallidos = 0;
    for (let i = 0; i < lista.length; i++) {
      setProgreso({ hecho: i, total: lista.length });
      const datos = normalizarHojasGuardadas(lista[i].datos).map((h) => h.datos);
      if (!datos.length) {
        fallidos++;
        continue;
      }
      setCodigo(null);
      setHojas(datos);
      try {
        await publicarCertificadoWeb({ socket, certificadoId: lista[i].id, hojas: datos, containerId: CONTENEDOR, aplicarCodigo: setCodigo });
      } catch {
        fallidos++;
      }
    }
    setProgreso(null);
    setHojas([]);
    if (fallidos) toast.error(`Se publicaron ${lista.length - fallidos} de ${lista.length}. Abre los que faltan y usa «Publicar».`, { duration: 8000 });
    else toast.success(`${lista.length} certificado${lista.length === 1 ? "" : "s"} publicado${lista.length === 1 ? "" : "s"} en la web`);
  };

  return (
    <>
      <button
        onClick={publicarTodos}
        disabled={!!progreso || !socket}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-800/60 text-emerald-300 text-xs font-bold disabled:opacity-60"
      >
        {progreso ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
        {progreso ? `Publicando ${progreso.hecho + 1} de ${progreso.total}…` : `Publicar pendientes (${pendientes.length})`}
      </button>
      {hojas.length > 0 && createPortal(
        <div id={CONTENEDOR} className="fixed -left-750 top-0">
          {hojas.map((hoja, i) => <CertificadoTemplate key={i} datos={hoja} codigoWeb={codigo} />)}
        </div>,
        document.body,
      )}
    </>
  );
}
