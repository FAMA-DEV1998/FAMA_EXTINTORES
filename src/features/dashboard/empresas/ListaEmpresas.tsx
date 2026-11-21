import type { KeyboardEvent, ReactNode } from "react";
import { ArrowRight, ChevronDown, Copy, GitMerge, TriangleAlert } from "lucide-react";
import type { EmpresaItem } from "../../../types/empresa";
import { IconoEmpresa } from "../../../components/ui/IconosEmpresa";
import { TIPO_CLIENTE_LABELS, esMultisede } from "../../../utils/empresas";
import { mesAnioLabel } from "../../../utils/fechas";
import { usePreferenciaLocal } from "../../../hooks/usePreferenciaLocal";
import type { ResumenEmpresa } from "./useResumenEmpresas";

export type VistaEmpresas = "lista" | "tarjetas";
export type Parecida = { clave: string; id: string; razonSocial: string; motivo: string; esSedeDe?: boolean; tieneSede?: boolean };

const MESES_ACTIVA = 12;

type Seccion = { clave: "activas" | "inactivas" | "nuevas"; titulo: string; detalle: string };

const SECCIONES: Seccion[] = [
  { clave: "activas", titulo: "Con servicio reciente", detalle: `Servicio en los últimos ${MESES_ACTIVA} meses` },
  { clave: "inactivas", titulo: "Sin servicio hace tiempo", detalle: `Último servicio hace más de ${MESES_ACTIVA} meses` },
  { clave: "nuevas", titulo: "Sin servicios registrados", detalle: "Empresas nuevas o sin historial" },
];

const limiteActiva = () => {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth() - MESES_ACTIVA, h.getDate()).toISOString().slice(0, 10);
};

const tipoTexto = (e: EmpresaItem) => (esMultisede(e) ? "Multisede" : e.tipoCliente ? TIPO_CLIENTE_LABELS[e.tipoCliente] : null);

interface Props {
  empresas: EmpresaItem[];
  resumen: Record<string, ResumenEmpresa> | null;
  diasProximos: number;
  vista: VistaEmpresas;
  parecidas: Map<string, Parecida[]>;
  puedeFusionar: boolean;
  onAbrir: (e: EmpresaItem) => void;
  onUnificar: (clave: string) => void;
}

function Vencimientos({ r, diasProximos }: { r?: ResumenEmpresa; diasProximos: number }) {
  if (!r) return <span className="text-zinc-700">…</span>;
  if (!r.extintores) return <span className="text-zinc-600">—</span>;
  if (!r.vencidos && !r.proximos) return <span className="text-[11px] font-bold text-emerald-400/90">Al día</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {r.vencidos > 0 && <span className="px-1.5 py-0.5 rounded-md bg-red-950/50 border border-red-900/50 text-[10px] font-black text-red-300 whitespace-nowrap">{r.vencidos} vencido{r.vencidos === 1 ? "" : "s"}</span>}
      {r.proximos > 0 && <span className="px-1.5 py-0.5 rounded-md bg-amber-950/40 border border-amber-900/50 text-[10px] font-black text-amber-300 whitespace-nowrap" title={`Vencen en los próximos ${diasProximos} días`}>{r.proximos} en {diasProximos} días</span>}
    </span>
  );
}

function Etiquetas({ e, parecidas, puedeFusionar, onUnificar }: { e: EmpresaItem; parecidas: Parecida[]; puedeFusionar: boolean; onUnificar: Props["onUnificar"] }) {
  const tipo = tipoTexto(e);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4">
      {tipo ? <span className="text-zinc-500">{tipo}</span> : <span className="inline-flex items-center gap-1 text-zinc-600" title="Falta definir la clasificación de cliente"><TriangleAlert className="w-3 h-3 text-amber-600/80" />Sin clasificar</span>}
      {parecidas.length > 0 && (
        <span className="inline-flex items-center gap-1 font-bold text-amber-300" title={parecidas.map((p) => `${p.razonSocial}: ${p.motivo}`).join("\n")}>
          <Copy className="w-3 h-3" />{parecidas[0].esSedeDe ? "Posible sede de" : parecidas[0].tieneSede ? "Tiene una posible sede:" : "Posible duplicado de"} {parecidas[0].razonSocial}{parecidas.length > 1 ? ` y ${parecidas.length - 1} más` : ""}
          {puedeFusionar && (
            <button onClick={(ev) => { ev.stopPropagation(); onUnificar(parecidas[0].clave); }} className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/90 hover:bg-amber-400 text-zinc-950 text-[10px] font-black">
              <GitMerge className="w-3 h-3" />Unificar
            </button>
          )}
        </span>
      )}
    </span>
  );
}

const filaClick = (onAbrir: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: onAbrir,
  onKeyDown: (ev: KeyboardEvent) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onAbrir(); } },
});

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{etiqueta}</p>
      <div className="text-xs font-semibold text-zinc-300 truncate mt-0.5">{children}</div>
    </div>
  );
}

const COLUMNAS = "lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.3fr)_1.25rem]";

