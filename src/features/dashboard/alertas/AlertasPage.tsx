import { useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { Link } from "react-router-dom";
import { BellOff, BellRing, Building2, CalendarDays, ChevronDown, CircleCheck, Info, MapPin, MessageCircle, Network, RefreshCw, Search, User, X } from "lucide-react";
import { useAlertas, type EstadoSeguimiento, type Seguimiento } from "./useAlertas";
import SeguimientoAlerta, { ESTADOS_SEGUIMIENTO, SeguimientoPill } from "./SeguimientoAlerta";
import { usePreferenciaLocal } from "../../../hooks/usePreferenciaLocal";
import { estadoColor } from "../../../utils/estadosExtintor";
import { CLASIFICACION_FILTROS, type ClasificacionFiltro } from "../../../utils/empresas";
import { EtiquetaClasificacion } from "../../../components/ui/IconosEmpresa";

const numeroWhatsapp = (celular: string) => {
  let num = (celular || "").replace(/\D/g, "");
  if (num.length === 9 && num.startsWith("9")) num = "51" + num;
  return num;
};

const MOSTRAR_ALERTAS_PH = false;
const MOSTRAR_SERVICIO_PROXIMO = true;

const filtrarAlertaVisible = (alertas: any[]) => alertas
  .map((a: any) => ({
    ...a,
    ph: MOSTRAR_ALERTAS_PH ? a.ph : null,
    revision: a.revision && (MOSTRAR_SERVICIO_PROXIMO || a.revision.vencido) ? a.revision : null,
  }))
  .map((a: any) => ({ ...a, vencido: !!(a.revision?.vencido || a.ph?.vencido) }))
  .filter((a: any) => a.revision || a.ph);

const clasificarEmpresa = (empresa: any, filtro: ClasificacionFiltro): boolean => {
  if (!filtro) return true;
  if (filtro === "multisede") return empresa.sedes.length > 1;
  if (filtro === "sin_clasificar") return !empresa.tipoCliente;
  return empresa.tipoCliente === filtro;
};

const MotivoBadge = ({ label, vencido, tono }: { label: string; vencido: boolean; tono: "ambar" | "azul" }) => {
  const colores = vencido
    ? "text-red-400 bg-red-950/30 border-red-900/40"
    : tono === "ambar"
      ? "text-amber-400 bg-amber-950/30 border-amber-900/40"
      : "text-sky-400 bg-sky-950/30 border-sky-900/40";
  const punto = vencido ? "bg-red-500" : tono === "ambar" ? "bg-amber-400" : "bg-sky-400";
  return <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-md border whitespace-nowrap ${colores}`}><span className={`w-1.5 h-1.5 rounded-full ${punto}`} />{label}</span>;
};

function AlertaRow({ a, onDescartar }: { a: any; onDescartar: (uid: string, motivo: string) => void }) {
  const [descartando, setDescartando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const confirmarDescarte = () => {
    onDescartar(a.uid, motivo.trim());
    setDescartando(false);
    setMotivo("");
  };

  return (
    <>
      <tr className={`border-b border-zinc-800/40 last:border-0 ${a.vencido ? "bg-red-950/10" : ""}`}>
        <td className="px-3 py-2.5 text-xs font-bold text-zinc-200 whitespace-nowrap">{a.nSerie || "—"}</td>
        <td className="px-3 py-2.5 text-xs text-zinc-400 whitespace-nowrap">{a.nInterno || "—"}</td>
        <td className="px-3 py-2.5 text-xs text-zinc-400 whitespace-nowrap max-w-32 truncate">{a.marca || "—"}</td>
        <td className="px-3 py-2.5 text-xs text-zinc-400 whitespace-nowrap">{a.agente || "—"}</td>
        <td className="px-3 py-2.5 text-xs text-zinc-400 whitespace-nowrap">{a.capacidad || "—"}</td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${estadoColor[a.estado] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>{a.estado || "—"}</span>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {a.revision && (
              <MotivoBadge label={a.revision.vencido ? `Servicio vencido — ${a.revision.vence}` : `Servicio/recarga por vencer: ${a.revision.vence}`} vencido={a.revision.vencido} tono="ambar" />
            )}
            {a.ph && (
              <MotivoBadge label={a.ph.vencido ? `PH vencida — ${a.ph.vence}` : `PH por vencer: ${a.ph.vence}`} vencido={a.ph.vencido} tono="azul" />
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          <button onClick={() => setDescartando((v) => !v)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-300 px-2.5 py-1 rounded-lg hover:bg-zinc-800/60">
            <BellOff className="w-3.5 h-3.5" />Descartar
          </button>
        </td>
      </tr>
      {descartando && (
        <tr className="border-b border-zinc-800/40 last:border-0 bg-zinc-950/40">
          <td colSpan={8} className="px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-zinc-500">El cliente no continuará o no responde. Motivo (opcional):</span>
              <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmarDescarte(); if (e.key === "Escape") setDescartando(false); }} placeholder="Ej: Cliente no responde hace 2 meses" className="flex-1 min-w-40 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-600" />
              <button onClick={confirmarDescarte} className="text-[11px] font-bold text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg">Confirmar</button>
              <button onClick={() => setDescartando(false)} className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg">Cancelar</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function TablaAlertas({ alertas, onDescartar }: { alertas: any[]; onDescartar: (uid: string, motivo: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800/60">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-zinc-900/60 border-b border-zinc-800/60">
            <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Serie</th>
            <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">N° Interno</th>
            <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Marca</th>
            <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Agente</th>
            <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Peso</th>
            <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Estado</th>
            <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Motivo de la alerta</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((a: any) => <AlertaRow key={a.uid} a={a} onDescartar={onDescartar} />)}
        </tbody>
      </table>
    </div>
  );
}

function TablaAlertasPorMes({ alertas, onDescartar }: { alertas: any[]; onDescartar: (uid: string, motivo: string) => void }) {
  const grupos = new Map<string, any[]>();
  alertas.forEach((a: any) => {
    const clave = a.revision?.vence || "Sin mes definido";
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(a);
  });
  const entradas = Array.from(grupos.entries()).sort(([, ga], [, gb]) => (ga[0]?.revision?.dias ?? 0) - (gb[0]?.revision?.dias ?? 0));

  return (
    <div className="flex flex-col gap-3">
      {entradas.map(([mes, lista]) => (
        <div key={mes} className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-black text-zinc-400 uppercase tracking-wide px-1"><CalendarDays className="w-3.5 h-3.5" />{mes} <span className="text-zinc-600 font-bold normal-case">({lista.length})</span></p>
          <TablaAlertas alertas={lista} onDescartar={onDescartar} />
        </div>
      ))}
    </div>
  );
}

function SilenciarEmpresaBoton({ empresaId, onDescartar }: { empresaId: string; onDescartar: (empresaId: string, motivo: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");

  const confirmarSilencio = () => {
    onDescartar(empresaId, motivo.trim());
    setAbierto(false);
    setMotivo("");
  };

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800"><BellOff className="w-3.5 h-3.5" />Silenciar empresa</button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmarSilencio(); if (e.key === "Escape") setAbierto(false); }} placeholder="Motivo (opcional)" className="flex-1 min-w-40 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-600" />
      <button onClick={confirmarSilencio} className="text-xs font-bold text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg">Confirmar</button>
      <button onClick={() => setAbierto(false)} className="text-xs font-bold text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg">Cancelar</button>
    </div>
  );
}

function EmpresasSilenciadasPanel({ empresas, onReactivar }: { empresas: any[]; onReactivar: (empresaId: string) => void }) {
  if (empresas.length === 0) return null;
  return (
    <div className="mt-8 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
        <h2 className="text-base font-black text-zinc-100 flex items-center gap-2"><BellOff className="w-4 h-4 text-zinc-500" />Empresas con Alertas Silenciadas</h2>
        <p className="text-xs text-zinc-500 mt-1">{empresas.length} empresa{empresas.length === 1 ? "" : "s"} silenciada{empresas.length === 1 ? "" : "s"}</p>
      </div>
      <div className="divide-y divide-zinc-800/40">
        {empresas.map((e: any) => (
          <div key={e.empresaId} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-200 truncate">{e.razonSocial}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{e.tipoCliente === "persona" ? "DNI" : "RUC"} {e.ruc || "—"}{e.motivo && ` · ${e.motivo}`}</p>
            </div>
            <button onClick={() => onReactivar(e.empresaId)} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40 shrink-0"><BellRing className="w-3.5 h-3.5" />Reactivar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExtintoresSilenciadosPanel({ extintores, onReactivar }: { extintores: any[]; onReactivar: (uid: string) => void }) {
  if (extintores.length === 0) return null;
  return (
    <div className="mt-8 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
        <h2 className="text-base font-black text-zinc-100 flex items-center gap-2"><BellOff className="w-4 h-4 text-zinc-500" />Extintores con Alerta Silenciada</h2>
        <p className="text-xs text-zinc-500 mt-1">{extintores.length} extintor{extintores.length === 1 ? "" : "es"} silenciado{extintores.length === 1 ? "" : "s"}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-zinc-900/60 border-b border-zinc-800/60">
              <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Empresa</th>
              <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Serie</th>
              <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">N° Interno</th>
              <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Marca</th>
              <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Estado</th>
              <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">Motivo</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {extintores.map((e: any) => (
              <tr key={e.uid} className="border-b border-zinc-800/40 last:border-0">
                <td className="px-3 py-2.5 text-xs font-bold text-zinc-200 whitespace-nowrap">{e.razonSocial}{e.sedeNombre && <span className="text-zinc-500 font-normal"> · {e.sedeNombre}</span>}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-400 whitespace-nowrap">{e.nSerie || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-400 whitespace-nowrap">{e.nInterno || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-400 whitespace-nowrap max-w-32 truncate">{e.marca || "—"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${estadoColor[e.estado] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>{e.estado || "—"}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">{e.motivo || "—"}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => onReactivar(e.uid)} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40"><BellRing className="w-3.5 h-3.5" />Reactivar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Urgencia = "vencidos" | "este_mes" | "proximo_mes" | "tres_meses" | "mas_adelante";

const URGENCIAS: { clave: Urgencia; titulo: string; detalle: string; punto: string; tile: string; activo: string; numero: string }[] = [
  { clave: "vencidos", titulo: "Vencidos", detalle: "Ya pasó el año desde el último servicio", punto: "bg-red-500", tile: "bg-red-950/20 border-red-900/40 hover:border-red-800", activo: "bg-red-950/50 border-red-600", numero: "text-red-400" },
  { clave: "este_mes", titulo: "Este mes", detalle: "Vencen en el mes actual", punto: "bg-orange-500", tile: "bg-orange-950/20 border-orange-900/40 hover:border-orange-800", activo: "bg-orange-950/50 border-orange-600", numero: "text-orange-400" },
  { clave: "proximo_mes", titulo: "Próximo mes", detalle: "Vencen el mes que viene", punto: "bg-amber-400", tile: "bg-amber-950/20 border-amber-900/40 hover:border-amber-800", activo: "bg-amber-950/50 border-amber-600", numero: "text-amber-400" },
  { clave: "tres_meses", titulo: "En 2–3 meses", detalle: "Para coordinar con anticipación", punto: "bg-sky-400", tile: "bg-sky-950/20 border-sky-900/40 hover:border-sky-800", activo: "bg-sky-950/50 border-sky-600", numero: "text-sky-400" },
  { clave: "mas_adelante", titulo: "Más adelante", detalle: "Dentro de más de 3 meses", punto: "bg-zinc-500", tile: "bg-zinc-900/30 border-zinc-800/60 hover:border-zinc-700", activo: "bg-zinc-800 border-zinc-500", numero: "text-zinc-300" },
];
const ORDEN_URGENCIA = URGENCIAS.map((u) => u.clave);

const urgenciaDe = (a: any): Urgencia => {
  if (a.vencido) return "vencidos";
  const r = a.revision || a.ph;
  if (!r?.anio || !r?.mes) return "mas_adelante";
  const hoy = new Date();
  const diff = (r.anio - hoy.getFullYear()) * 12 + (r.mes - (hoy.getMonth() + 1));
  if (diff <= 0) return "este_mes";
  if (diff === 1) return "proximo_mes";
  if (diff <= 3) return "tres_meses";
  return "mas_adelante";
};

type Rango = "tres_meses" | "todo";

function EmpresaAlertas({ empresa, abierto, onToggle, expanded, toggle, seguimiento, onGuardarSeguimiento, onDescartar, onSilenciar, mensajeWhatsapp }: {
  empresa: any; abierto: boolean; onToggle: () => void; expanded: Record<string, boolean>; toggle: (id: string) => void;
  seguimiento?: Seguimiento; onGuardarSeguimiento: Parameters<typeof SeguimientoAlerta>[0]["onGuardar"];
  onDescartar: (uid: string, motivo: string) => void; onSilenciar: (empresaId: string, motivo: string) => void;
  mensajeWhatsapp: (razonSocial: string, alertas: any[]) => string;
}) {
  const esMultisede = empresa.sedes.length > 1;
  const sedeUnica = empresa.sedes.length === 1 ? empresa.sedes[0].nombre : null;
  const Icono = esMultisede ? Network : empresa.tipoCliente === "persona" ? User : Building2;
  const todas = empresa.sedes.flatMap((s: any) => s.alertas);
  const porUrgencia = ORDEN_URGENCIA.map((u) => ({ u, n: todas.filter((a: any) => a.urgencia === u).length })).filter((x) => x.n > 0);
  const proxima = [...todas].sort((a: any, b: any) => (a.revision?.dias ?? a.ph?.dias ?? 0) - (b.revision?.dias ?? b.ph?.dias ?? 0))[0];
  const contacto = [empresa.nombresApellidos, empresa.celular].filter(Boolean).join(" · ");
  const whatsapp = (alertas: any[]) => `https://wa.me/${numeroWhatsapp(empresa.celular)}?text=${mensajeWhatsapp(empresa.razonSocial, alertas)}`;

  return (
    <div className={`border-b border-zinc-800/50 last:border-0 ${abierto ? "bg-zinc-900/40" : ""}`}>
      <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }} className="cursor-pointer grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-zinc-800/30 focus:outline-none focus-visible:bg-zinc-800/40 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`} />
          <Icono className="w-4 h-4 text-zinc-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-100 truncate">{empresa.razonSocial}</p>
            <p className="text-[11px] text-zinc-500 truncate">
              {esMultisede ? `${empresa.sedes.length} sedes` : sedeUnica ? <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{sedeUnica}</span> : null}
              {(esMultisede || sedeUnica) && contacto ? " · " : ""}{contacto}
            </p>
          </div>
        </div>
        <div className="lg:hidden justify-self-end"><SeguimientoPill s={seguimiento} /></div>
        <div className="col-span-2 lg:col-span-1 flex flex-wrap gap-1 pl-14 lg:pl-0">
          {porUrgencia.map(({ u, n }) => {
            const cfg = URGENCIAS.find((x) => x.clave === u)!;
            return <span key={u} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-950/60 border border-zinc-800 text-[10px] font-bold text-zinc-300 whitespace-nowrap"><span className={`w-1.5 h-1.5 rounded-full ${cfg.punto}`} />{n} {cfg.titulo.toLowerCase()}</span>;
          })}
        </div>
        <div className="hidden lg:block text-xs text-zinc-400 whitespace-nowrap">{proxima?.revision?.vence || proxima?.ph?.vence || "—"}</div>
        <div className="hidden lg:block"><SeguimientoPill s={seguimiento} /></div>
        <div className="hidden lg:flex justify-end w-9">
          {empresa.celular && (
            <a href={whatsapp(todas)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Contactar por WhatsApp" aria-label="Contactar por WhatsApp" className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40"><MessageCircle className="w-4 h-4" /></a>
          )}
        </div>
      </div>

      {abierto && (
        <div className="px-4 pb-5 pt-1 flex flex-col gap-4">
          <SeguimientoAlerta empresaId={empresa.empresaId} seguimiento={seguimiento} onGuardar={onGuardarSeguimiento} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to={`/dashboard/${empresa.slug}`} className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800">Ver registro completo</Link>
            <div className="flex flex-wrap items-center gap-2">
              {empresa.celular && (
                <a href={whatsapp(todas)} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40 inline-flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />Contactar</a>
              )}
              <SilenciarEmpresaBoton empresaId={empresa.empresaId} onDescartar={onSilenciar} />
            </div>
          </div>
          {esMultisede ? (
            empresa.sedes.map((sede: any) => {
              const sedeKey = `${empresa.empresaId}::${sede.sedeId || "sin-sede"}`;
              const sedeAbierta = !!expanded[sedeKey];
              return (
                <div key={sede.sedeId || "__sin_sede__"} className="rounded-xl border border-zinc-800/60 overflow-hidden">
                  <button onClick={() => toggle(sedeKey)} className={`w-full px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-left transition-colors ${sedeAbierta ? "bg-zinc-800/40" : "bg-zinc-900/60 hover:bg-zinc-800/60"}`}>
                    <span className="flex items-center gap-2">
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${sedeAbierta ? "rotate-180" : ""}`} />
                      <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-200">{sede.nombre ? <><MapPin className="w-3.5 h-3.5 text-zinc-500" />{sede.nombre}</> : "Sin sede asignada"}</span>
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950/40 px-1.5 py-0.5 rounded-md">{sede.alertas.length}</span>
                    </span>
                    {empresa.celular && (
                      <a href={whatsapp(sede.alertas)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40 inline-flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />Contactar</a>
                    )}
                  </button>
                  {sedeAbierta && <div className="p-3 bg-zinc-950/20"><TablaAlertasPorMes alertas={sede.alertas} onDescartar={onDescartar} /></div>}
                </div>
              );
            })
          ) : (
            <TablaAlertasPorMes alertas={todas} onDescartar={onDescartar} />
          )}
        </div>
      )}
    </div>
  );
}

export default function AlertasPage({ socket }: { socket: Socket | null }) {
  const {
    empresas, loading, recargar,
    descartarAlerta, reactivarAlerta, descartarAlertaEmpresa, reactivarAlertaEmpresa,
    empresasSilenciadas, extintoresSilenciados, seguimientos, guardarSeguimiento,
  } = useAlertas(socket);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busqueda, setBusqueda] = useState("");
  const [fTipo, setFTipo] = useState<ClasificacionFiltro>("");
  const [rango, setRango] = usePreferenciaLocal<Rango>("fama_alertas_rango", "tres_meses");
  const [urgenciaSel, setUrgenciaSel] = useState<Urgencia | "">("");
  const [fSeguimiento, setFSeguimiento] = useState<EstadoSeguimiento | "">("");
  const [cerradas, setCerradas] = usePreferenciaLocal<string[]>("fama_alertas_secciones_cerradas", []);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const mensajeWhatsapp = (razonSocial: string, alertas: any[]) => {
    const lineas = alertas.slice(0, 5).map((a) => {
      const motivo = a.revision && a.ph ? "Revisión y Prueba Hidrostática" : a.revision ? "Revisión anual" : "Prueba Hidrostática";
      return `• ${motivo} — ${a.nInterno || a.nSerie || "extintor"}`;
    });
    return encodeURIComponent(`Hola, le escribimos de FAMA para coordinar el servicio de sus extintores en ${razonSocial}:\n${lineas.join("\n")}`);
  };

  const urgenciasVisibles = rango === "todo" ? URGENCIAS : URGENCIAS.filter((u) => u.clave !== "mas_adelante");
  const enRango = (a: any) => rango === "todo" || a.urgencia !== "mas_adelante";

  const base = useMemo(() => empresas
    .map((empresa: any) => ({
      ...empresa,
      sedes: empresa.sedes
        .map((sede: any) => ({ ...sede, alertas: filtrarAlertaVisible(sede.alertas).map((a: any) => ({ ...a, urgencia: urgenciaDe(a) })) }))
        .filter((sede: any) => sede.alertas.length > 0),
    }))
    .filter((empresa: any) => empresa.sedes.length > 0), [empresas]);

  const estadoDe = (id: string): EstadoSeguimiento => seguimientos[id]?.estado || "pendiente";
  const texto = busqueda.trim().toLowerCase();
  const filtradas = base
    .filter((e: any) => clasificarEmpresa(e, fTipo))
    .filter((e: any) => !texto || e.razonSocial.toLowerCase().includes(texto) || (e.nombresApellidos || "").toLowerCase().includes(texto))
    .map((e: any) => ({
      ...e,
      sedes: e.sedes
        .map((s: any) => ({ ...s, alertas: s.alertas.filter((a: any) => enRango(a) && (!urgenciaSel || a.urgencia === urgenciaSel)) }))
        .filter((s: any) => s.alertas.length > 0),
    }))
    .filter((e: any) => e.sedes.length > 0);

  const conteoTiles = Object.fromEntries(URGENCIAS.map((u) => {
    const empresasU = base
      .filter((e: any) => clasificarEmpresa(e, fTipo) && (!texto || e.razonSocial.toLowerCase().includes(texto)) && (!fSeguimiento || estadoDe(e.empresaId) === fSeguimiento));
    const alertas = empresasU.flatMap((e: any) => e.sedes.flatMap((s: any) => s.alertas)).filter((a: any) => a.urgencia === u.clave);
    return [u.clave, { extintores: alertas.length, empresas: new Set(empresasU.filter((e: any) => e.sedes.some((s: any) => s.alertas.some((a: any) => a.urgencia === u.clave))).map((e: any) => e.empresaId)).size }];
  })) as Record<Urgencia, { extintores: number; empresas: number }>;

  const conteoSeguimiento = (estado: EstadoSeguimiento) => filtradas.filter((e: any) => estadoDe(e.empresaId) === estado).length;
  const listas = filtradas.filter((e: any) => !fSeguimiento || estadoDe(e.empresaId) === fSeguimiento);

  const secciones = urgenciasVisibles
    .map((u) => ({
      ...u,
      empresas: listas
        .filter((e: any) => {
          const alertas = e.sedes.flatMap((s: any) => s.alertas);
          const mas = ORDEN_URGENCIA.find((k) => alertas.some((a: any) => a.urgencia === k));
          return mas === u.clave;
        })
        .sort((a: any, b: any) => {
          const n = (e: any) => e.sedes.reduce((t: number, s: any) => t + s.alertas.filter((x: any) => x.urgencia === u.clave).length, 0);
          return n(b) - n(a);
        }),
    }))
    .filter((s) => s.empresas.length > 0);

  const hayFiltros = !!(busqueda || fTipo || urgenciaSel || fSeguimiento);
  const limpiar = () => { setBusqueda(""); setFTipo(""); setUrgenciaSel(""); setFSeguimiento(""); };
  const alternarSeccion = (c: string) => setCerradas(cerradas.includes(c) ? cerradas.filter((x) => x !== c) : [...cerradas, c]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2.5"><BellRing className="w-5 h-5 text-red-500" />Alertas de Vencimiento</h1>
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            Ordenadas por urgencia · el servicio vence 1 año después del último
            <span className="relative group inline-flex">
              <Info className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
              <span className="pointer-events-none absolute right-0 sm:right-auto sm:left-0 top-5 z-20 w-72 hidden group-hover:block p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] leading-relaxed text-zinc-400 shadow-xl">
                El servicio/recarga aplica a cualquier trabajo o venta (Recarga, Mantenimiento, etc.) y se considera vencido 1 año después del último servicio, en el mismo mes.{MOSTRAR_ALERTAS_PH ? " La Prueba Hidrostática vence cada 5 años según el dato registrado en el extintor." : ""} Al descartar una alerta, deja de mostrarse hasta que se registre un nuevo servicio sobre ese extintor. El seguimiento vuelve a «Pendiente» cuando se registra un nuevo servicio de la empresa.
              </span>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1" role="group" aria-label="Rango">
            {([["tres_meses", "Próximos 3 meses"], ["todo", "Todo"]] as const).map(([v, t]) => (
              <button key={v} onClick={() => { setRango(v); if (v === "tres_meses" && urgenciaSel === "mas_adelante") setUrgenciaSel(""); }} aria-pressed={rango === v} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${rango === v ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{t}</button>
            ))}
          </div>
          <button onClick={recargar} disabled={loading} aria-label="Actualizar" className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-60"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 ${rango === "todo" ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-3 mb-4`}>
        {urgenciasVisibles.map((u) => {
          const c = conteoTiles[u.clave];
          const activo = urgenciaSel === u.clave;
          return (
            <button key={u.clave} onClick={() => setUrgenciaSel(activo ? "" : u.clave)} aria-pressed={activo} disabled={!c.extintores && !activo} className={`px-4 py-3 rounded-2xl border text-left transition-all disabled:opacity-40 disabled:cursor-default ${activo ? u.activo : u.tile}`}>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400"><span className={`w-2 h-2 rounded-full ${u.punto}`} />{u.titulo}</p>
              <p className={`text-2xl font-black tabular-nums ${u.numero}`}>{c.extintores}<span className="text-xs font-bold text-zinc-500"> ext.</span></p>
              <p className="text-[11px] text-zinc-500">{c.empresas} empresa{c.empresas === 1 ? "" : "s"}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-col xl:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar empresa o contacto..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-600" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" aria-label="Limpiar búsqueda"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ESTADOS_SEGUIMIENTO.map((e) => {
            const Icono = e.icono;
            const activo = fSeguimiento === e.value;
            return (
              <button key={e.value} onClick={() => setFSeguimiento(activo ? "" : e.value)} aria-pressed={activo} className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${activo ? e.activo : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}>
                <Icono className="w-3.5 h-3.5" />{e.label}s<span className="tabular-nums opacity-70">{conteoSeguimiento(e.value)}</span>
              </button>
            );
          })}
          <span className="hidden sm:block w-px h-6 bg-zinc-800 mx-1" />
          {CLASIFICACION_FILTROS.map((f) => (
            <button key={f.value} onClick={() => setFTipo(f.value)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${fTipo === f.value ? "bg-red-600 border-red-600 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}>
              <EtiquetaClasificacion value={f.value} label={f.label} />
            </button>
          ))}
        </div>
      </div>

      {loading && base.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : secciones.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800/60">
          <div className="flex justify-center mb-3">{hayFiltros ? <Search className="w-12 h-12 text-zinc-700" strokeWidth={1.5} /> : <CircleCheck className="w-12 h-12 text-emerald-700" strokeWidth={1.5} />}</div>
          <p className="text-sm font-medium">{hayFiltros ? "Ninguna empresa coincide con los filtros aplicados" : rango === "tres_meses" ? "No hay vencimientos en los próximos 3 meses" : "No hay vencimientos pendientes"}</p>
          {hayFiltros && <button onClick={limpiar} className="mt-3 text-xs font-bold text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4">Limpiar filtros</button>}
          {!hayFiltros && rango === "tres_meses" && <button onClick={() => setRango("todo")} className="mt-3 text-xs font-bold text-zinc-400 hover:text-zinc-200 underline decoration-dotted underline-offset-4">Ver todo el año</button>}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {secciones.map((s) => {
            const cerrada = cerradas.includes(s.clave);
            return (
              <section key={s.clave}>
                <button onClick={() => alternarSeccion(s.clave)} className="w-full flex items-center gap-3 mb-2.5 px-1 text-left">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.punto}`} />
                  <span className="text-sm font-black text-zinc-200">{s.titulo}</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[11px] font-black text-zinc-400 tabular-nums">{s.empresas.length}</span>
                  <span className="hidden sm:inline text-[11px] text-zinc-600">{s.detalle}</span>
                  <span className="flex-1 h-px bg-zinc-800/70" />
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${cerrada ? "-rotate-90" : ""}`} />
                </button>
                {!cerrada && (
                  <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
                    <div className="hidden lg:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] gap-x-4 px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/60 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      <span className="pl-14">Empresa</span><span>Extintores</span><span>Vence</span><span>Seguimiento</span><span className="w-9" />
                    </div>
                    {s.empresas.map((empresa: any) => (
                      <EmpresaAlertas
                        key={empresa.empresaId}
                        empresa={empresa}
                        abierto={!!expanded[empresa.empresaId]}
                        onToggle={() => toggle(empresa.empresaId)}
                        expanded={expanded}
                        toggle={toggle}
                        seguimiento={seguimientos[empresa.empresaId]}
                        onGuardarSeguimiento={guardarSeguimiento}
                        onDescartar={descartarAlerta}
                        onSilenciar={descartarAlertaEmpresa}
                        mensajeWhatsapp={mensajeWhatsapp}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <EmpresasSilenciadasPanel empresas={empresasSilenciadas} onReactivar={reactivarAlertaEmpresa} />
      <ExtintoresSilenciadosPanel extintores={extintoresSilenciados} onReactivar={reactivarAlerta} />
    </div>
  );
}
