import { useEffect, useRef, useState } from "react";
import CertificadoTemplate from "../certificados/CertificadoTemplate";
import type { CertificadoDatos, TipoCertificado, TipoIdentificacion } from "../certificados/CertificadoTemplate";
import { FAMILIA_FILTRO_LABEL, type FamiliaAgente } from "../../hooks/dashboard/useCertificado";
import { MESES } from "../../constants";
import { exportarElementoPdf } from "../../utils/exportarPdf";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  datos: CertificadoDatos;
  onChange: (cambios: Partial<CertificadoDatos>) => void;
  filtroAgente: "todos" | FamiliaAgente;
  onCambiarFiltroAgente: (filtro: "todos" | FamiliaAgente) => void;
  onCambiarTipoCertificado: (tipo: TipoCertificado) => void;
  onCambiarTipoIdentificacion: (tipo: TipoIdentificacion) => void;
  familiasDisponibles: FamiliaAgente[];
  nombreArchivo: string;
}

const A4_WIDTH_PX = 210 * 3.7795275591;
const A4_HEIGHT_PX = 297 * 3.7795275591;

const inputCls = "bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-600";
const labelCls = "text-xs font-bold text-zinc-400 uppercase";

const formatPlaca = (raw: string) => {
  const limpio = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return limpio.length <= 3 ? limpio : `${limpio.slice(0, 3)}-${limpio.slice(3)}`;
};

