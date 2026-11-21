import { Fragment, useState } from "react";
import { Check, ChevronDown, MapPin, MessageSquareText, TriangleAlert } from "lucide-react";
import { estadoColor } from "../../../utils/estadosExtintor";

export type AccionExtintor = "mover" | "fusionar" | "omitir";
export type AccionFusion = { accion: AccionExtintor; destinoUid?: string; sedeId?: string | null };
export type Coincidencia = { uid: string; tipo: "igual" | "distinto" | "similar"; motivo: string; destino: any; diferencias: string[] };

const peso = (e: any) => (e.peso ? `${e.peso} ${e.unidadPeso || ""}`.trim() : "");

const CAMPOS: { l: string; v: (e: any) => string; identidad?: boolean }[] = [
  { l: "N° Serie", v: (e) => e.nSerie || "" },
  { l: "N° Interno", v: (e) => e.nInterno || "" },
  { l: "Marca", v: (e) => e.marca || "", identidad: true },
  { l: "Agente", v: (e) => e.agenteExtintor || "", identidad: true },
  { l: "Peso", v: peso, identidad: true },
  { l: "Fabricación", v: (e) => e.fechaFabricacion || "", identidad: true },
  { l: "PH realizada", v: (e) => e.realizadoPH || "" },
  { l: "PH vence", v: (e) => e.vencimPH || "" },
  { l: "Estado", v: (e) => e.estadoExtintor || "" },
  { l: "Sede", v: (e) => e.sedeNombre || "" },
  { l: "Observaciones", v: (e) => e.observaciones || "" },
  { l: "Motivo de baja", v: (e) => e.motivoBaja || "" },
];

const norm = (t: string) => (t || "").toUpperCase().replace(/[\s\-_.]/g, "");

export function compararExtintores(a: any, b: any): Coincidencia | null {
  const serie = !!norm(a.nSerie) && norm(a.nSerie) === norm(b.nSerie);
  const interno = !!norm(a.nInterno) && norm(a.nInterno) === norm(b.nInterno);
  if (!serie && !interno) return null;
  const identidad = CAMPOS.filter((c) => c.identidad);
  const diferencias = identidad.filter((c) => norm(c.v(a)) && norm(c.v(b)) && norm(c.v(a)) !== norm(c.v(b))).map((c) => c.l);
  const iguales = identidad.filter((c) => norm(c.v(a)) && norm(c.v(a)) === norm(c.v(b))).length;
  const internoDistinto = !!norm(a.nInterno) && !!norm(b.nInterno) && !interno;
  if (serie && diferencias.length === 0 && !internoDistinto) return { uid: b.uid, tipo: "igual", motivo: interno ? "Serie e interno" : "N° de Serie", destino: b, diferencias };
  if (serie && diferencias.length === 0) return { uid: b.uid, tipo: "similar", motivo: "Misma serie y datos, pero otro N° interno", destino: b, diferencias };
  if (serie) return { uid: b.uid, tipo: "distinto", motivo: `cambia ${diferencias.join(", ")}`, destino: b, diferencias };
  if (diferencias.length === 0 && iguales >= 2) return { uid: b.uid, tipo: "similar", motivo: "Mismo N° interno", destino: b, diferencias };
  return null;
}

const PESO_TIPO = { igual: 3, distinto: 1, similar: 2 };

export function marcarRepetidas(coincidencias: Record<string, Coincidencia | null>) {
  const usos = new Map<string, number>();
  Object.values(coincidencias).forEach((c) => { if (c?.tipo === "igual") usos.set(c.uid, (usos.get(c.uid) || 0) + 1); });
  Object.keys(coincidencias).forEach((k) => {
    const c = coincidencias[k];
    if (c?.tipo === "igual" && (usos.get(c.uid) || 0) > 1) coincidencias[k] = { ...c, tipo: "similar", motivo: "Otro extintor del origen también coincide con este" };
  });
  return coincidencias;
}

export function buscarCoincidencia(ext: any, destinos: any[], sedeId: string | null): Coincidencia | null {
  let mejor: Coincidencia | null = null;
  let puntaje = -1;
  for (const d of destinos) {
    const c = compararExtintores(ext, d);
    if (!c) continue;
    const p = PESO_TIPO[c.tipo] * 10 + (d.sedeId === sedeId ? 5 : 0) - c.diferencias.length;
    if (p > puntaje) { mejor = c; puntaje = p; }
  }
  return mejor;
}

const BADGE: Record<Coincidencia["tipo"], { clase: string; texto: string }> = {
  igual: { clase: "bg-emerald-950/40 text-emerald-300 border-emerald-900/50", texto: "Mismo extintor" },
  distinto: { clase: "bg-red-950/40 text-red-300 border-red-900/50", texto: "Serie repetida, otro extintor" },
  similar: { clase: "bg-amber-950/40 text-amber-300 border-amber-900/50", texto: "Posible" },
};

