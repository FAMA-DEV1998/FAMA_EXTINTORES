import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CertificadoTemplate from "../certificados/CertificadoTemplate";
import type { CertificadoDatos, Denominacion, TipoCertificado, TipoIdentificacion } from "../certificados/CertificadoTemplate";
import { PQS_TIPO_LABEL, PQS_VARIANTES_75, PQS_VARIANTES_90, ESTADO_NUEVO_VENTA, type PqsVariante, type AccionTrabajo } from "../../hooks/dashboard/useCertificado";
import { MESES, DISTRITOS_LIMA, ETIQUETAS_ADICIONALES_DISPONIBLES } from "../../constants";
import { exportarElementoPdf } from "../../utils/exportarPdf";
import { ModalSection, ModalField, modalInput } from "../ui/ModalUI";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  datos: CertificadoDatos;
  onChange: (cambios: Partial<CertificadoDatos>) => void;
  filtroAgente: string;
  onCambiarFiltroAgente: (filtro: string) => void;
  filtroEstado: string;
  onCambiarFiltroEstado: (filtro: string) => void;
  estadosDisponibles: string[];
  onCambiarTipoCertificado: (tipo: TipoCertificado) => void;
  onCambiarTipoIdentificacion: (tipo: TipoIdentificacion) => void;
  onCambiarDenominacion: (denominacion: Denominacion) => void;
  onActualizarRating: (uid: string, valor: string) => void;
  onCambiarColumna: (columna: "item" | "nInterno" | "marca" | "tipoServicio" | "rating", valor: boolean) => void;
  onCambiarAccionTrabajo: (accion: AccionTrabajo, valor: boolean) => void;
  familiasDisponibles: { key: string; label: string }[];
  hayPqs: boolean;
  pqsVariante: PqsVariante;
  onCambiarPqsVariante: (variante: PqsVariante) => void;
  nombreArchivo: string;
  soloImprimir?: boolean;
}

const A4_WIDTH_PX = 210 * 3.7795275591;
const A4_HEIGHT_PX = 297 * 3.7795275591;

const formatPlaca = (raw: string) => {
  const limpio = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return limpio.length <= 3 ? limpio : `${limpio.slice(0, 3)}-${limpio.slice(3)}`;
};

// const COLUMNAS_FIJAS = [
//   "Serie", "Tipo Extintor", "Cap.", "Prueba de Estanqueidad y Fuga",
//   "Vencimiento Recarga", "Año de Fabr.", "Vencimiento Prueba Hidrostática", "Condición Extintor",
// ];

const COLUMNAS_OPCIONALES: { key: "item" | "nInterno" | "marca" | "rating" | "tipoServicio"; label: string; ayuda: string }[] = [
  { key: "item", label: "Ítem", ayuda: "Numeración de fila" },
  { key: "nInterno", label: "N° Interno", ayuda: "Va después de Serie" },
  { key: "marca", label: "Marca / Procedencia", ayuda: "Va después de N° Interno" },
  { key: "rating", label: "Rating", ayuda: "Va después de Capacidad" },
  { key: "tipoServicio", label: "Tipo de Servicio", ayuda: "Va antes de Condición" },
];

