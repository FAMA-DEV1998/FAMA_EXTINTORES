import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Copy, Download, FileText, Globe, LoaderCircle, Printer, X } from "lucide-react";
import { consultarCertificadoWeb, enlaceWeb, publicarCertificadoWeb } from "../utils/web";
import { useTeclaEscape } from "../../../hooks/useTeclaEscape";
import CertificadoTemplate from "./CertificadoTemplate";
import CertificadoPreview from "./CertificadoPreview";
import { construirEtiquetaHoja } from "../utils/hojas";
import { type HojaGuardada } from "../types";
import { exportarHojasPdf } from "../../../utils/pdf";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  hojasGuardadas: HojaGuardada[];
  nombreArchivo: string;
  socket?: Socket | null;
  certificadoId?: string | null;
}

export default function CertificadoGuardadoModal({ isOpen, onClose, hojasGuardadas, nombreArchivo, socket, certificadoId }: Props) {
  const [descargando, setDescargando] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [codigoWeb, setCodigoWeb] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  useTeclaEscape(isOpen, onClose);

  useEffect(() => {
    setCodigoWeb(null);
    if (!isOpen || !socket || !certificadoId) return;
    consultarCertificadoWeb(socket, certificadoId).then((c) => setCodigoWeb(c?.codigo ?? null)).catch(() => {});
  }, [isOpen, socket, certificadoId]);

  if (!isOpen || hojasGuardadas.length === 0) return null;

  const handlePublicar = async () => {
    if (!socket || !certificadoId) return;
    setPublicando(true);
    const aviso = toast.loading("Publicando certificado en la web…");
    const codigoAnterior = codigoWeb;
    try {
      const codigo = await publicarCertificadoWeb({
        socket, certificadoId, hojas: hojasGuardadas.map((h) => h.datos),
        containerId: "certificado-historico-print-container", aplicarCodigo: setCodigoWeb,
      });
      setCodigoWeb(codigo);
      toast.success(`Disponible en la web con el código ${codigo}`, { id: aviso, duration: 6000 });
    } catch (err) {
      setCodigoWeb(codigoAnterior);
      toast.error(`No se pudo publicar: ${err instanceof Error ? err.message : "error"}`, { id: aviso });
    } finally {
      setPublicando(false);
    }
  };

  const hojas = hojasGuardadas.map((h) => h.datos);
  const etiquetaHoja = (hoja: typeof hojas[number], i: number) => construirEtiquetaHoja(hoja, hojasGuardadas[i].meta);

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      await exportarHojasPdf("certificado-historico-print-container", nombreArchivo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el certificado");
    } finally {
      setDescargando(false);
    }
  };

  const handleImprimir = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5"><FileText className="w-5 h-5 text-red-500" />Certificado Guardado{hojas.length > 1 ? ` · ${hojas.length} hojas` : ""}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 min-h-0">
          <CertificadoPreview hojas={hojas} activeIndex={activeIndex} onActiveIndexChange={setActiveIndex} etiquetaHoja={etiquetaHoja} codigoWeb={codigoWeb} />
        </div>
        {socket && certificadoId && (
          <div className="px-6 pt-3 flex items-center gap-2 text-xs shrink-0">
            <Globe className={`w-4 h-4 ${codigoWeb ? "text-emerald-400" : "text-zinc-500"}`} />
            {codigoWeb ? (
              <>
                <span className="text-zinc-400">Código web:</span>
                <span className="font-black text-emerald-400 tracking-wide">{codigoWeb}</span>
                <button onClick={() => { navigator.clipboard?.writeText(enlaceWeb(codigoWeb)); toast.success("Enlace de descarga copiado"); }} className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"><Copy className="w-3.5 h-3.5" />Enlace</button>
                <button onClick={handlePublicar} disabled={publicando} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold disabled:opacity-40">{publicando ? "Publicando…" : "Actualizar"}</button>
              </>
            ) : (
              <>
                <span className="text-zinc-500">No publicado en la web</span>
                <button onClick={handlePublicar} disabled={publicando} className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-300 font-bold disabled:opacity-40">{publicando ? "Publicando…" : "Publicar en la web"}</button>
              </>
            )}
          </div>
        )}
        <div className="px-6 py-4 border-t border-zinc-800 flex gap-2 shrink-0">
          <button onClick={handleImprimir} className="flex-1 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-200 transition-all flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" />Imprimir
          </button>
          <button onClick={handleDescargar} disabled={descargando} className="flex-1 px-5 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {descargando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {descargando ? "Generando..." : "Descargar"}
          </button>
        </div>
      </div>

      {createPortal(
        <div id="certificado-historico-print-container" className="fixed -left-750 top-0">
          {hojas.map((hoja, i) => (
            <CertificadoTemplate key={i} datos={hoja} codigoWeb={codigoWeb} />
          ))}
        </div>,
        document.body
      )}
      <style>{"@media print { #root { display: none !important; } #certificado-historico-print-container { position: static !important; left: auto !important; top: auto !important; } .certificado-print-page { break-after: page; page-break-after: always; } @page { size: 210mm 297mm; margin: 0; } }"}</style>
    </div>
  );
}
