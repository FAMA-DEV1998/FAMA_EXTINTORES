import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { ArrowUp, Compass, Download, Image as ImageIcon, LoaderCircle, MapPin, MapPinOff, Search, X } from "lucide-react";
import type { ExtintorUbicado } from "../../../types";
import MapaTeselas, { type MarcadorMapa } from "../../../components/mapa/MapaTeselas";
import { descargarZona, mapaSinConexionDisponible, planDescarga, zonaGuardada } from "../../../components/mapa/mapaOffline";
import { cardinal, distanciaMetros, formatearDistancia, formatearPrecision, haceCuanto, limitesDe, rumboGrados } from "../../../utils/geo";
import { useTeclaEscape } from "../../../hooks/useTeclaEscape";
import { usePosicionEnVivo, useBrujula } from "./useUbicacion";

type Props = {
  socket: Socket | null;
  empresaId: string;
  sedeId?: string | null;
  nombre: string;
  uidInicial?: string | null;
  onClose: () => void;
};

const nombreDe = (e: ExtintorUbicado) => [e.nInterno && `N° ${e.nInterno}`, e.nSerie && e.nSerie !== "S/N" ? `Serie ${e.nSerie}` : "", !e.nInterno && (!e.nSerie || e.nSerie === "S/N") ? "S/N" : ""].filter(Boolean).join(" · ");

const colorDe = (e: ExtintorUbicado) => {
  const u = e.ubicacion;
  if (!u) return "#71717a";
  if (u.movido) return "#f59e0b";
  if (Date.now() - new Date(u.capturadaEn).getTime() > 180 * 86400000) return "#a1a1aa";
  return "#dc2626";
};

