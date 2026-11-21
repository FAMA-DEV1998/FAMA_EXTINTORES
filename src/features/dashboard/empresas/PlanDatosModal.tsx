import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { ArrowRightLeft, Building, CircleCheck, Clock, FileJson, GitMerge, LoaderCircle, RefreshCw, TriangleAlert, Upload, X, type LucideIcon } from "lucide-react";
import { confirmar } from "../../../components/ui/Notificaciones";
import { useTeclaEscape } from "../../../hooks/useTeclaEscape";
import type { AccionExtintor } from "./FusionEmpresasModal";

export type DatosUnificar = { origen: string; destino: string; sedeDestinoId: string | null; acciones: Record<string, { accion: AccionExtintor; destinoUid?: string }> };

type Paso = {
  indice: number;
  accion: "crear_sede" | "reasignar_extintores" | "unificar_empresas" | string;
  estado: "listo" | "hecho" | "espera" | "error";
  resumen: string;
  nota?: string;
  avisos?: string[];
  datos?: any;
};

const ACCIONES: Record<string, { icono: LucideIcon; titulo: string; boton: string }> = {
  crear_sede: { icono: Building, titulo: "Crear sede", boton: "Crear sede" },
  reasignar_extintores: { icono: ArrowRightLeft, titulo: "Reasignar extintores", boton: "Reasignar" },
  unificar_empresas: { icono: GitMerge, titulo: "Unificar empresas", boton: "Abrir en Unificar" },
};

const ESTADOS: Record<Paso["estado"], { texto: string; clase: string; icono: LucideIcon }> = {
  listo: { texto: "Listo para aplicar", clase: "bg-sky-950/40 border-sky-900/50 text-sky-300", icono: Clock },
  hecho: { texto: "Hecho", clase: "bg-emerald-950/40 border-emerald-900/50 text-emerald-300", icono: CircleCheck },
  espera: { texto: "Espera un paso anterior", clase: "bg-zinc-800/60 border-zinc-700 text-zinc-400", icono: Clock },
  error: { texto: "No se puede aplicar", clase: "bg-red-950/40 border-red-900/50 text-red-300", icono: TriangleAlert },
};

const emitir = (socket: Socket, evento: string, data: any) =>
  new Promise<any>((resolve) => socket.emit(evento, data, (res: any) => resolve(res)));

interface Props {
  isOpen: boolean;
  visible: boolean;
  onClose: () => void;
  socket: Socket | null;
  onUnificar: (datos: DatosUnificar) => void;
}

