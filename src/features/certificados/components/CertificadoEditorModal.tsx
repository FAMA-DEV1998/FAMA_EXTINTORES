import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CircleCheck, Copy, Eye, FilePen, FilePlus2, Globe, LoaderCircle, Pencil, Pin, Printer, RotateCcw, Save, Settings2, TriangleAlert, X } from "lucide-react";
import toast from "react-hot-toast";
import { enlaceWeb } from "../utils/web";
import { CONTENEDOR_IMPRESION } from "../hooks/useCertificadoEditor";
import CertificadoTemplate from "./CertificadoTemplate";
import { construirParrafoAutomatico, sanitizarHtmlBold } from "../utils/parrafo";
import CertificadoPreview from "./CertificadoPreview";
import type { CertificadoDatos, TipoCertificado, TipoIdentificacion } from "../types";
import { PQS_TIPO_LABEL, PQS_VARIANTES } from "../utils/agentes";
import { ESTADO_NUEVO_VENTA } from "../utils/trabajo";
import { type PqsVariante, type AccionTrabajo } from "../types";
import { construirEtiquetaHoja } from "../utils/hojas";
import { type HojaMeta } from "../types";
import { MESES, DISTRITOS_LIMA } from "../../../constants";
import { ModalSection, ModalField, modalInput } from "../../../components/ui/ModalCampos";

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
  onActualizarRating: (uid: string, valor: string) => void;
  onCambiarColumna: (columna: "item" | "nInterno" | "marca" | "tipoServicio" | "rating", valor: boolean) => void;
  onCambiarAccionTrabajo: (accion: AccionTrabajo, valor: boolean) => void;
  familiasDisponibles: { key: string; label: string }[];
  hayPqs: boolean;
  pqsVariante: PqsVariante;
  onCambiarPqsVariante: (variante: PqsVariante) => void;
  plantillas?: { id: string; nombre: string; datos: string }[];
  onCargarPlantilla?: (plantilla: { id: string; nombre: string; datos: string }) => void;
  onGuardarPlantilla?: (nombre: string, onDone?: (ok: boolean) => void) => void;
  guardandoPlantilla?: boolean;
  hojas: CertificadoDatos[];
  hojasMeta: HojaMeta[];
  hojaActivaIdx: number;
  onSetHojaActivaIdx: (idx: number) => void;
  onAgregarHoja?: () => void;
  onDuplicarHoja?: () => void;
  onEliminarHoja?: (idx: number) => void;
  plantillaActivaId?: string | null;
  plantillaActivaNombre?: string;
  onActualizarPlantilla?: (onDone?: (ok: boolean) => void) => void;
  certificadoGuardadoId: string | null;
  guardandoCertificado: boolean;
  hayCambiosPendientes: boolean;
  onGuardarCertificado: (onDone?: (ok: boolean) => void) => void;
  modoEdicion: boolean;
  onUsarModoEstandar?: () => void;
  etiquetasDisponibles: string[];
  onCrearEtiqueta?: (valor: string, onDone?: (ok: boolean) => void) => void;
  /** Publicación en extintoresfama.com/certificados (descarga por código) */
  web?: { codigo: string | null; publicando: boolean; publicar: () => void };
}

const formatPlaca = (raw: string) => {
  const limpio = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return limpio.length <= 3 ? limpio : `${limpio.slice(0, 3)}-${limpio.slice(3)}`;
};

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