export default function BuscarExtintoresModal({ socket, empresaId, sedeId, nombre, uidInicial, onClose }: Props) {
  const [lista, setLista] = useState<ExtintorUbicado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState<string | null>(uidInicial ?? null);
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [descarga, setDescarga] = useState<{ hechas: number; total: number } | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const cancelarDescarga = useRef<AbortController | null>(null);
  const claveZona = `${empresaId}:${sedeId ?? "todas"}`;
  const [zona, setZona] = useState(() => zonaGuardada(claveZona));
  const { posicion, error } = usePosicionEnVivo(true);
  const { rumbo, necesitaPermiso, pedirPermiso } = useBrujula(true);
  const dentroAntes = useRef(false);

  useTeclaEscape(!foto, onClose);

  useEffect(() => {
    if (!socket) return;
    let vigente = true;
    const cargar = () => socket.emit("ubicacion:sede", { empresaId, sedeId }, (res: any) => {
      if (!vigente) return;
      setCargando(false);
      if (res?.success) setLista(res.extintores || []);
    });
    cargar();
    const alCambiar = (d: { empresaId: string }) => { if (d?.empresaId === empresaId) cargar(); };
    socket.on("ubicacion:cambio", alCambiar);
    return () => { vigente = false; socket.off("ubicacion:cambio", alCambiar); };
  }, [socket, empresaId, sedeId]);

  useEffect(() => () => cancelarDescarga.current?.abort(), []);

  const ubicados = lista.filter((e) => e.ubicacion);
  const elegido = lista.find((e) => e.uid === seleccion) || null;
  const destino = elegido?.ubicacion ?? null;
  const distancia = destino && posicion ? distanciaMetros(posicion, destino) : null;
  const margen = destino && posicion ? destino.precision + Math.min(posicion.precision, 30) : null;
  const dentro = distancia !== null && margen !== null && distancia <= margen;
  const rumbo2 = destino && posicion ? rumboGrados(posicion, destino) : null;

  useEffect(() => {
    if (dentro && !dentroAntes.current) navigator.vibrate?.([120, 80, 120]);
    dentroAntes.current = dentro;
  }, [dentro]);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const base = q ? lista.filter((e) => [e.nInterno, e.nSerie, e.area, e.marca].some((v) => String(v || "").toLowerCase().includes(q))) : lista;
    return [...base].sort((a, b) => {
      if (!!a.ubicacion !== !!b.ubicacion) return a.ubicacion ? -1 : 1;
      if (posicion && a.ubicacion && b.ubicacion) return distanciaMetros(posicion, a.ubicacion) - distanciaMetros(posicion, b.ubicacion);
      return 0;
    });
  }, [lista, texto, posicion]);

  const marcadores: MarcadorMapa[] = ubicados.map((e) => ({
    id: e.uid, lat: e.ubicacion!.lat, lng: e.ubicacion!.lng, precision: e.ubicacion!.precision, color: colorDe(e),
    etiqueta: e.nInterno || (e.nSerie !== "S/N" ? e.nSerie : undefined), seleccionado: e.uid === seleccion, atenuado: !!seleccion && e.uid !== seleccion,
  }));

  const verFoto = () => {
    if (!socket || !destino?.fotoId) return;
    socket.emit("ubicacion:foto:get", { id: destino.fotoId }, (res: any) => {
      if (res?.success) setFoto(res.foto);
      else setMensaje(res?.error || "No se pudo abrir la foto");
    });
  };

  const descargar = async () => {
    const puntos = ubicados.map((e) => ({ lat: e.ubicacion!.lat, lng: e.ubicacion!.lng }));
    if (posicion) puntos.push(posicion);
    const limites = limitesDe(puntos, ubicados.length > 0 ? 250 : 400);
    if (!limites) {
      setMensaje("Necesito tu ubicación o al menos un extintor ubicado para saber qué zona descargar.");
      return;
    }
    const { teselas, megas } = planDescarga(limites);
    if (!navigator.onLine) {
      setMensaje("Conéctate a wifi o datos para descargar el mapa.");
      return;
    }
    setMensaje(null);
    const control = new AbortController();
    cancelarDescarga.current = control;
    setDescarga({ hechas: 0, total: teselas.length });
    const r = await descargarZona(claveZona, nombre, limites, (hechas, total) => setDescarga({ hechas, total }), control.signal);
    setDescarga(null);
    cancelarDescarga.current = null;
    if (control.signal.aborted) return;
    setZona(zonaGuardada(claveZona));
    setMensaje(r.ok ? `Mapa guardado (${megas} MB aprox.). Ya puedes usarlo sin señal.` : "No se pudo descargar todo el mapa. Inténtalo de nuevo con mejor conexión.");
  };

  return (
    <div className="fixed inset-0 z-60 bg-zinc-950 flex flex-col text-zinc-800">
      <div className="flex items-center gap-3 px-4 h-14 bg-zinc-900 text-white shrink-0">
        <MapPin className="w-5 h-5 text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate">Buscar extintores</p>
          <p className="text-[11px] text-zinc-400 truncate">{nombre} · {ubicados.length}/{lista.length} con ubicación</p>
        </div>
        {necesitaPermiso && (
          <button onClick={pedirPermiso} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-[11px] font-bold"><Compass className="w-4 h-4" />Brújula</button>
        )}
        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center" aria-label="Cerrar"><X className="w-4 h-4" /></button>
      </div>

      <MapaTeselas
        className="flex-1 min-h-0"
        marcadores={marcadores}
        usuario={posicion ? { ...posicion, rumbo } : null}
        linea={destino && posicion ? { desde: posicion, hasta: destino } : null}
        onMarcador={setSeleccion}
        claveAjuste={cargando ? undefined : `${empresaId}:${sedeId}:${ubicados.length > 0}`}
        enfocar={destino ? { punto: destino, clave: `${seleccion}` } : null}
      >
        {elegido && (
          <div className="absolute left-2 right-14 top-2 z-40 rounded-2xl bg-white/95 shadow-xl p-3 flex items-center gap-3" onPointerDown={(e) => e.stopPropagation()}>
            {destino ? (
              <>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${dentro ? "bg-emerald-600" : "bg-zinc-900"}`}>
                  {dentro ? <MapPin className="w-7 h-7 text-white" /> : rumbo2 !== null ? (
                    <ArrowUp className="w-8 h-8 text-white transition-transform" style={{ transform: `rotate(${rumbo2 - (rumbo ?? 0)}deg)` }} />
                  ) : <LoaderCircle className="w-6 h-6 text-white animate-spin" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-500 truncate">{nombreDe(elegido)}{elegido.area ? ` · ${elegido.area}` : ""}</p>
                  {distancia !== null ? (
                    <p className="text-lg font-black leading-tight">{dentro ? "Estás en la zona" : `${formatearDistancia(distancia)} al ${cardinal(rumbo2 ?? 0)}`}</p>
                  ) : (
                    <p className="text-sm font-black">{error || "Buscando tu posición…"}</p>
                  )}
                  <p className="text-[11px] text-zinc-500 truncate">
                    {destino.referencia ? `«${destino.referencia}» · ` : ""}{formatearPrecision(destino.precision)} · {haceCuanto(destino.capturadaEn)}
                  </p>
                  {rumbo === null && rumbo2 !== null && !dentro && <p className="text-[10px] text-zinc-400">Sin brújula: la flecha apunta con el norte hacia arriba.</p>}
                </div>
                {destino.fotoId && (
                  <button onClick={verFoto} className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0" aria-label="Ver foto del lugar"><ImageIcon className="w-5 h-5" /></button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-600"><MapPinOff className="w-5 h-5" />{nombreDe(elegido)} aún no tiene ubicación guardada.</div>
            )}
          </div>
        )}
      </MapaTeselas>

      <div className="bg-white rounded-t-3xl -mt-4 relative z-50 flex flex-col max-h-[42dvh] shrink-0">
        <div className="px-4 pt-3 pb-2 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-100">
            <Search className="w-4 h-4 text-zinc-400" />
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por N° interno, serie o área" className="flex-1 bg-transparent text-sm font-bold outline-none" />
          </div>
          {mensaje && <p className="text-xs font-bold text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2">{mensaje}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 flex flex-col gap-1.5">
          {cargando && <p className="text-xs text-zinc-400 text-center py-4">Cargando…</p>}
          {!cargando && lista.length === 0 && <p className="text-xs text-zinc-400 text-center py-4">No hay extintores en esta sede.</p>}
          {filtrados.map((e) => {
            const d = e.ubicacion && posicion ? distanciaMetros(posicion, e.ubicacion) : null;
            return (
              <button key={e.uid} onClick={() => setSeleccion(e.uid)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border ${e.uid === seleccion ? "border-red-300 bg-red-50" : "border-zinc-100 bg-white"}`}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorDe(e) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{nombreDe(e)}</p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {[e.area, e.agenteExtintor, e.peso && `${e.peso} ${e.unidadPeso}`].filter(Boolean).join(" · ") || "—"}
                    {e.ubicacion?.movido ? " · se movió" : ""}
                  </p>
                </div>
                <span className="text-xs font-black text-zinc-500 shrink-0">{e.ubicacion ? (d !== null ? formatearDistancia(d) : formatearPrecision(e.ubicacion.precision)) : "Sin ubicar"}</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-zinc-100 shrink-0">
          {descarga ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full bg-red-600 transition-all" style={{ width: `${Math.round((descarga.hechas / Math.max(1, descarga.total)) * 100)}%` }} /></div>
              <span className="text-xs font-black text-zinc-500">{Math.round((descarga.hechas / Math.max(1, descarga.total)) * 100)}%</span>
              <button onClick={() => cancelarDescarga.current?.abort()} className="text-xs font-bold text-red-600">Cancelar</button>
            </div>
          ) : (
            <button onClick={descargar} disabled={!mapaSinConexionDisponible()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 text-white text-sm font-black active:scale-95 disabled:opacity-40">
              <Download className="w-4 h-4" />{zona ? `Actualizar mapa sin señal (guardado ${haceCuanto(zona.fecha)})` : "Descargar mapa para usar sin señal"}
            </button>
          )}
          {!descarga && !mapaSinConexionDisponible() && (
            <p className="mt-1.5 text-[11px] text-zinc-400 text-center">Disponible en la app publicada (no en modo desarrollo).</p>
          )}
        </div>
      </div>

      {foto && (
        <div className="fixed inset-0 z-70 bg-black/90 flex items-center justify-center p-4" onClick={() => setFoto(null)}>
          <img src={foto} alt="Lugar del extintor" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
