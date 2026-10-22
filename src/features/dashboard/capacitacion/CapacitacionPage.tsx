import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import {
  ArrowLeft, Award, Copy, Download, ExternalLink, GraduationCap, KeyRound, LoaderCircle, MessageCircle, Palette, Plus, Power, RotateCcw, Search, Users, X,
} from "lucide-react";
import PlantillaEditor from "./PlantillaEditor";
import { ENLACE_WEB, descargarBase64, emitir, useCodigosCap, type CodigoCap, type TrabajadorCap } from "./tipos";

const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-600";
const fecha = (s: string | number) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString("es-PE", { dateStyle: "medium" });
};

function NuevoCodigo({ socket, onClose }: { socket: Socket; onClose: () => void }) {
  const [empresas, setEmpresas] = useState<{ id: string; razonSocial: string }[]>([]);
  const [d, setD] = useState({ empresaId: "", empresaNombre: "", cupos: 20, intentosMax: 3, notaMinima: 70, venceEn: "" });
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { emitir<{ empresas: any[] }>(socket, "cap:empresas").then((r) => setEmpresas(r.empresas)).catch(() => {}); }, [socket]);
  const crear = async () => {
    setOcupado(true);
    try {
      const r = await emitir<{ codigo: CodigoCap }>(socket, "cap:codigo:crear", { ...d, empresaId: d.empresaId || null, venceEn: d.venceEn || null });
      navigator.clipboard?.writeText(ENLACE_WEB(r.codigo.codigo)).catch(() => {});
      toast.success(`Código ${r.codigo.codigo} creado. Enlace copiado.`);
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setOcupado(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Nuevo código">
      <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between"><h3 className="text-lg font-black text-white">Nuevo código de capacitación</h3><button onClick={onClose} aria-label="Cerrar"><X className="w-5 h-5 text-zinc-400" /></button></div>
        <label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">Empresa del sistema</span>
          <select className={inputCls} value={d.empresaId} onChange={(e) => setD({ ...d, empresaId: e.target.value })}>
            <option value="">— Otra empresa (escribir abajo) —</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.razonSocial}</option>)}
          </select>
        </label>
        {!d.empresaId && (
          <label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">Razón social</span><input className={inputCls} value={d.empresaNombre} onChange={(e) => setD({ ...d, empresaNombre: e.target.value })} placeholder="Empresa S.A.C." /></label>
        )}
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">Cupos</span><input type="number" min={1} className={inputCls} value={d.cupos} onChange={(e) => setD({ ...d, cupos: Number(e.target.value) })} /></label>
          <label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">Intentos</span><input type="number" min={1} max={20} className={inputCls} value={d.intentosMax} onChange={(e) => setD({ ...d, intentosMax: Number(e.target.value) })} /></label>
          <label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">Nota mín.</span><input type="number" min={1} max={100} className={inputCls} value={d.notaMinima} onChange={(e) => setD({ ...d, notaMinima: Number(e.target.value) })} /></label>
        </div>
        <label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-zinc-400">Vence el (opcional)</span><input type="date" className={inputCls} value={d.venceEn} onChange={(e) => setD({ ...d, venceEn: e.target.value })} /></label>
        <button onClick={crear} disabled={ocupado} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold">
          {ocupado ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Crear código
        </button>
      </div>
    </div>
  );
}

