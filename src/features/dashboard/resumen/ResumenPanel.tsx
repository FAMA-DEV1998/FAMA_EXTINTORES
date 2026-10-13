import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Socket } from "socket.io-client";
import { BellRing, CalendarClock, ChevronDown, ChevronRight, ClipboardCheck, FireExtinguisher, LayoutDashboard, TriangleAlert, type LucideIcon } from "lucide-react";
import { useResumen, type EmpresaResumen } from "./useResumen";
import { usePreferenciaLocal } from "../../../hooks/usePreferenciaLocal";
import { mesAnioLabel } from "../../../utils/fechas";

type Tono = "neutro" | "rojo" | "ambar" | "verde";

const TONOS: Record<Tono, { caja: string; icono: string; valor: string }> = {
  neutro: { caja: "bg-zinc-950/50 border-zinc-800/60", icono: "bg-zinc-800 text-zinc-300", valor: "text-white" },
  rojo: { caja: "bg-red-950/25 border-red-900/50", icono: "bg-red-900/40 text-red-300", valor: "text-red-300" },
  ambar: { caja: "bg-amber-950/20 border-amber-900/40", icono: "bg-amber-900/40 text-amber-300", valor: "text-amber-300" },
  verde: { caja: "bg-emerald-950/20 border-emerald-900/40", icono: "bg-emerald-900/40 text-emerald-300", valor: "text-emerald-300" },
};

function Indicador({ icono: Icono, titulo, valor, detalle, tono = "neutro", enlace }: { icono: LucideIcon; titulo: string; valor: number; detalle: ReactNode; tono?: Tono; enlace?: string }) {
  const t = TONOS[tono];
  const contenido = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.icono}`}><Icono className="w-4 h-4" /></span>
        {enlace && <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />}
      </div>
      <p className={`text-3xl font-black leading-none tabular-nums ${t.valor}`}>{valor}</p>
      <div>
        <p className="text-xs font-black text-zinc-200">{titulo}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{detalle}</p>
      </div>
    </>
  );
  const clase = `group flex flex-col gap-3 p-4 rounded-2xl border transition-all ${t.caja}`;
  return enlace
    ? <Link to={enlace} className={`${clase} hover:-translate-y-0.5 hover:border-zinc-600`}>{contenido}</Link>
    : <div className={clase}>{contenido}</div>;
}

function ListaEmpresas({ titulo, icono: Icono, vacio, empresas, detalle }: { titulo: string; icono: LucideIcon; vacio: string; empresas: EmpresaResumen[]; detalle: (e: EmpresaResumen) => string }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/40 min-w-0">
      <p className="flex items-center gap-2 text-xs font-black text-zinc-300 uppercase tracking-wider"><Icono className="w-4 h-4 text-zinc-500" />{titulo}</p>
      {empresas.length === 0 ? (
        <p className="text-xs text-zinc-500 py-2">{vacio}</p>
      ) : (
        <ul className="flex flex-col">
          {empresas.map((e) => (
            <li key={e.id}>
              <Link to={`/dashboard/${e.slug}/extintores`} className="flex items-center justify-between gap-3 px-2 py-2 -mx-2 rounded-lg hover:bg-zinc-800/60 transition-colors">
                <span className="text-sm font-bold text-zinc-200 truncate">{e.razonSocial}</span>
                <span className="text-[11px] font-bold text-zinc-500 shrink-0">{detalle(e)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ResumenPanel({ socket }: { socket: Socket | null }) {
  const resumen = useResumen(socket);
  const [abierto, setAbierto] = usePreferenciaLocal("fama_resumen_abierto", true);

  if (!resumen) return null;

  const diferencia = resumen.serviciosMes - resumen.serviciosMesAnterior;
  const textoDiferencia = resumen.serviciosMesAnterior === 0 && resumen.serviciosMes === 0
    ? "Aún no hay servicios este mes"
    : diferencia === 0 ? "Igual que el mes pasado" : `${diferencia > 0 ? "+" : ""}${diferencia} frente al mes pasado`;

  return (
    <section className="mb-8 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
      <button onClick={() => setAbierto(!abierto)} className="w-full flex items-center justify-between gap-2 px-1" aria-expanded={abierto}>
        <span className="flex items-center gap-2 text-xs font-black text-zinc-300 uppercase tracking-wider"><LayoutDashboard className="w-4 h-4 text-zinc-400" />Resumen general</span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-500">{abierto ? "Ocultar" : "Mostrar"}<ChevronDown className={`w-4 h-4 transition-transform ${abierto ? "rotate-180" : ""}`} /></span>
      </button>

      {abierto && (
        <div className="flex flex-col gap-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Indicador icono={ClipboardCheck} titulo="Servicios este mes" valor={resumen.serviciosMes} detalle={textoDiferencia} tono="verde" />
            <Indicador icono={FireExtinguisher} titulo="Extintores atendidos" valor={resumen.extintoresAtendidosMes} detalle={`De ${resumen.extintores} extintores activos`} />
            <Indicador icono={BellRing} titulo="Servicio vencido" valor={resumen.vencidos} detalle="Ver en Alertas" tono={resumen.vencidos > 0 ? "rojo" : "neutro"} enlace="/dashboard/alertas" />
            <Indicador icono={CalendarClock} titulo="Por vencer" valor={resumen.porVencer} detalle="Hasta fin del próximo año" tono={resumen.porVencer > 0 ? "ambar" : "neutro"} enlace="/dashboard/alertas" />
            <Indicador icono={TriangleAlert} titulo="Datos incompletos" valor={resumen.incompletos} detalle="Sin estado, marca, agente o peso" tono={resumen.incompletos > 0 ? "ambar" : "neutro"} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ListaEmpresas
              titulo={`Sin servicio hace más de un año${resumen.totalEmpresasSinServicioReciente > resumen.empresasSinServicioReciente.length ? ` (${resumen.totalEmpresasSinServicioReciente})` : ""}`}
              icono={CalendarClock}
              vacio="Todas las empresas tienen un servicio reciente."
              empresas={resumen.empresasSinServicioReciente}
              detalle={(e) => (e.ultimoServicio ? `Último: ${mesAnioLabel(e.ultimoServicio)}` : "Nunca atendida")}
            />
            <ListaEmpresas
              titulo="Más extintores con datos incompletos"
              icono={TriangleAlert}
              vacio="No hay extintores con datos básicos incompletos."
              empresas={resumen.empresasConIncompletos}
              detalle={(e) => `${e.cantidad} incompleto${e.cantidad === 1 ? "" : "s"}`}
            />
          </div>
        </div>
      )}
    </section>
  );
}
