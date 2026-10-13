import { useState } from "react";
import { CircleAlert, CloudOff, CloudUpload, LoaderCircle, RotateCcw, Trash2, Wifi, X } from "lucide-react";
import type { ResumenSinSenal, SocketSinSenal } from "./SocketSinSenal";
import { useTeclaEscape } from "../../../hooks/useTeclaEscape";
import { confirmar } from "../../../components/ui/Notificaciones";

export default function EstadoSincronizacion({ resumen, sinSenal }: { resumen: ResumenSinSenal; sinSenal: SocketSinSenal | null }) {
  const [abierto, setAbierto] = useState(false);
  useTeclaEscape(abierto, () => setAbierto(false));

  const { conectado, sincronizando, pendientes, fallidas } = resumen;
  const etiqueta = sincronizando
    ? `Enviando ${pendientes}…`
    : !conectado
      ? pendientes > 0 ? `Sin señal · ${pendientes}` : "Sin señal"
      : "En línea";
  const Icono = sincronizando ? LoaderCircle : !conectado ? CloudOff : Wifi;

  const descartar = async (id: string, descripcion: string) => {
    const ok = await confirmar({ titulo: "¿Descartar este cambio?", mensaje: `"${descripcion}" no se enviará al servidor.`, textoConfirmar: "Descartar", peligro: true });
    if (ok) sinSenal?.descartarFallida(id);
  };

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full border text-white transition-colors ${!conectado ? "bg-amber-500/90 border-amber-300/60" : "bg-red-950/30 border-red-900/30 hover:bg-red-950/50"}`}
        aria-label={`Estado de conexión: ${etiqueta}`}
      >
        {conectado && !sincronizando
          ? <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400 dot-pulse" />
          : <Icono className={`w-3.5 h-3.5 shrink-0 ${sincronizando ? "animate-spin" : ""}`} />}
        <span className="text-[10px] md:text-xs font-bold tracking-wide whitespace-nowrap">{etiqueta}</span>
        {fallidas.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-white text-red-700 text-[10px] font-black flex items-center justify-center shadow">
            {fallidas.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setAbierto(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[85vh] flex flex-col text-zinc-800" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-black flex items-center gap-2">
                {conectado ? <Wifi className="w-5 h-5 text-emerald-600" /> : <CloudOff className="w-5 h-5 text-amber-600" />}
                {conectado ? "Conectado" : "Trabajando sin señal"}
              </h3>
              <button onClick={() => setAbierto(false)} className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500" aria-label="Cerrar"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex flex-col gap-4">
              <p className="text-sm text-zinc-600 leading-relaxed">
                {conectado
                  ? "Todo lo que hagas se guarda directamente en el sistema."
                  : "Puedes seguir registrando extintores y servicios. Se guardan en este teléfono y se enviarán solos cuando vuelva la señal. No cierres sesión mientras tengas cambios pendientes."}
              </p>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendientes > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {sincronizando ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                </span>
                <div>
                  <p className="text-sm font-black">{pendientes === 0 ? "No hay cambios pendientes" : `${pendientes} cambio${pendientes === 1 ? "" : "s"} por enviar`}</p>
                  <p className="text-xs text-zinc-500">{sincronizando ? "Enviando al servidor…" : pendientes > 0 ? "Se enviarán cuando haya señal." : "Todo está al día."}</p>
                </div>
              </div>

              {!conectado && (
                <p className="text-xs text-zinc-500 bg-zinc-50 rounded-xl px-3 py-2.5">
                  Sin señal solo puedes abrir las empresas que ya abriste antes en este teléfono. Trasladar extintores, generar certificados y escanear extintores nuevos necesitan conexión.
                </p>
              )}

              {fallidas.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-black text-red-700 uppercase tracking-wide"><CircleAlert className="w-4 h-4" />No se pudieron enviar</p>
                  {fallidas.map((op) => (
                    <div key={op.id} className="flex items-start gap-3 p-3 rounded-xl border border-red-200 bg-red-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-800">{op.descripcion}</p>
                        <p className="text-xs text-red-700 mt-0.5">{op.error}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">{new Date(op.creadaEn).toLocaleString("es-PE")}</p>
                      </div>
                      <button onClick={() => descartar(op.id, op.descripcion)} className="w-8 h-8 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center shrink-0" aria-label="Descartar cambio"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button
                    onClick={() => sinSenal?.reintentarFallidas()}
                    disabled={!conectado}
                    className="mt-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-black disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />Reintentar envío
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
