import { useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { Building2, CircleCheck, Globe, Inbox, Mail, MessageCircle, Phone, ReceiptText, RotateCcw, Search, X } from "lucide-react";
import { useSolicitudesWeb, type EstadoSolicitud, type SolicitudWeb } from "./useSolicitudesWeb";

const SITIO = "https://extintoresfama.com";
const FILTROS: { value: EstadoSolicitud | "todos"; label: string }[] = [
  { value: "nuevo", label: "Nuevas" },
  { value: "atendido", label: "Atendidas" },
  { value: "descartado", label: "Descartadas" },
  { value: "todos", label: "Todas" },
];

const numeroWhatsapp = (tel: string) => {
  let n = (tel || "").replace(/\D/g, "");
  if (n.length === 9 && n.startsWith("9")) n = "51" + n;
  return n;
};

const fecha = (s: string) => {
  const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
  return isNaN(d.getTime()) ? s : d.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
};

function Tarjeta({ s, onEstado }: { s: SolicitudWeb; onEstado: (e: EstadoSolicitud) => void }) {
  const esCotizacion = s.type === "cotizacion";
  const totalUnidades = s.items.reduce((n, i) => n + i.qty, 0);
  const saludo = `Hola ${s.name.split(" ")[0]}, le escribimos de Extintores Fama por su ${esCotizacion ? "solicitud de cotización" : "consulta"} en nuestra web.`;
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 ${s.status === "nuevo" ? "border-red-900/50 bg-red-950/10" : "border-zinc-800/60 bg-zinc-900/40"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${esCotizacion ? "text-amber-400 bg-amber-950/30 border-amber-900/40" : "text-sky-400 bg-sky-950/30 border-sky-900/40"}`}>
            {esCotizacion ? <ReceiptText className="w-3 h-3" /> : <Mail className="w-3 h-3" />}{esCotizacion ? "Cotización" : "Contacto"}
          </span>
          <h4 className="mt-2 text-base font-black text-white">{s.name}</h4>
          {(s.company || s.ruc) && <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5"><Building2 className="w-3.5 h-3.5" />{[s.company, s.ruc && `RUC ${s.ruc}`].filter(Boolean).join(" · ")}</p>}
        </div>
        <span className="text-[11px] text-zinc-500 whitespace-nowrap">{fecha(s.createdAt)}</span>
      </div>

      {s.subject && <p className="text-sm font-bold text-zinc-200">{s.subject}</p>}
      {s.message && <p className="text-sm text-zinc-300 whitespace-pre-line">{s.message}</p>}

      {s.items.length > 0 && (
        <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
          <div className="px-3 py-2 bg-zinc-900/60 text-[10px] font-black uppercase tracking-wider text-zinc-500">{s.items.length} producto{s.items.length === 1 ? "" : "s"} · {totalUnidades} unidad{totalUnidades === 1 ? "" : "es"}</div>
          <ul className="divide-y divide-zinc-800/60">
            {s.items.map((i) => (
              <li key={i.slug} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <a href={`${SITIO}/producto/${i.slug}/`} target="_blank" rel="noopener" className="text-zinc-200 hover:text-red-400 font-bold">{i.name}</a>
                <span className="font-black text-white bg-zinc-800 rounded-md px-2 py-0.5">× {i.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {s.phone && (
          <a href={`https://wa.me/${numeroWhatsapp(s.phone)}?text=${encodeURIComponent(saludo)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-300 text-xs font-bold"><MessageCircle className="w-4 h-4" />WhatsApp</a>
        )}
        {s.phone && <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold"><Phone className="w-4 h-4" />{s.phone}</a>}
        {s.email && <a href={`mailto:${s.email}?subject=${encodeURIComponent(esCotizacion ? "Cotización Extintores Fama" : "Extintores Fama")}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold"><Mail className="w-4 h-4" />{s.email}</a>}
        <span className="ml-auto flex gap-2">
          {s.status !== "atendido" && <button onClick={() => onEstado("atendido")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold"><CircleCheck className="w-4 h-4" />Atendida</button>}
          {s.status === "nuevo" && <button onClick={() => onEstado("descartado")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold" title="Spam o duplicada"><X className="w-4 h-4" />Descartar</button>}
          {s.status !== "nuevo" && <button onClick={() => onEstado("nuevo")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold"><RotateCcw className="w-4 h-4" />Reabrir</button>}
        </span>
      </div>
    </div>
  );
}

export default function SolicitudesWebPage({ socket }: { socket: Socket | null }) {
  const { solicitudes, loading, cambiarEstado } = useSolicitudesWeb(socket);
  const [filtro, setFiltro] = useState<EstadoSolicitud | "todos">("nuevo");
  const [buscar, setBuscar] = useState("");

  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return solicitudes
      .filter((s) => filtro === "todos" || s.status === filtro)
      .filter((s) => !q || [s.name, s.company, s.ruc, s.phone, s.email, s.subject, s.message, ...s.items.map((i) => i.name)]
        .some((v) => (v || "").toLowerCase().includes(q)));
  }, [solicitudes, filtro, buscar]);

  const conteo = (e: EstadoSolicitud | "todos") => (e === "todos" ? solicitudes.length : solicitudes.filter((s) => s.status === e).length);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2"><Globe className="w-5 h-5 text-red-500" />Solicitudes Web</h3>
          <p className="text-sm text-zinc-400 mt-1">Cotizaciones y mensajes enviados desde extintoresfama.com</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar cliente, producto…" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-600" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button key={f.value} onClick={() => setFiltro(f.value)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtro === f.value ? "bg-red-700 text-white" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"}`}>
            {f.label} <span className="opacity-70">({conteo(f.value)})</span>
          </button>
        ))}
      </div>

      {loading && solicitudes.length === 0 ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800/60">
          <Inbox className="w-12 h-12 mb-3 mx-auto text-zinc-700" strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay solicitudes {filtro === "nuevo" ? "nuevas" : "en esta vista"}.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.map((s) => <Tarjeta key={s.id} s={s} onEstado={(e) => cambiarEstado(s.id, e)} />)}
        </div>
      )}
    </div>
  );
}