function Resumen({ e, resaltar }: { e: any; resaltar?: string[] }) {
  const r = (l: string) => (resaltar?.includes(l) ? "text-red-300 font-bold" : "");
  return (
    <div className="min-w-0">
      <p className="font-black text-zinc-100">{e.nSerie || "—"} <span className="font-medium text-zinc-500">· {e.nInterno || "s/interno"}</span></p>
      <p className="text-zinc-400"><span className={r("Marca")}>{e.marca || "—"}</span> · <span className={r("Agente")}>{e.agenteExtintor || "—"}</span> · <span className={r("Peso")}>{peso(e) || "—"}</span> · <span className={r("Fabricación")}>Fab. {e.fechaFabricacion || "—"}</span></p>
      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${estadoColor[e.estadoExtintor] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>{e.estadoExtintor || "—"}</span>
        {e.sedeNombre && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400"><MapPin className="w-3 h-3" />{e.sedeNombre}</span>}
      </div>
      {e.observaciones && <p className="mt-1 flex items-start gap-1 text-[11px] text-sky-300/90 italic"><MessageSquareText className="w-3 h-3 mt-0.5 shrink-0 not-italic" />{e.observaciones}</p>}
    </div>
  );
}

interface Props {
  origen: any[];
  coincidencias: Record<string, Coincidencia | null>;
  requiereSede: boolean;
  sedes: { id: string; nombre: string }[];
  accionDe: (ext: any) => AccionFusion;
  sedeDe: (ext: any) => string | null;
  onCambiar: (uid: string, cambio: Partial<AccionFusion>) => void;
}

export default function ComparacionExtintores({ origen, coincidencias, requiereSede, sedes, accionDe, sedeDe, onCambiar }: Props) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const alternar = (uid: string) => setAbiertos((p) => { const n = new Set(p); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });

  return (
    <div className="rounded-xl border border-zinc-800/60 divide-y divide-zinc-800/50">
      {origen.map((ext) => {
        const c = coincidencias[ext.uid];
        const accion = accionDe(ext);
        const sede = sedeDe(ext);
        const abierto = abiertos.has(ext.uid);
        const sugerida = ext.sedeSugeridaId && sedes.find((s) => s.id === ext.sedeSugeridaId);
        const contraSugerencia = requiereSede && sugerida && sede !== ext.sedeSugeridaId && accion.accion === "mover";
        return (
          <Fragment key={ext.uid}>
            <div className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,0.9fr)] gap-3 px-3 py-3 text-xs ${accion.accion === "omitir" ? "opacity-50" : ""}`}>
              <Resumen e={ext} resaltar={c?.diferencias} />
              <div className="min-w-0">
                {c ? (
                  <>
                    <span className={`inline-flex items-center gap-1 mb-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${BADGE[c.tipo].clase}`}>
                      {c.tipo === "igual" ? <Check className="w-3 h-3" strokeWidth={3} /> : <TriangleAlert className="w-3 h-3" />}{BADGE[c.tipo].texto} · {c.motivo}
                    </span>
                    <Resumen e={c.destino} resaltar={c.diferencias} />
                  </>
                ) : (
                  <p className="text-zinc-600 pt-1">Sin coincidencia en {requiereSede ? "la empresa destino" : "el destino"}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <select value={accion.accion} onChange={(e) => onCambiar(ext.uid, { accion: e.target.value as AccionExtintor, destinoUid: c?.uid })} aria-label="Acción" className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200">
                  <option value="mover">Mover como nuevo</option>
                  {c && <option value="fusionar">Fusionar con el destino</option>}
                  <option value="omitir">Omitir (dejar en origen)</option>
                </select>
                {requiereSede && accion.accion === "mover" && (
                  <select value={sede || ""} onChange={(e) => onCambiar(ext.uid, { sedeId: e.target.value })} aria-label="Sede destino" className={`bg-zinc-950 border rounded-lg px-2 py-1.5 text-xs text-zinc-200 ${contraSugerencia ? "border-amber-600" : "border-zinc-800"}`}>
                    {sedes.map((s) => <option key={s.id} value={s.id}>Sede: {s.nombre}{s.id === ext.sedeSugeridaId ? " (según observación)" : ""}</option>)}
                  </select>
                )}
                {contraSugerencia && <p className="text-[10px] text-amber-400">La observación indica «{sugerida.nombre}»</p>}
                {c && (
                  <button onClick={() => alternar(ext.uid)} className="self-start inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-zinc-200">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${abierto ? "rotate-180" : ""}`} />{abierto ? "Ocultar comparación" : "Comparar todos los datos"}
                  </button>
                )}
              </div>
            </div>
            {abierto && c && (
              <div className="px-3 pb-3">
                <table className="w-full text-xs border-collapse rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-zinc-950/60 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-2 w-36">Dato</th><th className="px-3 py-2">Origen</th><th className="px-3 py-2">Destino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAMPOS.map((campo) => {
                      const a = campo.v(ext), b = campo.v(c.destino);
                      const estado = !a && !b ? "vacio" : norm(a) === norm(b) ? "igual" : !a || !b ? "falta" : "distinto";
                      const color = estado === "igual" ? "text-emerald-300" : estado === "distinto" ? "text-red-300 font-bold" : "text-zinc-400";
                      return (
                        <tr key={campo.l} className={`border-t border-zinc-800/40 ${estado === "distinto" ? "bg-red-950/15" : ""}`}>
                          <td className="px-3 py-1.5 text-zinc-500 font-bold">{campo.l}</td>
                          <td className={`px-3 py-1.5 ${color}`}>{a || "—"}</td>
                          <td className={`px-3 py-1.5 ${color}`}>{b || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