function Resultados({ socket, codigo, onVolver }: { socket: Socket; codigo: CodigoCap; onVolver: () => void }) {
  const [lista, setLista] = useState<TrabajadorCap[] | null>(null);
  const [buscar, setBuscar] = useState("");
  const cargar = () => emitir<{ trabajadores: TrabajadorCap[] }>(socket, "cap:resultados", { codigoId: codigo.id }).then((r) => setLista(r.trabajadores)).catch((e) => toast.error(e.message));
  useEffect(() => {
    cargar();
    socket.on("cap:changed", cargar);
    return () => { socket.off("cap:changed", cargar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, codigo.id]);

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (lista ?? []).filter((t) => !q || `${t.nombres} ${t.apellidos} ${t.dni} ${t.cargo}`.toLowerCase().includes(q));
  }, [lista, buscar]);

  const pdf = async (c: string) => {
    try {
      const r = await emitir<{ pdfBase64: string; nombre: string }>(socket, "cap:certificado:pdf", { codigo: c });
      descargarBase64(r.pdfBase64, r.nombre);
    } catch (e) { toast.error((e as Error).message); }
  };
  const reiniciar = async (t: TrabajadorCap) => {
    if (!window.confirm(`¿Dar nuevos intentos a ${t.nombres} ${t.apellidos}? Se borran sus intentos no aprobados.`)) return;
    try { await emitir(socket, "cap:trabajador:reiniciar", { trabajadorId: t.id }); toast.success("Intentos habilitados"); } catch (e) { toast.error((e as Error).message); }
  };
  const csv = () => {
    const filas = [["DNI", "Apellidos", "Nombres", "Cargo", "Estado", "Mejor puntaje", "Intentos", "Certificado", "Fecha"],
      ...(lista ?? []).map((t) => [t.dni, t.apellidos, t.nombres, t.cargo, t.estado, t.mejorPuntaje ?? "", t.intentos, t.certificado?.codigo ?? "", t.certificado?.fecha ?? ""])];
    const texto = "﻿" + filas.map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    a.download = `capacitacion-${codigo.empresaNombre}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onVolver} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold"><ArrowLeft className="w-4 h-4" />Códigos</button>
        <div className="mr-auto">
          <p className="text-white font-black">{codigo.empresaNombre}</p>
          <p className="text-xs text-zinc-500 font-mono">{codigo.codigo} · {codigo.registrados}/{codigo.cupos} registrados · {codigo.aprobados} aprobados</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar nombre o DNI…" className={`${inputCls} pl-9`} />
        </div>
        <button onClick={csv} disabled={!lista?.length} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold disabled:opacity-40"><Download className="w-4 h-4" />Excel (CSV)</button>
      </div>
      {!lista ? (
        <div className="flex justify-center py-16"><LoaderCircle className="w-6 h-6 text-red-500 animate-spin" /></div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 rounded-2xl border border-dashed border-zinc-800"><Users className="w-10 h-10 mx-auto mb-2 text-zinc-700" />Aún no hay trabajadores registrados con este código.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-500">
              <tr><th className="px-4 py-3 text-left">Trabajador</th><th className="px-4 py-3 text-left">DNI</th><th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-right">Mejor</th><th className="px-4 py-3 text-right">Intentos</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {filtrados.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-3"><p className="font-bold text-zinc-100">{t.apellidos}, {t.nombres}</p><p className="text-xs text-zinc-500">{t.cargo || "—"}</p></td>
                  <td className="px-4 py-3 font-mono text-zinc-300">{t.dni}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${t.estado === "aprobado" ? "bg-emerald-950/50 text-emerald-400" : t.estado === "reprobado" ? "bg-red-950/50 text-red-400" : "bg-zinc-800 text-zinc-400"}`}>
                      {t.estado === "aprobado" ? <><Award className="w-3 h-3" />Aprobado</> : t.estado === "reprobado" ? "No aprobado" : t.enCurso ? "En curso" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-zinc-100">{t.mejorPuntaje ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-zinc-400">{t.intentos}/{codigo.intentosMax}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {t.certificado && <button onClick={() => pdf(t.certificado!.codigo)} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800" title={`Certificado ${t.certificado.codigo}`}><Download className="w-4 h-4" /></button>}
                      {!t.certificado && t.intentos >= codigo.intentosMax && <button onClick={() => reiniciar(t)} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800" title="Dar nuevos intentos"><RotateCcw className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CapacitacionPage({ socket }: { socket: Socket | null }) {
  const { codigos, cargando } = useCodigosCap(socket);
  const [tab, setTab] = useState<"codigos" | "diseno">("codigos");
  const [nuevo, setNuevo] = useState(false);
  const [viendo, setViendo] = useState<CodigoCap | null>(null);

  const alternar = async (c: CodigoCap) => {
    if (!socket) return;
    try { await emitir(socket, "cap:codigo:actualizar", { id: c.id, activo: !c.activo }); toast.success(c.activo ? "Código desactivado" : "Código activado"); } catch (e) { toast.error((e as Error).message); }
  };
  const compartir = (c: CodigoCap) =>
    `https://wa.me/?text=${encodeURIComponent(`Capacitación virtual en uso de extintores — ${c.empresaNombre}\n\nIngresa a ${ENLACE_WEB(c.codigo)}\nCódigo: ${c.codigo}\n\nRegístrate con tu DNI y completa la simulación para obtener tu certificado.`)}`;

  if (!socket) return null;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2"><GraduationCap className="w-5 h-5 text-red-500" />Capacitación virtual</h3>
          <p className="text-sm text-zinc-400 mt-1">Simulación 3D en extintoresfama.com/capacitacion con certificado verificable</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setTab("codigos"); setViendo(null); }} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold ${tab === "codigos" ? "bg-red-700 text-white" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}><KeyRound className="w-4 h-4" />Códigos y resultados</button>
          <button onClick={() => setTab("diseno")} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold ${tab === "diseno" ? "bg-red-700 text-white" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}><Palette className="w-4 h-4" />Diseño del certificado</button>
        </div>
      </div>

      {tab === "diseno" ? (
        <PlantillaEditor socket={socket} />
      ) : viendo ? (
        <Resultados socket={socket} codigo={codigos.find((c) => c.id === viendo.id) ?? viendo} onVolver={() => setViendo(null)} />
      ) : (
        <>
          <div className="flex justify-end">
            <button onClick={() => setNuevo(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold"><Plus className="w-4 h-4" />Nuevo código para una empresa</button>
          </div>
          {cargando && !codigos.length ? (
            <div className="flex justify-center py-16"><LoaderCircle className="w-6 h-6 text-red-500 animate-spin" /></div>
          ) : !codigos.length ? (
            <div className="text-center py-16 text-zinc-600 rounded-2xl border border-dashed border-zinc-800">
              <KeyRound className="w-10 h-10 mx-auto mb-2 text-zinc-700" />Crea un código para que una empresa registre a sus trabajadores.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {codigos.map((c) => {
                const vencido = !!c.venceEn && c.venceEn < new Date().toISOString().slice(0, 10);
                return (
                  <div key={c.id} className={`rounded-2xl border p-4 flex flex-col gap-3 ${c.activo && !vencido ? "border-zinc-800/60 bg-zinc-900/40" : "border-zinc-800/40 bg-zinc-950/40 opacity-70"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-white truncate">{c.empresaNombre}</p>
                        <p className="font-mono text-sm text-red-400 tracking-wide">{c.codigo}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-md ${!c.activo ? "bg-zinc-800 text-zinc-500" : vencido ? "bg-amber-950/50 text-amber-400" : "bg-emerald-950/50 text-emerald-400"}`}>{!c.activo ? "Inactivo" : vencido ? "Vencido" : "Activo"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-zinc-950/60 py-2"><p className="text-zinc-500">Registrados</p><p className="text-white font-black text-base">{c.registrados}<span className="text-zinc-500 text-xs">/{c.cupos}</span></p></div>
                      <div className="rounded-lg bg-zinc-950/60 py-2"><p className="text-zinc-500">Aprobados</p><p className="text-emerald-400 font-black text-base">{c.aprobados}</p></div>
                      <div className="rounded-lg bg-zinc-950/60 py-2"><p className="text-zinc-500">Vence</p><p className="text-white font-bold text-sm mt-0.5">{c.venceEn ? fecha(`${c.venceEn}T12:00:00`) : "—"}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setViendo(c)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold"><Users className="w-4 h-4" />Resultados</button>
                      <button onClick={() => { navigator.clipboard?.writeText(ENLACE_WEB(c.codigo)); toast.success("Enlace copiado"); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold"><Copy className="w-4 h-4" />Enlace</button>
                      <a href={compartir(c)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-300 text-xs font-bold"><MessageCircle className="w-4 h-4" />WhatsApp</a>
                      <a href={ENLACE_WEB(c.codigo)} target="_blank" rel="noopener" className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800" title="Abrir en la web"><ExternalLink className="w-4 h-4" /></a>
                      <button onClick={() => alternar(c)} className="ml-auto p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800" title={c.activo ? "Desactivar" : "Activar"}><Power className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {nuevo && <NuevoCodigo socket={socket} onClose={() => setNuevo(false)} />}
        </>
      )}
    </div>
  );
}
