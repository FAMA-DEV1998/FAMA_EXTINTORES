import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { FlaskConical, History, Image as ImageIcon, MapPin, MapPinOff, Search, TriangleAlert, X } from "lucide-react";
import type { ExtintorUbicado, LecturaHistorial, ResumenUbicaciones } from "../../../types";
import MapaTeselas, { type MarcadorMapa } from "../../../components/mapa/MapaTeselas";
import { formatearDistancia, formatearPrecision, haceCuanto } from "../../../utils/geo";

const claveDe = (r: { empresaId: string; sedeId: string | null }) => `${r.empresaId}:${r.sedeId ?? ""}`;
const nombreDe = (e: ExtintorUbicado) => [e.nInterno && `N° ${e.nInterno}`, e.nSerie && e.nSerie !== "S/N" ? e.nSerie : ""].filter(Boolean).join(" · ") || "S/N";
const fecha = (iso: string) => new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const colorDe = (e: ExtintorUbicado) => {
  const u = e.ubicacion;
  if (!u) return "#71717a";
  if (u.movido) return "#f59e0b";
  if (Date.now() - new Date(u.capturadaEn).getTime() > 180 * 86400000) return "#a1a1aa";
  return "#dc2626";
};

export default function UbicacionesPage({ socket }: { socket: Socket | null }) {
  const [resumen, setResumen] = useState<ResumenUbicaciones[]>([]);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [activa, setActiva] = useState<ResumenUbicaciones | null>(null);
  const [extintores, setExtintores] = useState<ExtintorUbicado[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [historial, setHistorial] = useState<LecturaHistorial[]>([]);
  const [foto, setFoto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [verSinUbicar, setVerSinUbicar] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const cargar = () => socket.emit("ubicacion:resumen", {}, (res: any) => {
      setCargandoResumen(false);
      if (res?.success) setResumen(res.lista || []);
    });
    cargar();
    socket.on("ubicacion:cambio", cargar);
    return () => { socket.off("ubicacion:cambio", cargar); };
  }, [socket]);

  useEffect(() => {
    if (!activa && resumen.length > 0) setActiva(resumen[0]);
  }, [resumen, activa]);

  useEffect(() => {
    if (!socket || !activa) return;
    const cargar = () => socket.emit("ubicacion:sede", { empresaId: activa.empresaId, sedeId: activa.sedeId }, (res: any) => {
      if (res?.success) setExtintores(res.extintores || []);
    });
    setExtintores([]);
    setSeleccion(null);
    cargar();
    const alCambiar = (d: { empresaId: string }) => { if (d?.empresaId === activa.empresaId) cargar(); };
    socket.on("ubicacion:cambio", alCambiar);
    return () => { socket.off("ubicacion:cambio", alCambiar); };
  }, [socket, activa]);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const subir = () => setVersion((v) => v + 1);
    socket.on("ubicacion:cambio", subir);
    return () => { socket.off("ubicacion:cambio", subir); };
  }, [socket]);

  useEffect(() => {
    if (!socket || !seleccion) {
      setHistorial([]);
      return;
    }
    socket.emit("ubicacion:extintor", { uid: seleccion }, (res: any) => {
      if (res?.success) setHistorial(res.historial || []);
    });
  }, [socket, seleccion, version]);

  const alternarDescarte = (h: LecturaHistorial) => socket?.emit("ubicacion:descartar", { id: h.id, descartada: !h.descartada }, () => undefined);

  const ubicados = extintores.filter((e) => e.ubicacion);
  const sinUbicar = extintores.filter((e) => !e.ubicacion);
  const movidos = ubicados.filter((e) => e.ubicacion?.movido);
  const elegido = extintores.find((e) => e.uid === seleccion) || null;

  const resumenFiltrado = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return q ? resumen.filter((r) => `${r.razonSocial} ${r.sedeNombre || ""}`.toLowerCase().includes(q)) : resumen;
  }, [resumen, filtro]);

  const marcadores: MarcadorMapa[] = ubicados.map((e) => ({
    id: e.uid, lat: e.ubicacion!.lat, lng: e.ubicacion!.lng, precision: e.ubicacion!.precision, color: colorDe(e),
    etiqueta: e.nInterno || (e.nSerie !== "S/N" ? e.nSerie : undefined), seleccionado: e.uid === seleccion, atenuado: !!seleccion && e.uid !== seleccion,
  }));
  const rastro = historial.filter((h) => !h.descartada).slice().reverse().map((h) => ({ lat: h.lat, lng: h.lng }));

  const verFoto = (id: string) => socket?.emit("ubicacion:foto:get", { id }, (res: any) => { if (res?.success) setFoto(res.foto); });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />Ubicación de extintores
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-black uppercase tracking-wider"><FlaskConical className="w-3 h-3" />Experimental</span>
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Última posición guardada por los técnicos al escanear o registrar cada extintor.</p>
        </div>
        {activa && (
          <div className="flex gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">{ubicados.length}/{extintores.length} ubicados</span>
            {movidos.length > 0 && <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">{movidos.length} movido{movidos.length === 1 ? "" : "s"}</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-5">
        <div className="flex flex-col gap-2 rounded-2xl bg-zinc-900/50 border border-zinc-800 p-3 lg:max-h-[75vh] overflow-y-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800">
            <Search className="w-4 h-4 text-zinc-500" />
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar empresa o sede" className="flex-1 bg-transparent text-sm text-zinc-200 outline-none" />
          </div>
          {cargandoResumen && <p className="text-xs text-zinc-500 p-3">Cargando…</p>}
          {!cargandoResumen && resumen.length === 0 && (
            <p className="text-xs text-zinc-500 p-3 leading-relaxed">Todavía no hay ubicaciones. Se guardan cuando un técnico escanea el QR o registra un extintor desde la app Worker.</p>
          )}
          {resumenFiltrado.map((r) => (
            <button key={claveDe(r)} onClick={() => setActiva(r)} className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${activa && claveDe(activa) === claveDe(r) ? "bg-red-950/30 border-red-900/50" : "border-transparent hover:bg-zinc-800/60"}`}>
              <p className="text-sm font-bold text-zinc-100 truncate">{r.razonSocial}</p>
              <p className="text-[11px] text-zinc-500 truncate">{r.sedeNombre || "Sin sede"} · {r.conUbicacion}/{r.total} · {r.ultima ? haceCuanto(r.ultima) : ""}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <MapaTeselas
            className="h-[55vh] min-h-80 rounded-2xl border border-zinc-800"
            marcadores={marcadores}
            rastro={rastro}
            onMarcador={setSeleccion}
            claveAjuste={activa ? `${claveDe(activa)}:${ubicados.length > 0}` : undefined}
            enfocar={elegido?.ubicacion ? { punto: elegido.ubicacion, clave: elegido.uid } : null}
          />

          {elegido && (
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-black text-white">{nombreDe(elegido)}</p>
                  <p className="text-xs text-zinc-500">{[elegido.area, elegido.agenteExtintor, elegido.peso && `${elegido.peso} ${elegido.unidadPeso}`, elegido.estadoExtintor].filter(Boolean).join(" · ")}</p>
                </div>
                <button onClick={() => setSeleccion(null)} className="text-zinc-500 hover:text-white" aria-label="Cerrar detalle"><X className="w-4 h-4" /></button>
              </div>
              {elegido.ubicacion ? (
                <div className="flex flex-col gap-1.5 text-sm text-zinc-300">
                  <p><span className="text-zinc-500">Precisión:</span> {formatearPrecision(elegido.ubicacion.precision)} · {elegido.ubicacion.lecturas} visita{elegido.ubicacion.lecturas === 1 ? "" : "s"} combinada{elegido.ubicacion.lecturas === 1 ? "" : "s"}</p>
                  <p><span className="text-zinc-500">Guardada:</span> {fecha(elegido.ubicacion.capturadaEn)}{elegido.ubicacion.usuarioNombre ? ` por ${elegido.ubicacion.usuarioNombre}` : ""}</p>
                  {elegido.ubicacion.referencia && <p><span className="text-zinc-500">Referencia:</span> {elegido.ubicacion.referencia}</p>}
                  {elegido.ubicacion.movido && (
                    <p className="flex items-center gap-1.5 text-amber-400 font-bold"><TriangleAlert className="w-4 h-4" />Se movió {formatearDistancia(elegido.ubicacion.movido.distancia)} desde su ubicación del {fecha(elegido.ubicacion.movido.desde)}</p>
                  )}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${elegido.ubicacion.lat},${elegido.ubicacion.lng}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-red-400 hover:text-red-300 self-start">Abrir en Google Maps</a>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-zinc-500"><MapPinOff className="w-4 h-4" />Sin ubicación guardada.</p>
              )}
              {historial.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-800">
                  <p className="flex items-center gap-1.5 text-[11px] font-black text-zinc-500 uppercase tracking-wider"><History className="w-3.5 h-3.5" />Historial de ubicaciones</p>
                  {historial.map((h) => (
                    <div key={h.id} className={`flex items-center gap-3 text-xs ${h.descartada ? "text-zinc-600" : "text-zinc-400"}`}>
                      <span className="w-44 shrink-0 whitespace-nowrap">{fecha(h.capturadaEn)}</span>
                      <span className="w-14 shrink-0">{formatearPrecision(h.precision)}</span>
                      <span className="flex-1 truncate">{h.usuarioNombre}{h.referencia ? ` · ${h.referencia}` : ""}{h.descartada ? " · descartada" : ""}</span>
                      {h.tieneFoto && <button onClick={() => verFoto(h.id)} className="text-zinc-400 hover:text-white" aria-label="Ver foto"><ImageIcon className="w-4 h-4" /></button>}
                      <button onClick={() => alternarDescarte(h)} className="no-underline text-[11px] font-bold text-zinc-500 hover:text-white shrink-0" title={h.descartada ? "Volver a usar esta lectura" : "No usar esta lectura (por ejemplo, si se tomó en el taller)"}>{h.descartada ? "Restaurar" : "Descartar"}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activa && (
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
              <div className="grid grid-cols-[1fr_6rem_7rem] gap-3 px-4 py-2.5 text-[11px] font-black text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <span>Extintor</span><span>Precisión</span><span>Guardada</span>
              </div>
              {ubicados.map((e) => (
                <button key={e.uid} onClick={() => setSeleccion(e.uid)} className={`w-full grid grid-cols-[1fr_6rem_7rem] gap-3 px-4 py-2.5 text-left text-sm border-b border-zinc-800/60 hover:bg-zinc-800/40 ${e.uid === seleccion ? "bg-red-950/20" : ""}`}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorDe(e) }} />
                    <span className="truncate text-zinc-200 font-bold">{nombreDe(e)}</span>
                    {e.area && <span className="truncate text-zinc-500 text-xs">{e.area}</span>}
                  </span>
                  <span className="text-zinc-400">{formatearPrecision(e.ubicacion!.precision)}</span>
                  <span className="text-zinc-400">{haceCuanto(e.ubicacion!.capturadaEn)}</span>
                </button>
              ))}
              {sinUbicar.length > 0 && (
                <>
                  <button onClick={() => setVerSinUbicar((v) => !v)} className="w-full px-4 py-2.5 text-left text-xs font-bold text-zinc-500 hover:text-zinc-300">
                    {verSinUbicar ? "Ocultar" : "Ver"} {sinUbicar.length} sin ubicación
                  </button>
                  {verSinUbicar && sinUbicar.map((e) => (
                    <div key={e.uid} className="px-4 py-2 text-sm text-zinc-500 border-t border-zinc-800/60 flex gap-2">
                      <MapPinOff className="w-4 h-4 shrink-0" />{nombreDe(e)}{e.area ? ` · ${e.area}` : ""}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {foto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6" onClick={() => setFoto(null)}>
          <img src={foto} alt="Lugar del extintor" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
