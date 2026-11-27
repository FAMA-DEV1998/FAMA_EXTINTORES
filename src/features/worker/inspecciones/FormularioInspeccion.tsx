import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Camera, Check, ClipboardCheck, CreditCard, FireExtinguisher, LoaderCircle, Plus, Save, SearchX, TriangleAlert, X } from "lucide-react";
import type { CampanaInspeccion, EstadoItemInspeccion, ExtintorInspeccion, HallazgoInspeccion, RegistroInspeccion } from "../../../types";
import { Card, inputCls } from "../components/FormularioUI";
import { compressImage } from "../../../utils/archivos";
import { confirmar } from "../../../components/ui/Notificaciones";
import UbicacionFormulario from "../ubicacion/UbicacionFormulario";
import { rastreoUbicacion } from "../ubicacion/rastreoUbicacion";
import { CAMPOS_COMPLETABLES, esCO2, FOTOS_INSPECCION, HALLAZGOS_FRECUENTES, idRegistro, ITEMS_INSPECCION, nombreExtintor, OPCIONES_ITEM, vacio, type ClaveItem } from "./constantesInspeccion";

type Props = {
  socket: Socket | null;
  campana: CampanaInspeccion;
  extintor: ExtintorInspeccion;
  registro?: RegistroInspeccion;
  areas: string[];
  onClose: () => void;
  onGuardado: (mensaje: string, error?: boolean) => void;
};

