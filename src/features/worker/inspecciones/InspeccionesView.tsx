import { useCallback, useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { Building, ChevronRight, CircleCheck, ClipboardCheck, ClipboardList, LoaderCircle, Map as MapaIcono, ScanQrCode, Search, SearchX, TriangleAlert, X } from "lucide-react";
import type { CampanaInspeccion, DetalleInspeccion, ExtintorInspeccion } from "../../../types";
import { useLectorQR } from "../extintores/useLectorQR";
import { rastreoUbicacion } from "../ubicacion/rastreoUbicacion";
import BuscarExtintoresModal from "../ubicacion/BuscarExtintoresModal";
import FormularioInspeccion from "./FormularioInspeccion";
import { nombreExtintor, textoPeriodo } from "./constantesInspeccion";

type Props = {
  socket: Socket | null;
  campanas: CampanaInspeccion[];
  onAviso: (mensaje: string, error?: boolean) => void;
};

type Filtro = "pendientes" | "inspeccionados" | "no_encontrados" | "todos";

function LectorQR({ onLeer, onClose }: { onLeer: (uid: string) => void; onClose: () => void }) {
  const lector = useLectorQR(onLeer);
  useEffect(() => {
    void lector.iniciar();
    return () => lector.detener();
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 gap-4">
      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-zinc-900">
        <video ref={lector.videoRef} muted playsInline className="w-full h-full object-cover" />
        <canvas ref={lector.canvasRef} className="hidden" />
        <div className="absolute inset-8 border-4 border-white/70 rounded-2xl pointer-events-none" />
      </div>
      <p className="text-sm font-bold text-white/80 text-center">{lector.errorCamara || "Apunta al código QR del extintor"}</p>
      <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold flex items-center gap-2"><X className="w-4 h-4" />Cerrar</button>
    </div>
  );
}

export default function InspeccionesView({ socket, campanas, onAviso }: Props) {
  const [campanaId, setCampanaId] = useState<string | null>(campanas.length === 1 ? campanas[0].id : null);
  const [detalle, setDetalle] = useState<DetalleInspeccion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const [texto, setTexto] = useState("");
  const [escaneando, setEscaneando] = useState(false);
  const [abierto, setAbierto] = useState<ExtintorInspeccion | null>(null);
  const [mapa, setMapa] = useState(false);

  const cargar = useCallback(() => {
    if (!socket || !campanaId) return;
    setCargando(true);
    socket.emit("insp:detalle", { id: campanaId }, (res: any) => {
      setCargando(false);
      if (res?.success) {
        setDetalle({ campana: res.campana, extintores: res.extintores || [], registros: res.registros || [] });
        setError(null);
      } else setError(res?.error || "No se pudo abrir la inspección");
    });
  }, [socket, campanaId]);

  useEffect(() => {
    setDetalle(null);
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!socket || !campanaId) return;
    const alCambiar = (d: { campanaId?: string }) => { if (!d?.campanaId || d.campanaId === campanaId) cargar(); };
    socket.on("insp:cambio", alCambiar);
    socket.on("connect", cargar);
    return () => {
      socket.off("insp:cambio", alCambiar);
      socket.off("connect", cargar);
    };
  }, [socket, campanaId, cargar]);

  const registroDe = useMemo(() => new Map((detalle?.registros || []).map((r) => [r.extintorUid, r])), [detalle]);
  const areas = useMemo(() => Array.from(new Set((detalle?.extintores || []).map((e) => e.area).filter(Boolean))).sort(), [detalle]);

  const conteo = useMemo(() => {
    const regs = detalle?.registros || [];
    const uids = new Set((detalle?.extintores || []).map((e) => e.uid));
    const validos = regs.filter((r) => uids.has(r.extintorUid));
    const inspeccionados = validos.filter((r) => r.estado === "inspeccionado").length;
    const noEncontrados = validos.filter((r) => r.estado === "no_encontrado").length;
    const total = uids.size;
    return { total, inspeccionados, noEncontrados, pendientes: total - inspeccionados - noEncontrados };
  }, [detalle]);

  const lista = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return (detalle?.extintores || [])
      .filter((e) => {
        const r = registroDe.get(e.uid);
        if (filtro === "pendientes" && r) return false;
        if (filtro === "inspeccionados" && r?.estado !== "inspeccionado") return false;
        if (filtro === "no_encontrados" && r?.estado !== "no_encontrado") return false;
        return !q || [e.nInterno, e.nSerie, e.area, e.marca].some((v) => String(v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => String(a.nInterno || a.nSerie).localeCompare(String(b.nInterno || b.nSerie), "es", { numeric: true }));
  }, [detalle, registroDe, filtro, texto]);

  const alLeerQR = (uid: string) => {
    setEscaneando(false);
    const ext = detalle?.extintores.find((e) => e.uid === uid);
    if (!ext) {
      onAviso("Este extintor no pertenece a esta inspección", true);
      return;
    }
    rastreoUbicacion.alEscanear(uid);
    setAbierto(ext);
  };

  if (!campanaId) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-red-700" />
          <h2 className="text-lg font-black text-zinc-800">Inspecciones activas</h2>
        </div>
        {campanas.length === 0 && <p className="text-sm text-zinc-500 bg-white rounded-2xl border border-zinc-200 p-5">No tienes inspecciones habilitadas. Pídele a Administración que abra una.</p>}
        {campanas.map((c) => {
          const hechos = c.inspeccionados + c.noEncontrados;
          return (
            <button key={c.id} onClick={() => setCampanaId(c.id)} className="text-left bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col gap-3 shadow-sm active:scale-[0.99]">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-zinc-800 truncate">{c.empresaNombre}</p>
                  <p className="text-xs font-bold text-zinc-500 flex items-center gap-1.5"><Building className="w-3.5 h-3.5" />{c.sedeNombre || "Toda la empresa"} · {textoPeriodo(c.periodo)}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${c.total ? (hechos / c.total) * 100 : 0}%` }} /></div>
              <p className="text-xs font-bold text-zinc-500">{hechos} de {c.total} revisados</p>
            </button>
          );
        })}
      </div>
    );
  }

  const campana = detalle?.campana || campanas.find((c) => c.id === campanaId);
  const pestanas: { id: Filtro; etiqueta: string; n: number }[] = [
    { id: "pendientes", etiqueta: "Pendientes", n: conteo.pendientes },
    { id: "inspeccionados", etiqueta: "Inspeccionados", n: conteo.inspeccionados },
    { id: "no_encontrados", etiqueta: "No encontrados", n: conteo.noEncontrados },
    { id: "todos", etiqueta: "Todos", n: conteo.total },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-8 flex flex-col gap-4 max-w-3xl mx-auto w-full">
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Inspección · {campana ? textoPeriodo(campana.periodo) : ""}</span>
              <p className="text-base font-black text-zinc-800 truncate">{campana?.empresaNombre}</p>
              <p className="text-xs font-bold text-zinc-500">{campana?.sedeNombre || "Toda la empresa"}</p>
            </div>
            {campanas.length > 1 && <button onClick={() => setCampanaId(null)} className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-2 rounded-xl">Cambiar</button>}
          </div>
          <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${conteo.total ? (conteo.inspeccionados / conteo.total) * 100 : 0}%` }} />
            <div className="h-full bg-amber-400" style={{ width: `${conteo.total ? (conteo.noEncontrados / conteo.total) * 100 : 0}%` }} />
          </div>
          <p className="text-xs font-bold text-zinc-500">{conteo.inspeccionados} inspeccionados · {conteo.noEncontrados} no encontrados · {conteo.pendientes} pendientes</p>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button onClick={() => setEscaneando(true)} disabled={!detalle} className="py-4 rounded-2xl bg-red-700 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 active:scale-95 disabled:opacity-50">
            <ScanQrCode className="w-6 h-6" />Escanear QR
          </button>
          <button onClick={() => setMapa(true)} disabled={!detalle} className="px-5 rounded-2xl bg-zinc-900 text-white font-black flex items-center gap-2 active:scale-95 disabled:opacity-50" aria-label="Ver mapa">
            <MapaIcono className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-zinc-200">
          <Search className="w-4 h-4 text-zinc-400" />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar a mano: N° interno, serie o ubicación" className="flex-1 bg-transparent text-sm font-bold outline-none" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {pestanas.map((p) => (
            <button key={p.id} onClick={() => setFiltro(p.id)} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black ${filtro === p.id ? "bg-red-700 text-white" : "bg-white border border-zinc-200 text-zinc-600"}`}>
              {p.etiqueta} ({p.n})
            </button>
          ))}
        </div>

        {cargando && !detalle && <p className="flex items-center justify-center gap-2 text-sm text-zinc-500 py-8"><LoaderCircle className="w-4 h-4 animate-spin" />Cargando…</p>}
        {error && <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}

        <div className="flex flex-col gap-2">
          {lista.map((e) => {
            const r = registroDe.get(e.uid);
            const conHallazgo = !!r && ((r.hallazgos?.length ?? 0) > 0 || !r.tarjetaCoincide);
            return (
              <button key={e.uid} onClick={() => setAbierto(e)} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-zinc-200 text-left active:scale-[0.99]">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!r ? "bg-zinc-100 text-zinc-400" : r.estado === "no_encontrado" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {!r ? <ClipboardList className="w-5 h-5" /> : r.estado === "no_encontrado" ? <SearchX className="w-5 h-5" /> : <CircleCheck className="w-5 h-5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-800 truncate">{nombreExtintor(e)}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{[e.area || "Sin ubicación", e.agenteExtintor, [e.peso, e.unidadPeso].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</p>
                </div>
                {conHallazgo && <TriangleAlert className="w-4 h-4 text-amber-500 shrink-0" />}
                {r?.pendiente && <span className="text-[10px] font-black text-amber-600 shrink-0">Por enviar</span>}
              </button>
            );
          })}
          {detalle && lista.length === 0 && <p className="text-sm text-zinc-400 text-center py-6">No hay extintores en esta lista.</p>}
        </div>
        <div className="h-8 shrink-0" />
      </div>

      {escaneando && <LectorQR onLeer={alLeerQR} onClose={() => setEscaneando(false)} />}

      {abierto && detalle && (
        <FormularioInspeccion
          socket={socket}
          campana={detalle.campana}
          extintor={abierto}
          registro={registroDe.get(abierto.uid)}
          areas={areas}
          onClose={() => setAbierto(null)}
          onGuardado={onAviso}
        />
      )}

      {mapa && detalle && (
        <BuscarExtintoresModal
          socket={socket}
          empresaId={detalle.campana.empresaId}
          sedeId={detalle.campana.sedeId ?? undefined}
          nombre={detalle.campana.sedeNombre || detalle.campana.empresaNombre}
          onClose={() => setMapa(false)}
        />
      )}
    </div>
  );
}