export default function CertificadoModal({
  isOpen, onClose, datos, onChange, filtroAgente, onCambiarFiltroAgente,
  onCambiarTipoCertificado, onCambiarTipoIdentificacion, familiasDisponibles, nombreArchivo,
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [baseScale, setBaseScale] = useState(0.4);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (!previewRef.current || !isOpen) return;
    const medir = () => {
      const ancho = previewRef.current?.clientWidth || 0;
      if (ancho > 0) setBaseScale(Math.max(0.2, (ancho - 32) / A4_WIDTH_PX));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(previewRef.current);
    return () => obs.disconnect();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      await exportarElementoPdf("certificado-print", nombreArchivo);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo generar el certificado");
    } finally {
      setDescargando(false);
    }
  };

  const esPlaca = datos.tipoIdentificacion === "placa";
  const esRuc = datos.tipoIdentificacion === "ruc";
  const esDni = datos.tipoIdentificacion === "dni";
  const labelNumero = esRuc ? "RUC" : esDni ? "DNI" : "Placa";
  const numeroInvalido = (esRuc && datos.numeroIdentificacion.length > 0 && datos.numeroIdentificacion.length !== 11)
    || (esDni && datos.numeroIdentificacion.length > 0 && datos.numeroIdentificacion.length !== 8)
    || (esPlaca && datos.numeroIdentificacion.replace("-", "").length > 0 && datos.numeroIdentificacion.replace("-", "").length !== 6);
  const dniAdicionalInvalido = esPlaca && datos.dniAdicional.length > 0 && datos.dniAdicional.length !== 8;

  const handleNumeroChange = (valor: string) => {
    if (esRuc) return onChange({ numeroIdentificacion: valor.replace(/\D/g, "").slice(0, 11) });
    if (esDni) return onChange({ numeroIdentificacion: valor.replace(/\D/g, "").slice(0, 8) });
    return onChange({ numeroIdentificacion: formatPlaca(valor) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <style>{"@media print { body * { visibility: hidden; } #certificado-print, #certificado-print * { visibility: visible; } #certificado-print { position: fixed; left: 0; top: 0; width: 210mm; } }"}</style>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-400 max-h-[92vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">📄 Descargar Certificado</h3>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">Edita los datos y previsualiza el resultado final</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[440px_1fr]">
          <div className="overflow-y-auto p-6 flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-zinc-800/60">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Tipo de certificado</label>
              <select value={datos.tipoCertificado} onChange={(e) => onCambiarTipoCertificado(e.target.value as TipoCertificado)} className={inputCls}>
                <option value="garantia">Garantía y Operatividad + Vigencia PH</option>
                <option value="ph">Prueba Hidrostática de Extintores Portátiles</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Extintores a incluir</label>
              <select value={filtroAgente} onChange={(e) => onCambiarFiltroAgente(e.target.value as "todos" | FamiliaAgente)} className={inputCls}>
                <option value="todos">Todos los extintores</option>
                {familiasDisponibles.map((f) => (
                  <option key={f} value={f}>Solo {FAMILIA_FILTRO_LABEL[f]}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Nombre / Razón Social</label>
              <input value={datos.nombre} onChange={(e) => onChange({ nombre: e.target.value })} className={inputCls} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Tipo de documento</label>
              <select value={datos.tipoIdentificacion} onChange={(e) => onCambiarTipoIdentificacion(e.target.value as TipoIdentificacion)} className={inputCls}>
                <option value="ruc">RUC</option>
                <option value="dni">DNI</option>
                <option value="placa">Placa vehicular</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Número de {labelNumero}</label>
              <input
                value={datos.numeroIdentificacion}
                onChange={(e) => handleNumeroChange(e.target.value)}
                placeholder={esPlaca ? "A13-54C" : esRuc ? "11 dígitos" : esDni ? "8 dígitos" : ""}
                inputMode={esPlaca ? "text" : "numeric"}
                className={`${inputCls} ${numeroInvalido ? "border-amber-600" : ""}`}
              />
              {numeroInvalido && (
                <p className="text-[11px] font-bold text-amber-500">
                  ⚠️ {esRuc ? "El RUC debe tener 11 dígitos" : esDni ? "El DNI debe tener 8 dígitos" : "La placa debe tener 6 caracteres (ej. A13-54C)"}
                </p>
              )}
            </div>

            {esPlaca && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>DNI (opcional)</label>
                <input
                  value={datos.dniAdicional}
                  onChange={(e) => onChange({ dniAdicional: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                  inputMode="numeric"
                  className={`${inputCls} ${dniAdicionalInvalido ? "border-amber-600" : ""}`}
                />
                {dniAdicionalInvalido && <p className="text-[11px] font-bold text-amber-500">⚠️ El DNI debe tener 8 dígitos</p>}
              </div>
            )}

            {!esPlaca && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Ubicación</label>
                <input value={datos.ubicacion} onChange={(e) => onChange({ ubicacion: e.target.value })} className={inputCls} />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Fecha del certificado</label>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Día</label>
                  <input type="number" min={1} max={31} value={datos.diaFecha} onChange={(e) => onChange({ diaFecha: String(Math.min(31, Math.max(1, parseInt(e.target.value) || 1))) })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Mes</label>
                  <select value={datos.mesFecha} onChange={(e) => onChange({ mesFecha: e.target.value })} className={inputCls}>
                    {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Año</label>
                  <input value={datos.anioFecha} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Extintores incluidos</label>
              <p className="text-xs text-zinc-400 bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-3.5 py-2.5">
                {datos.items.length === 0 ? "Ningún extintor cumple con el filtro seleccionado" : `${datos.items.length} extintor${datos.items.length === 1 ? "" : "es"} · ${datos.agentesTexto}`}
              </p>
            </div>

            <div className="mt-auto flex gap-2">
              <button onClick={() => window.print()} className="flex-1 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-200 transition-all">
                🖨️ Imprimir
              </button>
              <button onClick={handleDescargar} disabled={descargando} className="flex-1 px-5 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-all">
                {descargando ? "Generando..." : "📥 Descargar"}
              </button>
            </div>
          </div>

          <div ref={previewRef} className="overflow-auto bg-zinc-950 p-4">
            <div style={{ width: A4_WIDTH_PX * baseScale, height: A4_HEIGHT_PX * baseScale, margin: "0 auto" }}>
              <div style={{ width: "210mm", transform: `scale(${baseScale})`, transformOrigin: "top left" }}>
                <CertificadoTemplate datos={datos} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="certificado-print" className="fixed -left-2500 top-0">
        <CertificadoTemplate datos={datos} />
      </div>
    </div>
  );
}