const proximoAnio = () => {
  const d = new Date();
  return `${d.getFullYear() + 1}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function FormularioInspeccion({ socket, campana, extintor, registro, areas, onClose, onGuardado }: Props) {
  const previo = registro?.estado === "inspeccionado" ? registro : undefined;
  const [items, setItems] = useState<Record<ClaveItem, EstadoItemInspeccion>>(() => ({
    manometro: (previo?.manometro as EstadoItemInspeccion) || (esCO2(extintor.agenteExtintor) ? "NO APLICA" : "CONFORME"),
    pasador: (previo?.pasador as EstadoItemInspeccion) || "CONFORME",
    manguera: (previo?.manguera as EstadoItemInspeccion) || "CONFORME",
    tarjeta: (previo?.tarjeta as EstadoItemInspeccion) || "CONFORME",
  }));
  const [coincide, setCoincide] = useState<boolean | null>(previo ? previo.tarjetaCoincide : null);
  const [proxRecarga, setProxRecarga] = useState(previo?.proxRecarga || proximoAnio());
  const [hallazgos, setHallazgos] = useState<HallazgoInspeccion[]>(previo?.hallazgos || []);
  const [nuevoHallazgo, setNuevoHallazgo] = useState("");
  const [observacion, setObservacion] = useState(registro?.observacion || "");
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [completar, setCompletar] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const entradaFoto = useRef<HTMLInputElement | null>(null);
  const tipoFoto = useRef<string>("");
  const fotosPrevias = new Set(registro?.fotos || []);

  useEffect(() => {
    rastreoUbicacion.alAbrirFormulario(extintor.uid, true);
    return () => rastreoUbicacion.alCancelarFormulario();
  }, [extintor.uid]);

  const tieneFoto = (tipo: string) => !!fotos[tipo] || fotosPrevias.has(tipo);
  const faltanFotos = FOTOS_INSPECCION.filter((f) => !tieneFoto(f.tipo));
  const camposVacios = CAMPOS_COMPLETABLES.filter((c) => vacio(extintor[c.clave]));
  const listo = faltanFotos.length === 0 && coincide !== null;

  const pedirFoto = (tipo: string) => {
    tipoFoto.current = tipo;
    entradaFoto.current?.click();
  };

  const alElegirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    const tipo = tipoFoto.current;
    setProcesando(tipo);
    try {
      const data = await compressImage(archivo, 1280, 0.6);
      setFotos((p) => ({ ...p, [tipo]: data }));
    } catch {
      onGuardado("No se pudo procesar la foto", true);
    }
    setProcesando(null);
  };

  const agregarHallazgo = (texto: string, recomendacion = "") => {
    const t = texto.trim();
    if (!t || hallazgos.some((h) => h.texto.toLowerCase() === t.toLowerCase())) return;
    setHallazgos((p) => [...p, { texto: t, recomendacion: recomendacion || HALLAZGOS_FRECUENTES.find((h) => h.texto.toLowerCase() === t.toLowerCase())?.recomendacion || "" }]);
  };

  const enviar = (estado: "inspeccionado" | "no_encontrado") => {
    if (!socket) return;
    const limpio = Object.fromEntries(Object.entries(completar).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    setGuardando(true);
    socket.emit("insp:registrar", {
      id: idRegistro(campana.id, extintor.uid),
      campanaId: campana.id,
      extintorUid: extintor.uid,
      estado,
      ...items,
      tarjetaCoincide: coincide !== false,
      proxRecarga,
      hallazgos,
      observacion,
      fotos: estado === "inspeccionado" ? fotos : {},
      completar: limpio,
      inspeccionadoEn: new Date().toISOString(),
    }, (res: any) => {
      setGuardando(false);
      if (!res?.success) {
        onGuardado(res?.error || "No se pudo guardar", true);
        return;
      }
      if (estado === "inspeccionado") rastreoUbicacion.alGuardarExtintor(extintor.uid);
      else rastreoUbicacion.setGuardar(false);
      onGuardado(estado === "inspeccionado" ? (res.sinSenal ? "Inspección guardada en el teléfono" : "Inspección guardada") : "Marcado como no encontrado");
      onClose();
    });
  };

  const marcarNoEncontrado = async () => {
    const ok = await confirmar({ titulo: "¿Marcar como no encontrado?", mensaje: "Saldrá como «No encontrado» en el Excel. Puedes inspeccionarlo después si aparece.", textoConfirmar: "Marcar" });
    if (ok) enviar("no_encontrado");
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 h-14 bg-linear-to-r from-red-800 to-red-700 text-white shrink-0">
        <ClipboardCheck className="w-5 h-5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate">{nombreExtintor(extintor)}</p>
          <p className="text-[11px] text-red-100 truncate">{[extintor.area, extintor.agenteExtintor, [extintor.peso, extintor.unidadPeso].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "Inspección"}</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-red-950/40 flex items-center justify-center" aria-label="Cerrar"><X className="w-4 h-4" /></button>
      </div>

      <input ref={entradaFoto} type="file" accept="image/*" capture="environment" className="hidden" onChange={alElegirFoto} />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-w-2xl w-full mx-auto">
        <Card title="Datos del extintor" icon={FireExtinguisher}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ["N° interno", extintor.nInterno], ["N° serie", extintor.nSerie], ["Agente", extintor.agenteExtintor],
              ["Capacidad", [extintor.peso, extintor.unidadPeso].filter(Boolean).join(" ")], ["Marca", extintor.marca],
              ["Fabricación", extintor.fechaFabricacion], ["Vence PH", extintor.vencimPH], ["Ubicación", extintor.area],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{k}</span>
                <span className={`font-bold ${vacio(v) ? "text-amber-600" : "text-zinc-800"}`}>{vacio(v) ? "Falta" : v}</span>
              </div>
            ))}
          </div>
          {camposVacios.length > 0 && (
            <div className="flex flex-col gap-3 pt-3 border-t border-zinc-100">
              <p className="text-xs font-black text-amber-700">Completa los datos que faltan</p>
              {camposVacios.map((c) => (
                <label key={c.clave} className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 ml-1">{c.etiqueta}</span>
                  <input
                    className={inputCls}
                    value={completar[c.clave] || ""}
                    placeholder={c.ejemplo}
                    list={c.clave === "area" ? "areas-inspeccion" : undefined}
                    onChange={(e) => setCompletar((p) => ({ ...p, [c.clave]: e.target.value, ...(c.clave === "peso" && !extintor.unidadPeso ? { unidadPeso: "KG" } : {}) }))}
                  />
                </label>
              ))}
              <datalist id="areas-inspeccion">{areas.map((a) => <option key={a} value={a} />)}</datalist>
            </div>
          )}
        </Card>

        <Card title="Verificación con la tarjeta" icon={CreditCard}>
          <p className="text-sm font-bold text-zinc-700">¿Los datos de la tarjeta coinciden con este extintor?</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCoincide(true)} className={`py-3 rounded-xl border-2 text-sm font-black ${coincide === true ? "bg-emerald-600 border-emerald-600 text-white" : "border-zinc-200 text-zinc-600"}`}>Sí, coinciden</button>
            <button onClick={() => setCoincide(false)} className={`py-3 rounded-xl border-2 text-sm font-black ${coincide === false ? "bg-red-600 border-red-600 text-white" : "border-zinc-200 text-zinc-600"}`}>No coinciden</button>
          </div>
          {coincide === false && (
            <p className="flex items-start gap-2 text-xs font-bold text-red-700 bg-red-50 rounded-xl px-3 py-2"><TriangleAlert className="w-4 h-4 shrink-0" />Saldrá como hallazgo «Tarjeta no coincide». Explica la diferencia en la observación.</p>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Próxima recarga (según tarjeta)</span>
            <input type="month" className={inputCls} value={proxRecarga} onChange={(e) => setProxRecarga(e.target.value)} />
          </label>
        </Card>

        <Card title="Estado de los componentes" icon={ClipboardCheck}>
          {ITEMS_INSPECCION.map((it) => (
            <div key={it.clave} className="flex flex-col gap-1.5">
              <span className="text-sm font-black text-zinc-700">{it.etiqueta}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {OPCIONES_ITEM.map((o) => {
                  const activo = items[it.clave] === o.valor;
                  const color = o.valor === "CONFORME" ? "bg-emerald-600 border-emerald-600" : o.valor === "NECESITA CAMBIO" ? "bg-red-600 border-red-600" : "bg-zinc-600 border-zinc-600";
                  return (
                    <button key={o.valor} onClick={() => setItems((p) => ({ ...p, [it.clave]: o.valor }))} className={`py-2.5 rounded-xl border-2 text-xs font-black ${activo ? `${color} text-white` : "border-zinc-200 text-zinc-600"}`}>
                      {o.etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>

        <Card title={`Fotos obligatorias (${FOTOS_INSPECCION.length - faltanFotos.length}/${FOTOS_INSPECCION.length})`} icon={Camera} faltante={faltanFotos.length > 0}>
          <div className="grid grid-cols-3 gap-2">
            {FOTOS_INSPECCION.map((f) => (
              <button key={f.tipo} onClick={() => pedirFoto(f.tipo)} className={`relative aspect-3/4 rounded-xl border-2 overflow-hidden flex flex-col items-center justify-center gap-1 p-1 text-center ${tieneFoto(f.tipo) ? "border-emerald-500" : "border-dashed border-zinc-300 bg-zinc-50"}`}>
                {fotos[f.tipo] ? <img src={fotos[f.tipo]} alt={f.etiqueta} className="absolute inset-0 w-full h-full object-cover" /> : procesando === f.tipo ? <LoaderCircle className="w-6 h-6 text-zinc-400 animate-spin" /> : <Camera className="w-6 h-6 text-zinc-400" />}
                {!fotos[f.tipo] && <span className="text-[10px] font-black text-zinc-600 leading-tight">{f.etiqueta}</span>}
                {!fotos[f.tipo] && fotosPrevias.has(f.tipo) && <span className="text-[9px] font-bold text-emerald-700">Ya guardada</span>}
                {tieneFoto(f.tipo) && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-3 h-3" /></span>}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-400 -mt-2">Toca una foto para tomarla de nuevo.</p>
        </Card>

        <Card title="Hallazgos" icon={TriangleAlert}>
          <div className="flex flex-wrap gap-1.5">
            {HALLAZGOS_FRECUENTES.filter((h) => !hallazgos.some((x) => x.texto === h.texto)).map((h) => (
              <button key={h.texto} onClick={() => agregarHallazgo(h.texto, h.recomendacion)} className="px-2.5 py-1.5 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-700 active:scale-95">+ {h.texto}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} value={nuevoHallazgo} onChange={(e) => setNuevoHallazgo(e.target.value)} placeholder="Otro hallazgo…" />
            <button onClick={() => { agregarHallazgo(nuevoHallazgo); setNuevoHallazgo(""); }} className="px-4 rounded-xl bg-zinc-900 text-white shrink-0" aria-label="Agregar hallazgo"><Plus className="w-4 h-4" /></button>
          </div>
          {hallazgos.map((h, i) => (
            <div key={h.texto} className="flex flex-col gap-1.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm font-black text-amber-900">{h.texto}</span>
                <button onClick={() => setHallazgos((p) => p.filter((_, j) => j !== i))} className="text-amber-700" aria-label="Quitar hallazgo"><X className="w-4 h-4" /></button>
              </div>
              <input className={inputCls} value={h.recomendacion} placeholder="Recomendación" onChange={(e) => setHallazgos((p) => p.map((x, j) => (j === i ? { ...x, recomendacion: e.target.value } : x)))} />
            </div>
          ))}
          {hallazgos.length > 0 && (
            <button onClick={() => pedirFoto("hallazgo")} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-bold ${tieneFoto("hallazgo") ? "border-emerald-400 text-emerald-700" : "border-zinc-300 text-zinc-600"}`}>
              {procesando === "hallazgo" ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {tieneFoto("hallazgo") ? "Foto del hallazgo lista (tocar para cambiar)" : "Foto del hallazgo (opcional)"}
            </button>
          )}
          <textarea className={`${inputCls} min-h-20`} value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Observación general (opcional)" />
        </Card>

        <UbicacionFormulario socket={socket} uid={extintor.uid} />
        <div className="h-4 shrink-0" />
      </div>

      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-zinc-200 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {!listo && (
            <p className="text-[11px] font-bold text-amber-700 text-center">
              {[faltanFotos.length > 0 && `Faltan ${faltanFotos.length} foto${faltanFotos.length === 1 ? "" : "s"}`, coincide === null && "indica si la tarjeta coincide"].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={marcarNoEncontrado} disabled={guardando} className="px-4 py-3.5 rounded-2xl border-2 border-zinc-300 text-zinc-700 text-sm font-black flex items-center gap-1.5 disabled:opacity-50">
              <SearchX className="w-4 h-4" />No encontrado
            </button>
            <button onClick={() => enviar("inspeccionado")} disabled={!listo || guardando} className="flex-1 py-3.5 rounded-2xl bg-red-700 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40">
              {guardando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar inspección
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