const ACCIONES_TRABAJO: { key: AccionTrabajo; label: string }[] = [
  { key: "venta", label: "Venta" },
  { key: "recarga", label: "Recarga" },
  { key: "mantenimiento", label: "Mantenimiento" },
];

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="grid gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2 py-2 rounded-lg text-[11px] font-bold leading-tight transition-all ${value === opt.value ? "bg-red-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ColumnaChip({ activa, label, ayuda, onToggle }: { activa: boolean; label: string; ayuda: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={ayuda}
      className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activa ? "bg-red-700/90 border-red-600 text-white shadow-sm" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`}
    >
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${activa ? "bg-white text-red-700" : "border border-zinc-600"}`}>
        {activa ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

export default function CertificadoModal({
  isOpen, onClose, datos, onChange, filtroAgente, onCambiarFiltroAgente, filtroEstado, onCambiarFiltroEstado, estadosDisponibles,
  onCambiarTipoCertificado, onCambiarTipoIdentificacion, onCambiarDenominacion, onActualizarRating, onCambiarColumna, onCambiarAccionTrabajo,
  familiasDisponibles, hayPqs, pqsVariante, onCambiarPqsVariante, nombreArchivo, soloImprimir,
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [baseScale, setBaseScale] = useState(0.4);
  const [descargando, setDescargando] = useState(false);
  const [vistaMovil, setVistaMovil] = useState<"datos" | "preview">("datos");

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
  }, [isOpen, vistaMovil]);

  useEffect(() => {
    if (isOpen) setVistaMovil("datos");
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

  const handleImprimir = () => {
    const tituloOriginal = document.title;
    document.title = nombreArchivo.replace(/\.pdf$/i, "");
    const restaurar = () => {
      document.title = tituloOriginal;
      window.removeEventListener("afterprint", restaurar);
    };
    window.addEventListener("afterprint", restaurar);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  const esPlaca = datos.tipoIdentificacion === "placa";
  const esRuc = datos.tipoIdentificacion === "ruc";
  const esDni = datos.tipoIdentificacion === "dni";
  const labelNumero = esRuc ? "RUC" : esDni ? "DNI" : "Placa";
  const numeroInvalido = (esRuc && datos.numeroIdentificacion.length > 0 && datos.numeroIdentificacion.length !== 11)
    || (esDni && datos.numeroIdentificacion.length > 0 && datos.numeroIdentificacion.length !== 8)
    || (esPlaca && datos.numeroIdentificacion.replace("-", "").length > 0 && datos.numeroIdentificacion.replace("-", "").length !== 6);
  const dniAdicionalInvalido = esPlaca && datos.dniAdicional.length > 0 && datos.dniAdicional.length !== 8;
  const esPH = datos.tipoCertificado === "ph";
  const accionesBloqueadas = filtroEstado === ESTADO_NUEVO_VENTA;
  const soloUnidadPlaca = esPlaca && !datos.dniAdicional && !datos.nombre.trim();

  const handleNumeroChange = (valor: string) => {
    if (esRuc) return onChange({ numeroIdentificacion: valor.replace(/\D/g, "").slice(0, 11) });
    if (esDni) return onChange({ numeroIdentificacion: valor.replace(/\D/g, "").slice(0, 8) });
    return onChange({ numeroIdentificacion: formatPlaca(valor) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-400 max-h-[92vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">📄 {soloImprimir ? "Imprimir Certificado" : "Descargar Certificado"}</h3>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">Edita los datos y previsualiza el resultado final</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
        </div>

        <div className="lg:hidden flex border-b border-zinc-800 shrink-0">
          <button onClick={() => setVistaMovil("datos")} className={`flex-1 py-3 text-sm font-bold transition-colors ${vistaMovil === "datos" ? "text-red-400 border-b-2 border-red-500 bg-red-950/10" : "text-zinc-500"}`}>
            📝 Datos
          </button>
          <button onClick={() => setVistaMovil("preview")} className={`flex-1 py-3 text-sm font-bold transition-colors ${vistaMovil === "preview" ? "text-red-400 border-b-2 border-red-500 bg-red-950/10" : "text-zinc-500"}`}>
            👁️ Vista previa
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[440px_1fr]">
          <div className={`${vistaMovil === "datos" ? "flex" : "hidden"} lg:flex overflow-y-auto p-6 flex-col gap-6 border-b lg:border-b-0 lg:border-r border-zinc-800/60`}>
            <ModalSection title="1️⃣ Tipo de Certificado">
              <div className="flex flex-col gap-3">
                <ModalField label="¿Qué certificado necesitas?">
                  <Segmented
                    value={datos.tipoCertificado}
                    onChange={(v) => onCambiarTipoCertificado(v as TipoCertificado)}
                    options={[
                      { value: "garantia", label: "Garantía y Operatividad" },
                      { value: "ph", label: "Prueba Hidrostática" },
                    ]}
                  />
                </ModalField>
                <ModalField label="Tipo de extintores">
                  <Segmented
                    value={datos.denominacion}
                    onChange={(v) => onCambiarDenominacion(v as Denominacion)}
                    options={[
                      { value: "portatiles_rodantes", label: "Portátiles y Rodantes" },
                      { value: "portatiles", label: "Portátiles" },
                      { value: "rodantes", label: "Rodantes" },
                      { value: "extintores", label: "Extintores" },
                    ]}
                  />
                </ModalField>
              </div>
            </ModalSection>

            <ModalSection title="2️⃣ Extintores a Incluir">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <ModalField label="Por tipo de agente">
                    <select value={filtroAgente} onChange={(e) => onCambiarFiltroAgente(e.target.value)} className={modalInput}>
                      <option value="todos">Todos los extintores</option>
                      {familiasDisponibles.map((f) => (
                        <option key={f.key} value={f.key}>Solo {f.label}</option>
                      ))}
                    </select>
                  </ModalField>
                  <ModalField label="Por estado">
                    <select value={filtroEstado} onChange={(e) => onCambiarFiltroEstado(e.target.value)} className={modalInput}>
                      <option value="todos">Todos los estados</option>
                      {estadosDisponibles.map((e) => (
                        <option key={e} value={e}>Solo {e}</option>
                      ))}
                    </select>
                  </ModalField>
                  {!esPH && hayPqs && (filtroAgente === "todos" || filtroAgente === "pqs") && (
                    <ModalField label="Tipo de PQS">
                      <select value={pqsVariante} onChange={(e) => onCambiarPqsVariante(e.target.value as PqsVariante)} className={modalInput}>
                        <optgroup label="PQS 75%">
                          {PQS_VARIANTES_75.map((v) => <option key={v} value={v}>{PQS_TIPO_LABEL[v]}</option>)}
                        </optgroup>
                        <optgroup label="PQS 90%">
                          {PQS_VARIANTES_90.map((v) => <option key={v} value={v}>{PQS_TIPO_LABEL[v]}</option>)}
                        </optgroup>
                      </select>
                    </ModalField>
                  )}
                </div>
                <p className="text-xs text-zinc-400 bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-3.5 py-2.5">
                  {datos.items.length === 0 ? "Ningún extintor cumple con el filtro seleccionado" : `✅ ${datos.items.length} extintor${datos.items.length === 1 ? "" : "es"} incluido${datos.items.length === 1 ? "" : "s"} · ${datos.agentesTexto}`}
                </p>
              </div>
            </ModalSection>

            <ModalSection title="3️⃣ Normas y Etiquetas">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-zinc-900 text-zinc-500 border border-dashed border-zinc-800">
                    NTP 350.043.1
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-zinc-900 text-zinc-500 border border-dashed border-zinc-800">
                    833.030
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 -mt-1">Agrega una o varias etiquetas adicionales (opcional)</p>
                <div className="flex flex-wrap gap-1.5">
                  {ETIQUETAS_ADICIONALES_DISPONIBLES.map((etq) => (
                    <ColumnaChip
                      key={etq}
                      label={etq}
                      ayuda={etq}
                      activa={datos.etiquetasAdicionales.includes(etq)}
                      onToggle={() => onChange({
                        etiquetasAdicionales: datos.etiquetasAdicionales.includes(etq)
                          ? datos.etiquetasAdicionales.filter((e) => e !== etq)
                          : [...datos.etiquetasAdicionales, etq],
                      })}
                    />
                  ))}
                </div>
              </div>
            </ModalSection>

            {!esPH && (
              <ModalSection title="4️⃣ Texto del Certificado">
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-zinc-500 -mt-1">¿Qué trabajo se hizo? Puedes elegir más de uno</p>
                  <div className={`flex flex-wrap gap-1.5 ${accionesBloqueadas ? "opacity-50 pointer-events-none" : ""}`}>
                    {ACCIONES_TRABAJO.map((a) => (
                      <ColumnaChip
                        key={a.key}
                        label={a.label}
                        ayuda={a.label}
                        activa={datos.accionesTrabajo[a.key]}
                        onToggle={() => onCambiarAccionTrabajo(a.key, !datos.accionesTrabajo[a.key])}
                      />
                    ))}
                  </div>
                  {accionesBloqueadas && (
                    <p className="text-[11px] text-amber-500">⚠️ Al filtrar solo extintores "{ESTADO_NUEVO_VENTA}" el texto queda fijo en venta</p>
                  )}
                  <p className="text-xs text-zinc-400 bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-3.5 py-2.5">
                    "Se ha efectuado {datos.textoAccion} ..."
                  </p>
                </div>
              </ModalSection>
            )}

            <ModalSection title="5️⃣ Datos del Cliente">
              <div className="flex flex-col gap-3">
                <ModalField label="Tipo de documento">
                  <Segmented
                    value={datos.tipoIdentificacion}
                    onChange={(v) => onCambiarTipoIdentificacion(v as TipoIdentificacion)}
                    options={[
                      { value: "ruc", label: "RUC" },
                      { value: "dni", label: "DNI" },
                      { value: "placa", label: "Placa" },
                    ]}
                  />
                </ModalField>
                <ModalField label={`Número de ${labelNumero}`}>
                  <input
                    value={datos.numeroIdentificacion}
                    onChange={(e) => handleNumeroChange(e.target.value)}
                    placeholder={esPlaca ? "A13-54C" : esRuc ? "11 dígitos" : esDni ? "8 dígitos" : ""}
                    inputMode={esPlaca ? "text" : "numeric"}
                    className={`${modalInput} ${numeroInvalido ? "border-amber-600" : ""}`}
                  />
                  {numeroInvalido && (
                    <p className="text-[11px] font-bold text-amber-500 mt-1">
                      ⚠️ {esRuc ? "El RUC debe tener 11 dígitos" : esDni ? "El DNI debe tener 8 dígitos" : "La placa debe tener 6 caracteres (ej. A13-54C)"}
                    </p>
                  )}
                </ModalField>
                <ModalField label={`Nombre / Razón Social${esPlaca ? " (opcional)" : ""}`}>
                  <input value={datos.nombre} onChange={(e) => onChange({ nombre: e.target.value })} className={modalInput} />
                </ModalField>
                {esPlaca && (
                  <ModalField label="DNI del conductor (opcional)">
                    <input
                      value={datos.dniAdicional}
                      onChange={(e) => onChange({ dniAdicional: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                      inputMode="numeric"
                      className={`${modalInput} ${dniAdicionalInvalido ? "border-amber-600" : ""}`}
                    />
                    {dniAdicionalInvalido && <p className="text-[11px] font-bold text-amber-500 mt-1">⚠️ El DNI debe tener 8 dígitos</p>}
                  </ModalField>
                )}
                {soloUnidadPlaca && (
                  <p className="text-[11px] text-zinc-500 -mt-1">Sin nombre ni DNI, el certificado mostrará: "UNIDAD PLACA {datos.numeroIdentificacion || "—"}"</p>
                )}
                {!esPlaca && (
                  <div className="grid grid-cols-2 gap-3">
                    <ModalField label="Ubicación">
                      <input value={datos.ubicacion} onChange={(e) => onChange({ ubicacion: e.target.value })} className={modalInput} />
                    </ModalField>
                    <ModalField label="Distrito">
                      <select value={datos.distrito} onChange={(e) => onChange({ distrito: e.target.value })} className={modalInput}>
                        <option value="">Selecciona un distrito</option>
                        {DISTRITOS_LIMA.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </ModalField>
                  </div>
                )}
              </div>
            </ModalSection>

            <ModalSection title="6️⃣ Fecha del Certificado">
              <div className="grid grid-cols-3 gap-2">
                <ModalField label="Día">
                  <input type="number" min={1} max={31} value={datos.diaFecha} onChange={(e) => onChange({ diaFecha: String(Math.min(31, Math.max(1, parseInt(e.target.value) || 1))) })} className={modalInput} />
                </ModalField>
                <ModalField label="Mes">
                  <select value={datos.mesFecha} onChange={(e) => onChange({ mesFecha: e.target.value })} className={modalInput}>
                    {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </ModalField>
                <ModalField label="Año">
                  <input value={datos.anioFecha} disabled className={`${modalInput} opacity-60 cursor-not-allowed`} />
                </ModalField>
              </div>
            </ModalSection>

            <ModalSection title="7️⃣ Columnas de la Tabla">
              <div className="flex flex-col gap-4">
                {/* <p className="text-[11px] text-zinc-500 -mt-1">Toca una columna opcional para agregarla o quitarla del certificado</p>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Siempre visibles</span>
                  <div className="flex flex-wrap gap-1.5">
                    {COLUMNAS_FIJAS.map((c) => (
                      <span key={c} className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-zinc-900 text-zinc-500 border border-dashed border-zinc-800">
                        {c}
                      </span>
                    ))}
                    {esPH && (
                      <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-sky-950/40 text-sky-400 border border-dashed border-sky-800">
                        Presión PSI
                      </span>
                    )}
                  </div>
                </div> */}

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Agregar columnas opcionales</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(esPH ? COLUMNAS_OPCIONALES.filter((c) => c.key !== "marca") : COLUMNAS_OPCIONALES).map((c) => (
                      <ColumnaChip
                        key={c.key}
                        label={c.label}
                        ayuda={c.ayuda}
                        activa={datos.columnas[c.key]}
                        onToggle={() => onCambiarColumna(c.key, !datos.columnas[c.key])}
                      />
                    ))}
                  </div>
                </div>

                {datos.columnas.rating && datos.items.length > 0 && (
                  <ModalField label="Rating por extintor (manual)">
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-3">
                      {datos.items.map((it) => (
                        <div key={it.uid} className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400 flex-1 truncate">{it.serie !== "—" ? it.serie : it.item}</span>
                          <input value={it.rating} onChange={(e) => onActualizarRating(it.uid, e.target.value)} placeholder="Ej: 4A:60B:C" className="w-32 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-red-600" />
                        </div>
                      ))}
                    </div>
                  </ModalField>
                )}
              </div>
            </ModalSection>

            <div className="mt-auto flex gap-2 pt-1">
              <button onClick={handleImprimir} className="flex-1 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-200 transition-all">
                🖨️ Imprimir
              </button>
              {!soloImprimir && (
                <button onClick={handleDescargar} disabled={descargando} className="flex-1 px-5 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-all">
                  {descargando ? "Generando..." : "📥 Descargar"}
                </button>
              )}
            </div>
          </div>

          <div ref={previewRef} className={`${vistaMovil === "preview" ? "block" : "hidden"} lg:block overflow-auto bg-zinc-950 p-4`}>
            <div style={{ width: A4_WIDTH_PX * baseScale, height: A4_HEIGHT_PX * baseScale, margin: "0 auto" }}>
              <div style={{ width: "210mm", transform: `scale(${baseScale})`, transformOrigin: "top left" }}>
                <CertificadoTemplate datos={datos} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {createPortal(
        <div id="certificado-print" className="fixed -left-750 top-0">
          <CertificadoTemplate datos={datos} />
        </div>,
        document.body
      )}
      <style>{"@media print { #root { display: none !important; } #certificado-print { position: static !important; left: auto !important; top: auto !important; } @page { size: 210mm 297mm; margin: 0; } }"}</style>
    </div>
  );
}