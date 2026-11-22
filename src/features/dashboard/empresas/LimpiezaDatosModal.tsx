import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { ArrowRight, CalendarX2, LoaderCircle, Tag, X } from "lucide-react";
import { confirmar } from "../../../components/ui/Notificaciones";
import { useTeclaEscape } from "../../../hooks/useTeclaEscape";

export type ModoLimpieza = "servicios" | "internos";

type ServicioVacio = { id: string; empresaId: string; empresa: string; sedeId: string | null; sede: string; fechaRetiro: string; fechaEntrega: string; notas: string; secuencia: number; creadoEn: string };
type InternoSinCodigo = { uid: string; empresaId: string; empresa: string; sede: string; nSerie: string; nInterno: string; marca: string; agente: string; capacidad: string; estado: string };

const emitir = (socket: Socket, evento: string, data: any) => new Promise<any>((r) => socket.emit(evento, data, r));
const fecha = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

const TEXTOS: Record<ModoLimpieza, { titulo: string; detalle: string; vacio: string; accion: string; icono: typeof Tag }> = {
  servicios: {
    titulo: "Servicios vacíos",
    detalle: "Servicios sin extintores ni certificado, creados hace más de un día. Revisa y elimina los que no se usan.",
    vacio: "No hay servicios vacíos.",
    accion: "Eliminar",
    icono: CalendarX2,
  },
  internos: {
    titulo: "N° interno sin código",
    detalle: "Extintores con N° interno «SN», «S/N», «SIN» o vacío. Al aceptar, pasan a «S/TAG», igual que los registrados desde el panel.",
    vacio: "No hay extintores con N° interno por corregir.",
    accion: "Cambiar a S/TAG",
    icono: Tag,
  },
};

interface Props {
  modo: ModoLimpieza | null;
  socket: Socket | null;
  onClose: () => void;
  onCambio: () => void;
}