export default function ListaEmpresas({ empresas, resumen, diasProximos, vista, parecidas, puedeFusionar, onAbrir, onUnificar }: Props) {
  const [cerradas, setCerradas] = usePreferenciaLocal<string[]>("fama_empresas_secciones_cerradas", []);
  const limite = limiteActiva();
  const seccionDe = (e: EmpresaItem): Seccion["clave"] => {
    const u = resumen?.[e.id]?.ultimoServicio;
    if (!u) return "nuevas";
    return u >= limite ? "activas" : "inactivas";
  };
  const grupos = resumen
    ? SECCIONES.map((s) => ({ ...s, lista: empresas.filter((e) => seccionDe(e) === s.clave) })).filter((s) => s.lista.length > 0)
    : [{ clave: "activas" as const, titulo: "Empresas", detalle: "", lista: empresas }];

  const alternar = (clave: string) => setCerradas(cerradas.includes(clave) ? cerradas.filter((c) => c !== clave) : [...cerradas, clave]);

  const fila = (e: EmpresaItem) => {
    const r = resumen?.[e.id];
    const p = parecidas.get(e.id) || [];
    return (
      <div key={e.id} {...filaClick(() => onAbrir(e))} className={`group cursor-pointer grid grid-cols-2 ${COLUMNAS} items-center gap-x-4 gap-y-2 px-4 py-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 focus:outline-none focus-visible:bg-zinc-800/40 transition-colors`}>
        <div className="col-span-2 lg:col-span-1 flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-red-950/50 group-hover:text-red-400 flex items-center justify-center shrink-0 transition-colors"><IconoEmpresa empresa={e} className="w-4 h-4" /></span>
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-100 truncate group-hover:text-white">{e.razonSocial}</p>
            <Etiquetas e={e} parecidas={p} puedeFusionar={puedeFusionar} onUnificar={onUnificar} />
          </div>
        </div>
        <div className="text-xs text-zinc-400 truncate"><span className="lg:hidden text-zinc-600">RUC </span>{e.ruc || <span className="text-zinc-700">—</span>}</div>
        <div className="text-xs text-zinc-400 truncate">{e.distrito || <span className="text-zinc-700">—</span>}</div>
        <div className="text-xs text-zinc-300 tabular-nums whitespace-nowrap">
          {r ? <>{r.extintores}<span className="text-zinc-600"> ext.</span>{r.sedes > 0 && <span className="text-zinc-500"> · {r.sedes} sede{r.sedes === 1 ? "" : "s"}</span>}</> : <span className="text-zinc-700">…</span>}
        </div>
        <div className="text-xs text-zinc-400 whitespace-nowrap">{r?.ultimoServicio ? mesAnioLabel(r.ultimoServicio) : <span className="text-zinc-700">—</span>}</div>
        <div className="col-span-2 lg:col-span-1"><Vencimientos r={r} diasProximos={diasProximos} /></div>
        <ArrowRight className="hidden lg:block w-4 h-4 text-zinc-700 group-hover:text-red-400 transition-all group-hover:translate-x-0.5" />
      </div>
    );
  };

  const tarjeta = (e: EmpresaItem) => {
    const r = resumen?.[e.id];
    const p = parecidas.get(e.id) || [];
    return (
      <div key={e.id} {...filaClick(() => onAbrir(e))} className="group cursor-pointer flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 transition-all">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-red-950/50 group-hover:text-red-400 flex items-center justify-center shrink-0 transition-colors"><IconoEmpresa empresa={e} className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-zinc-100 truncate group-hover:text-white">{e.razonSocial}</p>
            <Etiquetas e={e} parecidas={p} puedeFusionar={puedeFusionar} onUnificar={onUnificar} />
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-red-400 shrink-0 mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 pt-3 border-t border-zinc-800/60">
          <Dato etiqueta="Extintores">{r ? <>{r.extintores}{r.sedes > 0 && <span className="text-zinc-500"> · {r.sedes} sede{r.sedes === 1 ? "" : "s"}</span>}</> : "…"}</Dato>
          <Dato etiqueta="Último servicio">{r?.ultimoServicio ? mesAnioLabel(r.ultimoServicio) : "—"}</Dato>
          <Dato etiqueta="RUC">{e.ruc || "—"}</Dato>
          <Dato etiqueta="Distrito">{e.distrito || "—"}</Dato>
        </div>
        <Vencimientos r={r} diasProximos={diasProximos} />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {grupos.map((g) => {
        const cerrada = cerradas.includes(g.clave) && grupos.length > 1;
        return (
          <section key={g.clave}>
            {grupos.length > 1 && (
              <button onClick={() => alternar(g.clave)} className="w-full flex items-center gap-3 mb-2.5 px-1 text-left">
                <span className="text-sm font-black text-zinc-200">{g.titulo}</span>
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[11px] font-black text-zinc-400 tabular-nums">{g.lista.length}</span>
                <span className="hidden sm:inline text-[11px] text-zinc-600">{g.detalle}</span>
                <span className="flex-1 h-px bg-zinc-800/70" />
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${cerrada ? "-rotate-90" : ""}`} />
              </button>
            )}
            {!cerrada && (vista === "lista" ? (
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
                <div className={`hidden lg:grid ${COLUMNAS} gap-x-4 px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/60 text-[10px] font-black uppercase tracking-wider text-zinc-500`}>
                  <span>Empresa</span><span>RUC</span><span>Distrito</span><span>Extintores</span><span>Último servicio</span><span>Vencimientos</span><span />
                </div>
                {g.lista.map(fila)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">{g.lista.map(tarjeta)}</div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