const PASOS: { titulo: string }[] = [
  { titulo: "Tipo" },
  { titulo: "Cliente" },
  { titulo: "Extintores" },
  { titulo: "Texto" },
  { titulo: "Fecha" },
  { titulo: "Normas" },
  { titulo: "Columnas" },
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
        {activa && <Check className="w-3 h-3" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function EditorParrafo({ valorInicial, onChange }: { valorInicial: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cambioPropio = useRef(false);
  const [negritaActiva, setNegritaActiva] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (cambioPropio.current) {
      cambioPropio.current = false;
      return;
    }
    ref.current.innerHTML = valorInicial;
  }, [valorInicial]);

  const actualizarEstadoNegrita = () => {
    try { setNegritaActiva(document.queryCommandState("bold")); } catch { }
  };

  const handleInput = () => {
    if (!ref.current) return;
    const html = sanitizarHtmlBold(ref.current.innerHTML);
    cambioPropio.current = true;
    onChange(html);
    actualizarEstadoNegrita();
  };

  const aplicarNegrita = () => {
    ref.current?.focus();
    document.execCommand("bold");
    handleInput();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 w-fit">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={aplicarNegrita}
          title="Negrita (aplica al texto seleccionado)"
          className={`w-9 h-9 rounded-lg flex items-center justify-center font-serif text-base font-black transition-all ${negritaActiva ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
        >
          B
        </button>
        <span className="text-[10px] text-zinc-500 px-2">Selecciona texto y pulsa para poner o quitar negrita</span>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onMouseUp={actualizarEstadoNegrita}
        onKeyUp={actualizarEstadoNegrita}
        className="min-h-32 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 leading-relaxed focus:outline-none focus:border-red-600"
      />
    </div>
  );
}

export default function CertificadoEditorModal({
  isOpen, onClose, datos, onChange, filtroAgente, onCambiarFiltroAgente, filtroEstado, onCambiarFiltroEstado, estadosDisponibles,
  onCambiarTipoCertificado, onCambiarTipoIdentificacion, onActualizarRating, onCambiarColumna, onCambiarAccionTrabajo,
  familiasDisponibles, hayPqs, pqsVariante, onCambiarPqsVariante,
  plantillas, onCargarPlantilla, onGuardarPlantilla, guardandoPlantilla,
  hojas, hojasMeta, hojaActivaIdx, onSetHojaActivaIdx, onAgregarHoja, onDuplicarHoja, onEliminarHoja,
  plantillaActivaId, plantillaActivaNombre, onActualizarPlantilla,
  certificadoGuardadoId, guardandoCertificado, hayCambiosPendientes, onGuardarCertificado, modoEdicion, onUsarModoEstandar,
  etiquetasDisponibles, onCrearEtiqueta, web,
}: Props) {
  const [vistaMovil, setVistaMovil] = useState<"datos" | "preview">("datos");
  const [editandoParrafo, setEditandoParrafo] = useState(false);
  const [nombrePlantilla, setNombrePlantilla] = useState("");
  const [confirmarActualizarPlantilla, setConfirmarActualizarPlantilla] = useState(false);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [pasoActivo, setPasoActivo] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setVistaMovil("datos");
      setEditandoParrafo(!!datos.parrafoPersonalizado);
      setNombrePlantilla("");
      setNuevaEtiqueta("");
      setPasoActivo(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    setConfirmarActualizarPlantilla(false);
  }, [hojaActivaIdx]);

  if (!isOpen) return null;

  const puedeImprimir = !!certificadoGuardadoId && !hayCambiosPendientes;

  const handleImprimir = () => {
    if (!puedeImprimir) return;
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  const handleClickGuardar = () => onGuardarCertificado();

  const etiquetaHoja = (hoja: CertificadoDatos, i: number) => construirEtiquetaHoja(hoja, hojasMeta[i] || hojasMeta[0], familiasDisponibles);

  const hojasCompartiendoPlantilla = plantillaActivaId
    ? hojasMeta.filter((m, i) => i !== hojaActivaIdx && m.plantillaId === plantillaActivaId).length
    : 0;

  const handleClickActualizarPlantilla = () => {
    if (hojasCompartiendoPlantilla > 0) { setConfirmarActualizarPlantilla(true); return; }
    onActualizarPlantilla?.();
  };

  const confirmarActualizacion = () => {
    setConfirmarActualizarPlantilla(false);
    onActualizarPlantilla?.();
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

  const estadoLabel = guardandoCertificado
    ? "Guardando..."
    : !certificadoGuardadoId
      ? "Sin guardar"
      : hayCambiosPendientes
        ? "Cambios sin guardar"
        : "Guardado";
  const EstadoIcono = guardandoCertificado ? LoaderCircle : !certificadoGuardadoId || hayCambiosPendientes ? TriangleAlert : CircleCheck;
  const estadoClase = guardandoCertificado
    ? "text-sky-400 bg-sky-950/30 border-sky-900/40"
    : !certificadoGuardadoId || hayCambiosPendientes
      ? "text-amber-400 bg-amber-950/30 border-amber-900/40"
      : "text-emerald-400 bg-emerald-950/30 border-emerald-900/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-340 max-h-[92vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2.5">{modoEdicion ? <FilePen className="w-5 h-5 text-red-500" /> : <FilePlus2 className="w-5 h-5 text-red-500" />}{modoEdicion ? "Editar certificado" : "Crear certificado"}</h3>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">{modoEdicion ? "Estás modificando un certificado ya guardado" : "Completa los datos, guarda el certificado y luego imprímelo"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap ${estadoClase}`}><EstadoIcono className={`w-3.5 h-3.5 ${guardandoCertificado ? "animate-spin" : ""}`} />{estadoLabel}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="Cerrar"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="lg:hidden flex border-b border-zinc-800 shrink-0">
          <button onClick={() => setVistaMovil("datos")} className={`flex-1 py-3 text-sm font-bold transition-colors ${vistaMovil === "datos" ? "text-red-400 border-b-2 border-red-500 bg-red-950/10" : "text-zinc-500"}`}>
            <span className="inline-flex items-center gap-2"><Pencil className="w-4 h-4" />Datos</span>
          </button>
          <button onClick={() => setVistaMovil("preview")} className={`flex-1 py-3 text-sm font-bold transition-colors ${vistaMovil === "preview" ? "text-red-400 border-b-2 border-red-500 bg-red-950/10" : "text-zinc-500"}`}>
            <span className="inline-flex items-center gap-2"><Eye className="w-4 h-4" />Vista previa</span>
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[460px_1fr]">
          <div className={`${vistaMovil === "datos" ? "flex" : "hidden"} lg:flex flex-col min-h-0 min-w-0`}>
            <div className="shrink-0 flex flex-col gap-4 border-b border-zinc-800/60 bg-zinc-950/30">
              {(onGuardarPlantilla || onCargarPlantilla) && (
                <div className="flex flex-col gap-3 px-5 pt-5">
                    <div className="flex flex-col gap-2.5 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3">
                      <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">Plantilla</span>

                      {onUsarModoEstandar && (
                        <div className="grid grid-cols-2 gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                          <button
                            onClick={onUsarModoEstandar}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${!plantillaActivaId ? "bg-red-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"}`}
                          >
                            <span className="inline-flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" />Estándar</span>
                          </button>
                          <div className={`px-3 py-2 rounded-lg text-xs font-bold text-center truncate transition-all ${plantillaActivaId ? "bg-emerald-800/60 text-emerald-100" : "text-zinc-600"}`}>
                            {plantillaActivaId ? <span className="inline-flex items-center gap-1.5 max-w-full"><Pin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{plantillaActivaNombre}</span></span> : "Sin plantilla"}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {plantillas && plantillas.length > 0 ? (
                          <select
                            value={plantillaActivaId || ""}
                            onChange={(e) => {
                              const plantilla = plantillas.find((p) => p.id === e.target.value);
                              if (plantilla) onCargarPlantilla?.(plantilla);
                            }}
                            className={`${modalInput} flex-1 min-w-0`}
                          >
                            <option value="" disabled>Elegir plantilla guardada...</option>
                            {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                          </select>
                        ) : (
                          <span className="text-[11px] text-zinc-500 flex-1">Sin plantillas guardadas todavía</span>
                        )}
                        {plantillaActivaId && onActualizarPlantilla && !confirmarActualizarPlantilla && (
                          <button
                            onClick={handleClickActualizarPlantilla}
                            disabled={guardandoPlantilla}
                            className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-[11px] font-bold text-white disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {guardandoPlantilla ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <span className="inline-flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />Actualizar</span>}
                          </button>
                        )}
                      </div>
                      {confirmarActualizarPlantilla && (
                        <div className="flex flex-col gap-2 bg-amber-950/20 border border-amber-900/40 rounded-xl p-3">
                          <p className="flex gap-1.5 text-[11px] text-amber-300 font-bold leading-relaxed">
                            <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" />Esta plantilla también se usa en {hojasCompartiendoPlantilla} otra{hojasCompartiendoPlantilla === 1 ? "" : "s"} hoja de este certificado. Actualizarla cambiará la plantilla base para todas.
                          </p>
                          <div className="flex gap-2">
                            <button onClick={confirmarActualizacion} className="flex-1 px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-[11px] font-bold text-white transition-all">
                              Actualizar de todas formas
                            </button>
                            <button onClick={() => setConfirmarActualizarPlantilla(false)} className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200 transition-all">
                              Cancelar
                            </button>
                          </div>
                          <p className="text-[10px] text-zinc-500">Para no afectar las otras hojas, escribe un nombre abajo y usa "Guardar" para crear una plantilla independiente.</p>
                        </div>
                      )}
                      {onGuardarPlantilla && (
                        <div className="flex gap-2">
                          <input
                            value={nombrePlantilla}
                            onChange={(e) => setNombrePlantilla(e.target.value)}
                            placeholder="Nombre para guardar como nueva plantilla"
                            className={`${modalInput} flex-1`}
                          />
                          <button
                            onClick={() => onGuardarPlantilla(nombrePlantilla, (ok) => { if (ok) setNombrePlantilla(""); })}
                            disabled={!nombrePlantilla.trim() || guardandoPlantilla}
                            className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 disabled:opacity-50 transition-all whitespace-nowrap flex items-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />Guardar
                          </button>
                        </div>
                      )}
                    </div>
                </div>
              )}

              <div className="flex items-stretch justify-between px-5 pb-4">
                {PASOS.map((paso, i) => {
                  const activo = pasoActivo === i;
                  const completado = i < pasoActivo;
                  return (
                    <button
                      key={paso.titulo}
                      onClick={() => setPasoActivo(i)}
                      className="flex-1 flex flex-col items-center gap-1.5 group"
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${activo ? "bg-red-700 text-white shadow-md shadow-red-900/30" : completado ? "bg-emerald-800/70 text-emerald-100" : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700"}`}>
                        {completado ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={`text-[9px] font-bold leading-tight text-center transition-colors ${activo ? "text-zinc-200" : "text-zinc-600 group-hover:text-zinc-400"}`}>{paso.titulo}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {pasoActivo === 0 && (
            <ModalSection title="Tipo de Certificado">
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
              </div>
            </ModalSection>
              )}

              {pasoActivo === 1 && (
            <ModalSection title="Datos del Cliente">
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
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500 mt-1">
                      <TriangleAlert className="w-3.5 h-3.5 shrink-0" />{esRuc ? "El RUC debe tener 11 dígitos" : esDni ? "El DNI debe tener 8 dígitos" : "La placa debe tener 6 caracteres (ej. A13-54C)"}
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
                    {dniAdicionalInvalido && <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500 mt-1"><TriangleAlert className="w-3.5 h-3.5 shrink-0" />El DNI debe tener 8 dígitos</p>}
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
              )}

              {pasoActivo === 2 && (
            <ModalSection title="Extintores a Incluir">
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
                        {PQS_VARIANTES.map((v) => <option key={v} value={v}>{PQS_TIPO_LABEL[v]}</option>)}
                      </select>
                    </ModalField>
                  )}
                </div>
                <p className={`flex items-center gap-2 text-xs bg-zinc-950/50 border rounded-xl px-3.5 py-2.5 ${datos.items.length === 0 ? "text-amber-400 border-amber-900/40" : "text-zinc-400 border-zinc-800/60"}`}>
                  {datos.items.length === 0 ? <TriangleAlert className="w-4 h-4 shrink-0" /> : <CircleCheck className="w-4 h-4 shrink-0 text-emerald-500" />}
                  {datos.items.length === 0 ? "Ningún extintor cumple con el filtro seleccionado" : `${datos.items.length} extintor${datos.items.length === 1 ? "" : "es"} incluido${datos.items.length === 1 ? "" : "s"} · ${datos.agentesTexto}`}
                </p>
              </div>
            </ModalSection>
              )}

              {pasoActivo === 3 && (
            <ModalSection title="Texto del Certificado">
              <div className="flex flex-col gap-4">
                {!esPH && (
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
                      <p className="flex items-center gap-1.5 text-[11px] text-amber-500"><TriangleAlert className="w-3.5 h-3.5 shrink-0" />Al filtrar solo extintores "{ESTADO_NUEVO_VENTA}" el texto queda fijo en venta</p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-zinc-500">Párrafo entre el título y la tabla</p>
                  {editandoParrafo ? (
                    <>
                      <EditorParrafo
                        valorInicial={datos.parrafoPersonalizado || ""}
                        onChange={(html) => onChange({ parrafoPersonalizado: html })}
                      />
                      <p className="text-[10px] text-zinc-600 -mt-1">Los cambios en RUC, ubicación, tipo de agente, normas y etiquetas se siguen reflejando aquí automáticamente, incluso si editas el texto.</p>
                      <button
                        onClick={() => { onChange({ parrafoPersonalizado: "" }); setEditandoParrafo(false); }}
                        className="self-start text-[11px] font-bold text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />Restablecer texto automático
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        const textoAuto = construirParrafoAutomatico(datos);
                        onChange({ parrafoPersonalizado: textoAuto });
                        setEditandoParrafo(true);
                      }}
                      className="self-start px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-all flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />Editar texto manualmente
                    </button>
                  )}
                </div>
              </div>
            </ModalSection>
              )}

              {pasoActivo === 4 && (
            <ModalSection title="Fecha del Certificado">
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
              )}

              {pasoActivo === 5 && (
            <ModalSection title="Normas y Etiquetas">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-zinc-900 text-zinc-500 border border-dashed border-zinc-800">
                    NTP 350.043.1
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-zinc-900 text-zinc-500 border border-dashed border-zinc-800">
                    833.030
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 -mt-1">Selecciona una o varias normas/etiquetas adicionales (opcional)</p>
                <div className="flex flex-wrap gap-1.5">
                  {etiquetasDisponibles.map((etq) => (
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
                {onCrearEtiqueta && (
                  <div className="flex gap-2 pt-1">
                    <input
                      value={nuevaEtiqueta}
                      onChange={(e) => setNuevaEtiqueta(e.target.value)}
                      placeholder="Crear nueva norma/etiqueta..."
                      className={`${modalInput} flex-1`}
                    />
                    <button
                      onClick={() => {
                        const valor = nuevaEtiqueta.trim();
                        if (!valor) return;
                        onCrearEtiqueta(valor, (ok) => {
                          if (ok) {
                            onChange({ etiquetasAdicionales: [...datos.etiquetasAdicionales, valor] });
                            setNuevaEtiqueta("");
                          }
                        });
                      }}
                      disabled={!nuevaEtiqueta.trim()}
                      className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 disabled:opacity-50 transition-all whitespace-nowrap"
                    >
                      + Crear
                    </button>
                  </div>
                )}
              </div>
            </ModalSection>
              )}

              {pasoActivo === 6 && (
            <ModalSection title="Columnas de la Tabla">
              <div className="flex flex-col gap-4">
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
              )}
            </div>

            {web && certificadoGuardadoId && (
              <div className="shrink-0 flex items-center gap-2 px-4 pt-3 text-xs">
                <Globe className={`w-4 h-4 shrink-0 ${web.codigo ? "text-emerald-400" : "text-zinc-500"}`} />
                {web.publicando ? (
                  <span className="text-sky-400 font-bold flex items-center gap-1.5"><LoaderCircle className="w-3.5 h-3.5 animate-spin" />Publicando en la web…</span>
                ) : web.codigo ? (
                  <>
                    <span className="text-zinc-400">Código web:</span>
                    <span className="font-black text-emerald-400 tracking-wide">{web.codigo}</span>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(enlaceWeb(web.codigo!)); toast.success("Enlace de descarga copiado"); }}
                      className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                      title="Copiar enlace para enviar al cliente"
                    ><Copy className="w-3.5 h-3.5" />Enlace</button>
                    <button type="button" onClick={web.publicar} disabled={hayCambiosPendientes} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold disabled:opacity-40" title="Volver a subir el PDF a la web">Actualizar</button>
                  </>
                ) : (
                  <>
                    <span className="text-zinc-500">Aún no está publicado en la web</span>
                    <button type="button" onClick={web.publicar} disabled={hayCambiosPendientes} className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-300 font-bold disabled:opacity-40">Publicar</button>
                  </>
                )}
              </div>
            )}

            <div className="shrink-0 flex gap-2 p-4 border-t border-zinc-800/60">
              <button onClick={handleClickGuardar} disabled={guardandoCertificado} className="flex-1 px-5 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {guardandoCertificado ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {guardandoCertificado ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Guardar"}
              </button>
              <button onClick={handleImprimir} disabled={!puedeImprimir} title={puedeImprimir ? "" : "Guarda el certificado antes de imprimir"} className="flex-1 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" />Imprimir {hojas.length > 1 ? `(${hojas.length} hojas)` : ""}
              </button>
            </div>
          </div>

          <div className={`${vistaMovil === "preview" ? "flex" : "hidden"} lg:flex flex-col min-h-0 min-w-0`}>
            <CertificadoPreview
              hojas={hojas}
              activeIndex={hojaActivaIdx}
              onActiveIndexChange={onSetHojaActivaIdx}
              etiquetaHoja={etiquetaHoja}
              onAgregarHoja={onAgregarHoja}
              onDuplicarHoja={onDuplicarHoja}
              onEliminarHoja={onEliminarHoja ? () => onEliminarHoja(hojaActivaIdx) : undefined}
              codigoWeb={web?.codigo}
            />
          </div>
        </div>
      </div>

      {createPortal(
        <div id={CONTENEDOR_IMPRESION} className="fixed -left-750 top-0">
          {hojas.map((hoja, i) => (
            <CertificadoTemplate key={i} datos={hoja} id={`certificado-print-hoja-${i}`} codigoWeb={web?.codigo} />
          ))}
        </div>,
        document.body
      )}
      <style>{"@media print { #root { display: none !important; } #certificado-print-container { position: static !important; left: auto !important; top: auto !important; } .certificado-print-page { break-after: page; page-break-after: always; } @page { size: 210mm 297mm; margin: 0; } }"}</style>
    </div>
  );
}