export default function LimpiezaDatosModal({ modo, socket, onClose, onCambio }: Props) {
  const [items, setItems] = useState<(ServicioVacio | InternoSinCodigo)[] | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [aplicando, setAplicando] = useState(false);

  useTeclaEscape(!!modo && !aplicando, onClose);

  const clave = (x: any) => (modo === "servicios" ? x.id : x.uid);

  useEffect(() => {
    if (!modo || !socket) return;
    setItems(null);
    emitir(socket, modo === "servicios" ? "datos:serviciosVacios" : "datos:internosSinCodigo", {}).then((res) => {
      if (!res?.success) { toast.error(res?.error || "No se pudo cargar la lista"); setItems([]); return; }
      const lista = modo === "servicios" ? res.servicios : res.extintores;
      setItems(lista);
      setMarcados(new Set(lista.map((x: any) => (modo === "servicios" ? x.id : x.uid))));
    });
  }, [modo, socket]);

  const grupos = useMemo(() => {
    const m = new Map<string, { empresa: string; lista: any[] }>();
    for (const x of items || []) {
      const g = m.get(x.empresaId) || { empresa: x.empresa, lista: [] };
      g.lista.push(x);
      m.set(x.empresaId, g);
    }
    return [...m.entries()];
  }, [items]);

  if (!modo) return null;
  const t = TEXTOS[modo];
  const Icono = t.icono;

  const alternar = (k: string) => setMarcados((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const alternarGrupo = (lista: any[]) => setMarcados((p) => {
    const n = new Set(p);
    const todos = lista.every((x) => n.has(clave(x)));
    lista.forEach((x) => (todos ? n.delete(clave(x)) : n.add(clave(x))));
    return n;
  });

  const aplicar = async () => {
    if (!socket || !items || marcados.size === 0) return;
    const elegidos = items.filter((x) => marcados.has(clave(x)));
    const ok = await confirmar({
      titulo: modo === "servicios" ? `¿Eliminar ${elegidos.length} servicio${elegidos.length === 1 ? "" : "s"} vacío${elegidos.length === 1 ? "" : "s"}?` : `¿Cambiar ${elegidos.length} N° interno a S/TAG?`,
      mensaje: modo === "servicios" ? "Solo se eliminan servicios sin extintores ni certificado." : "El N° de serie y los demás datos no cambian.",
      textoConfirmar: t.accion,
      peligro: modo === "servicios",
    });
    if (!ok) return;
    setAplicando(true);
    if (modo === "servicios") {
      let fallidos = 0;
      for (const s of elegidos as ServicioVacio[]) {
        const res = await emitir(socket, "servicio:delete", { id: s.id, empresaId: s.empresaId, sedeId: s.sedeId });
        if (!res?.success) fallidos++;
      }
      if (fallidos) toast.error(`${fallidos} servicio(s) no se pudieron eliminar`);
      else toast.success(`${elegidos.length} servicio${elegidos.length === 1 ? "" : "s"} eliminado${elegidos.length === 1 ? "" : "s"}`);
    } else {
      const res = await emitir(socket, "datos:internosSinCodigo:convertir", { uids: elegidos.map((x: any) => x.uid) });
      if (res?.success) toast.success(`${res.convertidos} N° interno cambiado${res.convertidos === 1 ? "" : "s"} a S/TAG`);
      else toast.error(res?.error || "No se pudo aplicar el cambio");
    }
    setAplicando(false);
    onCambio();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2"><Icono className="w-5 h-5 text-red-500" />{t.titulo}</h2>
            <p className="text-xs text-zinc-500 mt-1">{t.detalle}</p>
          </div>
          <button onClick={onClose} disabled={aplicando} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-40" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {items === null ? (
            <div className="flex justify-center py-12"><LoaderCircle className="w-6 h-6 text-zinc-500 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-12">{t.vacio}</p>
          ) : grupos.map(([empresaId, g]) => {
            const todos = g.lista.every((x) => marcados.has(clave(x)));
            return (
              <section key={empresaId} className="rounded-xl border border-zinc-800/70 overflow-hidden">
                <label className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900/70 border-b border-zinc-800/70 cursor-pointer">
                  <input type="checkbox" checked={todos} onChange={() => alternarGrupo(g.lista)} className="w-4 h-4 accent-red-600" />
                  <span className="text-sm font-black text-zinc-100 flex-1 truncate">{g.empresa}</span>
                  <span className="text-[11px] font-bold text-zinc-500">{g.lista.length}</span>
                </label>
                <ul className="divide-y divide-zinc-800/50">
                  {g.lista.map((x: any) => (
                    <li key={clave(x)}>
                      <label className="flex items-start gap-3 px-4 py-2.5 text-xs cursor-pointer hover:bg-zinc-900/40">
                        <input type="checkbox" checked={marcados.has(clave(x))} onChange={() => alternar(clave(x))} className="w-4 h-4 mt-0.5 accent-red-600" />
                        {modo === "servicios" ? (
                          <span className="flex-1 min-w-0">
                            <span className="font-bold text-zinc-200">Servicio {x.secuencia || ""} · Retiro {fecha(x.fechaRetiro)}{x.fechaEntrega ? ` · Entrega ${fecha(x.fechaEntrega)}` : ""}</span>
                            <span className="block text-zinc-500">{[x.sede && `Sede ${x.sede}`, `Creado ${fecha(x.creadoEn)}`].filter(Boolean).join(" · ")}</span>
                            {x.notas && <span className="block text-sky-300/90 italic truncate">«{x.notas}»</span>}
                          </span>
                        ) : (
                          <span className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                            <span className="min-w-0 flex-1">
                              <span className="font-bold text-zinc-200">Serie {x.nSerie || "—"}</span>
                              <span className="block text-zinc-500 truncate">{[x.marca, x.agente, x.capacidad, x.estado, x.sede && `Sede ${x.sede}`].filter(Boolean).join(" · ")}</span>
                            </span>
                            <span className="flex items-center gap-1.5 font-bold shrink-0">
                              <span className="text-amber-300">{x.nInterno || "vacío"}</span>
                              <ArrowRight className="w-3 h-3 text-zinc-600" />
                              <span className="text-emerald-300">S/TAG</span>
                            </span>
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {items && items.length > 0 && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-zinc-800">
            <span className="text-xs font-bold text-zinc-500">{marcados.size} de {items.length} seleccionados</span>
            <button onClick={aplicar} disabled={aplicando || marcados.size === 0} className={`px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 disabled:opacity-40 ${modo === "servicios" ? "bg-red-600 hover:bg-red-500 text-white" : "bg-zinc-100 hover:bg-white text-zinc-950"}`}>
              {aplicando && <LoaderCircle className="w-4 h-4 animate-spin" />}{t.accion} ({marcados.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
