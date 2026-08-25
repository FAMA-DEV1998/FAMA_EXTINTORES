import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Link } from "react-router-dom";
import { useAlertas, ANTICIPACION_OPCIONES } from "../../hooks/dashboard/useAlertas";

const numeroWhatsapp = (celular: string) => {
  let num = (celular || "").replace(/\D/g, "");
  if (num.length === 9 && num.startsWith("9")) num = "51" + num;
  return num;
};

const campoInfo = (label: string, valor: string) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
    <p className="text-xs font-semibold text-zinc-200 truncate">{valor}</p>
  </div>
);

const AlertaBadge = ({ label, vencido, tono }: { label: string; vencido: boolean; tono: "rojo" | "ambar" | "azul" }) => {
  const colores = vencido
    ? "text-red-400 bg-red-950/30 border-red-900/40"
    : tono === "ambar"
      ? "text-amber-400 bg-amber-950/30 border-amber-900/40"
      : "text-sky-400 bg-sky-950/30 border-sky-900/40";
  return <span className={`text-xs font-black px-3 py-1.5 rounded-lg border ${colores}`}>{label}</span>;
};

function AlertaCard({ a }: { a: any }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-lg shrink-0">🧯</span>
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-100 truncate">{a.marca || "Sin marca registrada"}</p>
            <p className="text-[11px] text-zinc-500 truncate">{a.capacidad || "Sin capacidad"} {a.agente ? `· ${a.agente}` : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {a.revision && (
            <AlertaBadge
              label={a.revision.vencido ? `Revisión vencida — ${a.revision.vence}` : `Próxima revisión: ${a.revision.vence}`}
              vencido={a.revision.vencido}
              tono="ambar"
            />
          )}
          {a.ph && (
            <AlertaBadge
              label={a.ph.vencido ? `PH vencida — ${a.ph.vence}` : `PH vence: ${a.ph.vence}`}
              vencido={a.ph.vencido}
              tono="azul"
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2.5 bg-zinc-900/40 rounded-lg p-3 border border-zinc-800/40">
        {campoInfo("N° Interno", a.nInterno || "—")}
        {campoInfo("N° Serie", a.nSerie || "—")}
        {campoInfo("Último servicio", a.ultimoServicio || "Sin registro")}
        {campoInfo("Tipo de servicio", a.tipoServicio || "—")}
      </div>
    </div>
  );
}

export default function AlertasPage({ socket }: { socket: Socket | null }) {
  const { anticipacionDias, cambiarAnticipacion, empresas, totalVencidas, totalProximas, loading, recargar } = useAlertas(socket);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const mensajeWhatsapp = (razonSocial: string, alertas: any[]) => {
    const lineas = alertas.slice(0, 5).map((a) => {
      const motivo = a.revision && a.ph ? "Revisión y Prueba Hidrostática" : a.revision ? "Revisión anual" : "Prueba Hidrostática";
      return `• ${motivo} — ${a.nInterno || a.nSerie || "extintor"}`;
    });
    return encodeURIComponent(`Hola, le escribimos de FAMA para coordinar el servicio de sus extintores en ${razonSocial}:\n${lineas.join("\n")}`);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
        <div>
          <h1 className="text-xl font-black text-white">🔔 Alertas de Vencimiento</h1>
          <p className="text-xs text-zinc-500 mt-1">Revisión anual y Prueba Hidrostática por vencer</p>
        </div>
        <button onClick={recargar} className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-bold text-zinc-300 self-start md:self-auto">🔄 Actualizar</button>
      </div>

      <div className="mb-6 flex flex-col gap-2 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
        <label className="text-xs font-bold text-zinc-400 uppercase">Avisar con anticipación de</label>
        <select value={anticipacionDias} onChange={(e) => cambiarAnticipacion(Number(e.target.value))} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-300 focus:outline-none focus:border-red-600 w-fit">
          {ANTICIPACION_OPCIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Todo servicio o venta de un extintor requiere revisión al año (Venta, Recarga, Mantenimiento o Servicio cuentan por igual), por lo que "15 días" es exacto para esa alerta. La Prueba Hidrostática vence cada 5 años y se calcula desde el dato ya registrado en el extintor, desde el 1 de enero de ese año.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="px-4 py-3 rounded-2xl bg-red-950/20 border border-red-900/40">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">🔴 Vencidas</p>
          <p className="text-2xl font-black text-red-400">{totalVencidas}</p>
        </div>
        <div className="px-4 py-3 rounded-2xl bg-amber-950/20 border border-amber-900/40">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">🟡 Próximas a vencer</p>
          <p className="text-2xl font-black text-amber-400">{totalProximas}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : empresas.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800/60">
          <p className="text-5xl mb-3 opacity-80">✅</p>
          <p className="text-sm font-medium">No hay vencimientos próximos en el rango seleccionado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {empresas.map((empresa: any) => {
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
                      {!esMultisede && empresa.celular && (
                        <a href={`https://wa.me/${numeroWhatsapp(empresa.celular)}?text=${mensajeWhatsapp(empresa.razonSocial, todasLasAlertas)}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40">📲 Contactar</a>
                      )}
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
                          <div className="p-3 flex flex-col gap-3 bg-zinc-950/20">
                            {sede.alertas.map((a: any) => <AlertaCard key={a.uid} a={a} />)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col gap-3">
                        {todasLasAlertas.map((a: any) => <AlertaCard key={a.uid} a={a} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}