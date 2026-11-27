import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Camera, Crosshair, LoaderCircle, MapPin, MapPinOff, Trash2, TriangleAlert } from "lucide-react";
import type { UbicacionActual } from "../../../types";
import { Card, inputCls } from "../components/FormularioUI";
import { compressImage } from "../../../utils/archivos";
import { calidadPrecision, distanciaMetros, formatearDistancia, formatearPrecision, haceCuanto } from "../../../utils/geo";
import { rastreoUbicacion } from "./rastreoUbicacion";
import { useRastreoUbicacion } from "./useUbicacion";

const COLOR_CALIDAD = { alta: "bg-emerald-500", media: "bg-amber-500", baja: "bg-red-500" } as const;

export default function UbicacionFormulario({ socket, uid }: { socket: Socket | null; uid?: string }) {
  const r = useRastreoUbicacion();
  const [anterior, setAnterior] = useState<UbicacionActual | null>(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const fotoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!socket || !uid) return;
    let vigente = true;
    socket.emit("ubicacion:extintor", { uid }, (res: any) => {
      if (vigente && res?.success) setAnterior(res.actual ?? null);
    });
    return () => { vigente = false; };
  }, [socket, uid]);

  if (!r.activa) return null;

  const { captura } = r;
  const lectura = captura.lectura;
  const buscando = captura.estado === "buscando" || captura.estado === "mejorando";
  const movido = anterior && lectura ? distanciaMetros(anterior, lectura) : null;
  const pareceMovido = anterior && lectura && movido !== null && movido > anterior.precision + lectura.precision + 8;

  const tomarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setProcesandoFoto(true);
    try {
      rastreoUbicacion.setFoto(await compressImage(archivo, 1024, 0.55));
    } catch { }
    setProcesandoFoto(false);
  };

  return (
    <Card title="Ubicación del extintor" icon={MapPin}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={r.guardar} onChange={(e) => rastreoUbicacion.setGuardar(e.target.checked)} className="mt-0.5 w-5 h-5 accent-red-700 shrink-0" />
        <span className="flex flex-col">
          <span className="text-sm font-black text-zinc-800">Guardar la ubicación de este extintor</span>
          <span className="text-xs text-zinc-500">Déjalo marcado solo si estás junto al extintor.</span>
        </span>
      </label>

      {r.guardar && (
        <>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            {captura.estado === "sin-permiso" || captura.estado === "no-disponible" ? (
              <>
                <MapPinOff className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-xs font-bold text-red-700">
                  {captura.estado === "sin-permiso" ? "El navegador no tiene permiso de ubicación. Actívalo en los ajustes del sitio y vuelve a intentar." : "Este teléfono no permite usar el GPS desde la app."}
                </p>
              </>
            ) : lectura ? (
              <>
                <span className={`w-3 h-3 rounded-full shrink-0 ${COLOR_CALIDAD[calidadPrecision(lectura.precision)]} ${buscando ? "dot-pulse" : ""}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-800">Precisión {formatearPrecision(lectura.precision)}</p>
                  <p className="text-[11px] text-zinc-500">{buscando ? `Mejorando… ${lectura.muestras} lectura${lectura.muestras === 1 ? "" : "s"}. Quédate quieto junto al extintor.` : `${lectura.muestras} lecturas combinadas`}</p>
                </div>
              </>
            ) : (
              <>
                <LoaderCircle className="w-5 h-5 text-zinc-400 animate-spin shrink-0" />
                <p className="text-xs font-bold text-zinc-500">Buscando señal GPS… sal a un lugar abierto si tarda.</p>
              </>
            )}
            {captura.estado !== "sin-permiso" && captura.estado !== "no-disponible" && (
              <button type="button" onClick={() => rastreoUbicacion.afinar()} className="shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white border border-zinc-200 text-[11px] font-black text-zinc-700 active:scale-95" title="Vuelve a medir desde donde estás">
                <Crosshair className="w-3.5 h-3.5" />Afinar
              </button>
            )}
          </div>

          {pareceMovido && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <TriangleAlert className="w-4 h-4 shrink-0" />Parece que el extintor se movió unos {formatearDistancia(movido!)} desde la última vez.
            </div>
          )}
        </>
      )}

      {anterior && (
        <p className="text-[11px] text-zinc-500">
          Última ubicación: {haceCuanto(anterior.capturadaEn)} · {formatearPrecision(anterior.precision)}{anterior.usuarioNombre ? ` · ${anterior.usuarioNombre}` : ""}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-zinc-500">Referencia del lugar</label>
        <input
          value={r.referencia}
          onChange={(e) => rastreoUbicacion.setReferencia(e.target.value)}
          placeholder="Ej.: columna C4, junto a la puerta del taller"
          className={inputCls}
        />
        {anterior?.referencia && !r.referencia && (
          <button type="button" onClick={() => rastreoUbicacion.setReferencia(anterior.referencia)} className="self-start px-2.5 py-1 rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-600 active:scale-95">
            Usar la anterior: «{anterior.referencia}»
          </button>
        )}
      </div>

      <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={tomarFoto} />
      {r.foto ? (
        <div className="relative w-full max-w-60 aspect-4/3 rounded-xl overflow-hidden border border-zinc-200">
          <img src={r.foto} alt="Lugar del extintor" className="w-full h-full object-cover" />
          <button type="button" onClick={() => rastreoUbicacion.setFoto("")} className="absolute top-1.5 right-1.5 w-8 h-8 rounded-lg bg-black/60 text-white flex items-center justify-center" aria-label="Quitar foto del lugar"><Trash2 className="w-4 h-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => fotoRef.current?.click()} disabled={procesandoFoto} className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-600 text-sm font-bold active:scale-95 disabled:opacity-50">
          {procesandoFoto ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}Foto del lugar (opcional)
        </button>
      )}
      <p className="text-[11px] text-zinc-400 -mt-2">La foto se envía después de los datos, para no trabar el envío con poca señal.</p>
    </Card>
  );
}