export default function PlanDatosModal({ isOpen, visible, onClose, socket, onUnificar }: Props) {
  const [archivo, setArchivo] = useState("");
  const [plan, setPlan] = useState<any | null>(null);
  const [pasos, setPasos] = useState<Paso[]>([]);
  const [error, setError] = useState("");
  const [validando, setValidando] = useState(false);
  const [aplicando, setAplicando] = useState<number | null>(null);
  const [progreso, setProgreso] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useTeclaEscape(isOpen && visible && aplicando === null, onClose);

  const validar = async (p: any = plan) => {
    if (!socket || !p) return;
    setValidando(true);
    const res = await emitir(socket, "plan:validar", { plan: p });
    setValidando(false);
    if (res?.success) { setPasos(res.pasos || []); setError(""); }
    else { setPasos([]); setError(res?.error || "No se pudo revisar el plan"); }
  };

  useEffect(() => {
    if (isOpen && visible && plan) validar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, visible]);

  useEffect(() => {
    if (isOpen) return;
    setArchivo(""); setPlan(null); setPasos([]); setError(""); setProgreso("");
  }, [isOpen]);

  if (!isOpen || !visible) return null;

  const leerArchivo = async (f: File | undefined) => {
    if (!f) return;
    setArchivo(f.name);
    try {
      const p = JSON.parse(await f.text());
      setPlan(p);
      await validar(p);
    } catch {
      setPlan(null); setPasos([]);
      setError("El archivo no es un JSON válido.");
    }
  };

  const aplicar = async (paso: Paso) => {
    if (!socket || paso.estado !== "listo") return;
    const d = paso.datos;
    if (paso.accion === "unificar_empresas") { onUnificar(d); return; }
    const ok = await confirmar({
      titulo: paso.accion === "crear_sede" ? "¿Crear esta sede?" : "¿Reasignar estos extintores?",
      mensaje: paso.resumen,
      textoConfirmar: ACCIONES[paso.accion]?.boton || "Aplicar",
    });
    if (!ok) return;
    setAplicando(paso.indice);
    if (paso.accion === "crear_sede") {
      const res = await emitir(socket, "sede:save", { id: "", empresaId: d.empresaId, nombre: d.nombre, direccion: d.direccion, distrito: d.distrito });
      if (res?.success) toast.success(`Sede «${d.nombre}» creada`);
      else toast.error(res?.error || "No se pudo crear la sede");
    } else if (paso.accion === "reasignar_extintores") {
      const fecha = new Date().toISOString().slice(0, 10);
      let fallidos = 0;
      for (let i = 0; i < d.extintores.length; i++) {
        const x = d.extintores[i];
        setProgreso(`${i + 1} de ${d.extintores.length}`);
        const res = await emitir(socket, "traslado:create", { extintorUid: x.uid, rowIndex: x.rowIndex, empresaId: d.empresaId, sedeOrigenId: x.sedeOrigenId, sedeDestinoId: d.sedeDestinoId, fecha, motivo: d.motivo });
        if (!res?.success) fallidos++;
      }
      setProgreso("");
      if (fallidos) toast.error(`${fallidos} extintor(es) no se pudieron reasignar`);
      else toast.success(`${d.extintores.length} extintor(es) reasignados`);
    }
    setAplicando(null);
    await validar();
  };

  const listos = pasos.filter((p) => p.estado === "listo").length;
  const hechos = pasos.filter((p) => p.estado === "hecho").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2"><FileJson className="w-5 h-5 text-red-500" />Importar plan de datos</h2>
            <p className="text-xs text-zinc-500 mt-1">El plan no cambia nada por sí solo: revisa cada paso y aplícalo. Las unificaciones se confirman en su pantalla y se pueden revertir.</p>
          </div>
          <button onClick={onClose} disabled={aplicando !== null} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-40" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { leerArchivo(e.target.files?.[0]); e.target.value = ""; }} />
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => input.current?.click()} disabled={aplicando !== null} className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white flex items-center gap-2 disabled:opacity-50"><Upload className="w-4 h-4" />{archivo ? "Elegir otro archivo" : "Elegir archivo .json"}</button>
            {archivo && <span className="text-xs font-bold text-zinc-400 truncate max-w-60">{archivo}</span>}
            {plan && (
              <button onClick={() => validar()} disabled={validando || aplicando !== null} className="ml-auto px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:border-zinc-600 flex items-center gap-1.5 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${validando ? "animate-spin" : ""}`} />Volver a revisar
              </button>
            )}
          </div>

          {error && <p className="flex items-start gap-2 p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-sm text-red-300"><TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}

          {pasos.length > 0 && (
            <p className="text-xs font-bold text-zinc-500">{pasos.length} pasos · {hechos} hechos · {listos} listos para aplicar</p>
          )}

          <ol className="flex flex-col gap-2.5">
            {pasos.map((p) => {
              const a = ACCIONES[p.accion] || { icono: TriangleAlert, titulo: p.accion || "Paso", boton: "" };
              const e = ESTADOS[p.estado];
              const Icono = a.icono;
              const IconoEstado = e.icono;
              return (
                <li key={p.indice} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border ${p.estado === "hecho" ? "border-zinc-800/50 bg-zinc-900/20 opacity-70" : "border-zinc-800 bg-zinc-900/50"}`}>
                  <span className="text-xs font-black text-zinc-600 w-5 shrink-0">{p.indice + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-black text-zinc-100">
                      <Icono className="w-4 h-4 text-zinc-400" />{a.titulo}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${e.clase}`}><IconoEstado className="w-3 h-3" />{e.texto}</span>
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">{p.resumen}</p>
                    {p.nota && <p className="text-[11px] text-zinc-500 mt-1 italic">{p.nota}</p>}
                    {(p.avisos || []).map((av, i) => <p key={i} className="flex items-start gap-1 text-[11px] text-amber-400 mt-1"><TriangleAlert className="w-3 h-3 shrink-0 mt-px" />{av}</p>)}
                  </div>
                  {p.estado === "listo" && a.boton && (
                    <button onClick={() => aplicar(p)} disabled={aplicando !== null} className="shrink-0 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50">
                      {aplicando === p.indice ? <><LoaderCircle className="w-3.5 h-3.5 animate-spin" />{progreso || "Aplicando…"}</> : a.boton}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          {!plan && !error && (
            <div className="text-xs text-zinc-500 leading-relaxed p-4 rounded-xl border border-dashed border-zinc-800">
              Usa <span className="font-bold text-zinc-300">Exportar datos</span> para obtener el JSON actual. El plan es otro archivo con <code className="text-zinc-300">"tipo": "fama-plan"</code> y una lista de <code className="text-zinc-300">pasos</code>: <code className="text-zinc-300">crear_sede</code>, <code className="text-zinc-300">reasignar_extintores</code> o <code className="text-zinc-300">unificar_empresas</code>. El ejemplo completo viene dentro de la exportación (<code className="text-zinc-300">formatoPlan</code>).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
