import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Link } from "react-router-dom";
import { useAlertas, ANTICIPACION_OPCIONES } from "../../hooks/dashboard/useAlertas";
import { estadoColor } from "../../utils/helpers";

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

const MotivoBadge = ({ label, vencido, tono }: { label: string; vencido: boolean; tono: "ambar" | "azul" }) => {
  const colores = vencido
    ? "text-red-400 bg-red-950/30 border-red-900/40"
    : tono === "ambar"
      ? "text-amber-400 bg-amber-950/30 border-amber-900/40"
      : "text-sky-400 bg-sky-950/30 border-sky-900/40";
  return <span className={`text-[10px] font-black px-2 py-1 rounded-md border whitespace-nowrap ${colores}`}>{vencido ? "🔴" : tono === "ambar" ? "🟡" : "🔵"} {label}</span>;
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
          <button onClick={() => setDescartando((v) => !v)} className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 px-2.5 py-1 rounded-lg hover:bg-zinc-800/60">
            🔕 Descartar
          </button>
        </td>
      </tr>
      {descartando && (
        <tr className="border-b border-zinc-800/40 last:border-0 bg-zinc-950/40">
          <td colSpan={8} className="px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-zinc-500">El cliente no continuará o no responde. Motivo (opcional):</span>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Cliente no responde hace 2 meses" className="flex-1 min-w-40 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-600" />
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

function SilenciarEmpresaBoton({ empresaId, onDescartar }: { empresaId: string; onDescartar: (empresaId: string, motivo: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");

  const confirmar = () => {
    onDescartar(empresaId, motivo.trim());
    setAbierto(false);
    setMotivo("");
  };

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800">🔕 Silenciar empresa</button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" className="flex-1 min-w-40 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-600" />
      <button onClick={confirmar} className="text-xs font-bold text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg">Confirmar</button>
      <button onClick={() => setAbierto(false)} className="text-xs font-bold text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg">Cancelar</button>
    </div>
  );
}

function EmpresasSilenciadasPanel({ empresas, onReactivar }: { empresas: any[]; onReactivar: (empresaId: string) => void }) {
  if (empresas.length === 0) return null;
  return (
    <div className="mt-8 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
        <h2 className="text-base font-black text-zinc-100">🔕 Empresas con Alertas Silenciadas</h2>
        <p className="text-xs text-zinc-500 mt-1">{empresas.length} empresa{empresas.length === 1 ? "" : "s"} silenciada{empresas.length === 1 ? "" : "s"}</p>
      </div>
      <div className="divide-y divide-zinc-800/40">
        {empresas.map((e: any) => (
          <div key={e.empresaId} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-200 truncate">{e.razonSocial}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{e.tipoCliente === "persona" ? "DNI" : "RUC"} {e.ruc || "—"}{e.motivo && ` · ${e.motivo}`}</p>
            </div>
            <button onClick={() => onReactivar(e.empresaId)} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40 shrink-0">✅ Reactivar</button>
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
        <h2 className="text-base font-black text-zinc-100">🔕 Extintores con Alerta Silenciada</h2>
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
                  <button onClick={() => onReactivar(e.uid)} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40">✅ Reactivar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AlertasPage({ socket }: { socket: Socket | null }) {
  const {
    anticipacionDias, cambiarAnticipacion, empresas, loading, recargar,
    descartarAlerta, reactivarAlerta, descartarAlertaEmpresa, reactivarAlertaEmpresa,
    empresasSilenciadas, extintoresSilenciados,
  } = useAlertas(socket);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todas" | "vencidas" | "proximas">("todas");

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const mensajeWhatsapp = (razonSocial: string, alertas: any[]) => {
    const lineas = alertas.slice(0, 5).map((a) => {
      const motivo = a.revision && a.ph ? "Revisión y Prueba Hidrostática" : a.revision ? "Revisión anual" : "Prueba Hidrostática";
      return `• ${motivo} — ${a.nInterno || a.nSerie || "extintor"}`;
    });
    return encodeURIComponent(`Hola, le escribimos de FAMA para coordinar el servicio de sus extintores en ${razonSocial}:\n${lineas.join("\n")}`);
  };

  const empresasVisibles = empresas
    .map((empresa: any) => {
      const sedes = empresa.sedes
        .map((sede: any) => ({ ...sede, alertas: filtrarAlertaVisible(sede.alertas) }))
        .filter((sede: any) => sede.alertas.length > 0);
      return { ...empresa, sedes };
    })
    .filter((empresa: any) => empresa.sedes.length > 0);

  const todasLasAlertasVisibles = empresasVisibles.flatMap((e: any) => e.sedes.flatMap((s: any) => s.alertas));
  const totalVencidasVisibles = todasLasAlertasVisibles.filter((a: any) => a.vencido).length;
  const totalProximasVisibles = todasLasAlertasVisibles.length - totalVencidasVisibles;

  const empresasFiltradas = empresasVisibles
    .map((empresa: any) => {
      const sedes = empresa.sedes
        .map((sede: any) => ({
          ...sede,
          alertas: sede.alertas.filter((a: any) => filtroEstado === "todas" || (filtroEstado === "vencidas" ? a.vencido : !a.vencido)),
        }))
        .filter((sede: any) => sede.alertas.length > 0);
      return { ...empresa, sedes };
    })
    .filter((empresa: any) => empresa.sedes.length > 0)
    .filter((empresa: any) => !busqueda.trim() || empresa.razonSocial.toLowerCase().includes(busqueda.trim().toLowerCase()));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
        <div>
          <h1 className="text-xl font-black text-white">🔔 Alertas de Vencimiento</h1>
          <p className="text-xs text-zinc-500 mt-1">{MOSTRAR_ALERTAS_PH ? "Servicio/recarga y Prueba Hidrostática por vencer" : "Servicio vencido (1 año desde el último servicio)"}</p>
        </div>
        <button onClick={recargar} className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-bold text-zinc-300 self-start md:self-auto">🔄 Actualizar</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={() => setFiltroEstado("todas")} className={`px-4 py-3 rounded-2xl border text-left transition-all ${filtroEstado === "todas" ? "bg-zinc-800 border-zinc-600" : "bg-zinc-900/30 border-zinc-800/60 hover:border-zinc-700"}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Todas</p>
          <p className="text-2xl font-black text-white">{totalVencidasVisibles + totalProximasVisibles}</p>
        </button>
        <button onClick={() => setFiltroEstado("vencidas")} className={`px-4 py-3 rounded-2xl border text-left transition-all ${filtroEstado === "vencidas" ? "bg-red-950/40 border-red-700" : "bg-red-950/20 border-red-900/40 hover:border-red-800"}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">🔴 Vencidas</p>
          <p className="text-2xl font-black text-red-400">{totalVencidasVisibles}</p>
        </button>
        <button onClick={() => setFiltroEstado("proximas")} className={`px-4 py-3 rounded-2xl border text-left transition-all ${filtroEstado === "proximas" ? "bg-amber-950/40 border-amber-700" : "bg-amber-950/20 border-amber-900/40 hover:border-amber-800"}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">🟡 Próximas</p>
          <p className="text-2xl font-black text-amber-400">{totalProximasVisibles}</p>
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">🔎</span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar empresa..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-600" />
        </div>
        <select value={anticipacionDias} onChange={(e) => cambiarAnticipacion(Number(e.target.value))} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-300 focus:outline-none focus:border-red-600">
          {ANTICIPACION_OPCIONES.map((o) => <option key={o.value} value={o.value}>Avisar con {o.label}</option>)}
        </select>
      </div>

      <div className="mb-6 flex items-start gap-2.5 bg-zinc-900/20 px-4 py-3 rounded-xl border border-zinc-800/40">
        <span className="text-sm shrink-0">ℹ️</span>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          El servicio/recarga aplica a cualquier trabajo o venta (Recarga, Mantenimiento, etc.) por igual y se considera vencido 1 año después del último servicio.{MOSTRAR_ALERTAS_PH ? " La Prueba Hidrostática vence cada 5 años según el dato ya registrado en el extintor." : ""} Al descartar una alerta, esta deja de mostrarse hasta que se registre un nuevo servicio sobre ese extintor.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : empresasFiltradas.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800/60">
          <p className="text-5xl mb-3 opacity-80">{busqueda ? "🔎" : "✅"}</p>
          <p className="text-sm font-medium">{busqueda ? "Ninguna empresa coincide con la búsqueda" : "No hay vencimientos próximos en el rango seleccionado"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {empresasFiltradas.map((empresa: any) => {
            const sedesNombradas = empresa.sedes.filter((s: any) => s.nombre);
            const esMultisede = sedesNombradas.length > 1;
            const sedeUnica = sedesNombradas.length === 1 ? sedesNombradas[0].nombre : null;
            const icono = esMultisede ? "🏬" : empresa.tipoCliente === "persona" ? "👤" : "🏢";
            const todasLasAlertas = empresa.sedes.flatMap((s: any) => s.alertas);
            const vencidasEmpresa = todasLasAlertas.filter((a: any) => a.vencido).length;
            const isOpen = expanded[empresa.empresaId];
            return (
              <div key={empresa.empresaId} className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
                <button onClick={() => toggle(empresa.empresaId)} className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 text-left transition-colors ${isOpen ? "bg-zinc-800/40 border-b border-zinc-800/80" : "bg-zinc-900/60 hover:bg-zinc-800/60"}`}>
                  <div className="min-w-0">
                    <p className="text-base font-black text-zinc-100 truncate">{icono} {empresa.razonSocial}{esMultisede && <span className="ml-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest align-middle">Multisede</span>}</p>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      {empresa.nombresApellidos || "Sin contacto"} · {empresa.celular || "Sin celular"}
                      {sedeUnica && ` · 📍 ${sedeUnica}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {vencidasEmpresa > 0 && <span className="text-xs font-bold text-red-400 bg-red-950/30 border border-red-900/30 px-3 py-1 rounded-lg">{vencidasEmpresa} vencido{vencidasEmpresa !== 1 ? "s" : ""}</span>}
                    {todasLasAlertas.length - vencidasEmpresa > 0 && <span className="text-xs font-bold text-amber-400 bg-amber-950/30 border border-amber-900/30 px-3 py-1 rounded-lg">{todasLasAlertas.length - vencidasEmpresa} próximo{todasLasAlertas.length - vencidasEmpresa !== 1 ? "s" : ""}</span>}
                    <div className={`w-8 h-8 rounded-full bg-zinc-950/50 border border-zinc-800 flex items-center justify-center text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>▼</div>
                  </div>
                </button>

                {isOpen && (
                  <div className="p-5 flex flex-col gap-4 bg-zinc-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-2 -mt-1">
                      <Link to={`/dashboard/${empresa.slug}`} className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800">Ver registro completo</Link>
                      <div className="flex flex-wrap items-center gap-2">
                        {!esMultisede && empresa.celular && (
                          <a href={`https://wa.me/${numeroWhatsapp(empresa.celular)}?text=${mensajeWhatsapp(empresa.razonSocial, todasLasAlertas)}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40">📲 Contactar</a>
                        )}
                        <SilenciarEmpresaBoton empresaId={empresa.empresaId} onDescartar={descartarAlertaEmpresa} />
                      </div>
                    </div>

                    {esMultisede ? (
                      empresa.sedes.map((sede: any) => (
                        <div key={sede.sedeId || "__sin_sede__"} className="rounded-xl border border-zinc-800/60 overflow-hidden">
                          <div className="px-4 py-3 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-zinc-200">{sede.nombre ? `📍 ${sede.nombre}` : "Sin sede asignada"}</p>
                            {empresa.celular && (
                              <a href={`https://wa.me/${numeroWhatsapp(empresa.celular)}?text=${mensajeWhatsapp(empresa.razonSocial, sede.alertas)}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40">📲 Contactar</a>
                            )}
                          </div>
                          <div className="p-3 bg-zinc-950/20">
                            <TablaAlertas alertas={sede.alertas} onDescartar={descartarAlerta} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <TablaAlertas alertas={todasLasAlertas} onDescartar={descartarAlerta} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EmpresasSilenciadasPanel empresas={empresasSilenciadas} onReactivar={reactivarAlertaEmpresa} />
      <ExtintoresSilenciadosPanel extintores={extintoresSilenciados} onReactivar={reactivarAlerta} />
    </div>
  );
}