import { useState } from "react";
import { createPortal } from "react-dom";
import CertificadoTemplate from "../certificados/CertificadoTemplate";
import CertificadoPreview from "../certificados/CertificadoPreview";
import { construirEtiquetaHoja, type HojaGuardada } from "../../utils/certificadoHojas";
import { exportarHojasPdf } from "../../utils/exportarPdf";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  hojasGuardadas: HojaGuardada[];
  nombreArchivo: string;
}

export default function VerCertificadoModal({ isOpen, onClose, hojasGuardadas, nombreArchivo }: Props) {
  const [descargando, setDescargando] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  if (!isOpen || hojasGuardadas.length === 0) return null;

  const hojas = hojasGuardadas.map((h) => h.datos);
  const idsImpresion = hojas.map((_, i) => `certificado-historico-print-hoja-${i}`);
  const etiquetaHoja = (hoja: typeof hojas[number], i: number) => construirEtiquetaHoja(hoja, hojasGuardadas[i].meta);

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      await exportarHojasPdf(idsImpresion, nombreArchivo);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo generar el certificado");
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
          <h3 className="text-lg font-bold text-white">📄 Certificado Guardado{hojas.length > 1 ? ` · ${hojas.length} hojas` : ""}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
        </div>
        <div className="flex-1 min-h-0">
          <CertificadoPreview hojas={hojas} activeIndex={activeIndex} onActiveIndexChange={setActiveIndex} etiquetaHoja={etiquetaHoja} />
        </div>
        <div className="px-6 py-4 border-t border-zinc-800 flex gap-2 shrink-0">
          <button onClick={handleImprimir} className="flex-1 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-200 transition-all">
            🖨️ Imprimir
          </button>
          <button onClick={handleDescargar} disabled={descargando} className="flex-1 px-5 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-all">
            {descargando ? "Generando..." : "📥 Descargar"}
          </button>
        </div>
      </div>

      {createPortal(
        <div id="certificado-historico-print-container" className="fixed -left-750 top-0">
          {hojas.map((hoja, i) => (
            <div key={i} className="certificado-print-page">
              <CertificadoTemplate datos={hoja} id={idsImpresion[i]} />
            </div>
          ))}
        </div>,
        document.body
      )}
      <style>{"@media print { #root { display: none !important; } #certificado-historico-print-container { position: static !important; left: auto !important; top: auto !important; } .certificado-print-page { break-after: page; page-break-after: always; } .certificado-print-page:last-child { break-after: auto; page-break-after: auto; } @page { size: 210mm 297mm; margin: 0; } }"}</style>
    </div>
  );
}