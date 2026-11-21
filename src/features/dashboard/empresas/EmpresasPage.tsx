import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { confirmar } from "../../../components/ui/Notificaciones";
import { useNavigate } from "react-router-dom";
import { ArrowDownUp, Building2, Clock, FireExtinguisher, GitMerge, LayoutGrid, List, MapPin, Plus, Search, X } from "lucide-react";
import type { Socket } from "socket.io-client";
import { useFiltrosDashboard } from "../hooks/useFiltrosDashboard";
import { useEmpresaForm } from "./useEmpresaForm";
import { useServiciosRecientes } from "./useServiciosRecientes";
import { useEmpresaSeleccionada } from "./useEmpresaSeleccionada";
import EmpresaModal from "./EmpresaModal";
import FusionEmpresasModal from "./FusionEmpresasModal";
import ScrollableRow from "../../../components/ui/ScrollableRow";
import { CLASIFICACION_FILTROS, filtrarPorClasificacion, type ClasificacionFiltro } from "../../../utils/empresas";
import { EtiquetaClasificacion } from "../../../components/ui/IconosEmpresa";
import { ordinalServicio } from "../../../utils/historial";
import { MESES } from "../../../constants";
import type { Catalogs } from "../../../hooks/useSocket";
import { usePreferenciaLocal } from "../../../hooks/usePreferenciaLocal";
import { detectarDuplicados, detectarPosiblesSedes, ordenarEmpresas, OPCIONES_ORDEN_EMPRESAS, TEXTO_MOTIVO_DUPLICADO, type OrdenEmpresas } from "../../../utils/duplicados";
import ResumenPanel from "../resumen/ResumenPanel";
import ListaEmpresas, { type Parecida, type VistaEmpresas } from "./ListaEmpresas";
import RevisionDatosPanel, { type ParDuplicado } from "./RevisionDatosPanel";
import PlanDatosModal, { type DatosUnificar } from "./PlanDatosModal";
import { useResumenEmpresas, type SedePorObservacion } from "./useResumenEmpresas";

const OPCIONES_ORDEN: { value: OrdenEmpresas; label: string }[] = [{ value: "servicio", label: "Último servicio primero" }, ...OPCIONES_ORDEN_EMPRESAS];

const rutaServicioReciente = (s: any): string => {
  const [anio, mesNum] = (s.fechaRetiro || "").split("-");
  const mesLabel = MESES.find((m) => m.value === String(Number(mesNum)))?.label.toLowerCase();
  const base = s.sedeSlug ? `/dashboard/${s.empresaSlug}/sedes/${s.sedeSlug}` : `/dashboard/${s.empresaSlug}`;
  if (!anio || !mesLabel) return base;
  return `${base}/historial/${anio}/${mesLabel}/${s.id}`;
};

const mesAnioServicioReciente = (fechaRetiro: string): { mes: string; anio: string } => {
  const [anio, mesNum] = (fechaRetiro || "").split("-");
  const mes = MESES.find((m) => m.value === String(Number(mesNum)))?.label || "Sin fecha";
  return { mes, anio: anio || "" };
};

export default function EmpresasPage({ socket, role }: { socket: Socket | null; role: string; catalogs: Catalogs }) {
  const navigate = useNavigate();

  const { empresas, empresasCargadas } = useEmpresaSeleccionada(socket);
  const { recientes } = useServiciosRecientes(socket, 8);

  const [saving, setSaving] = useState(false);
  const noop = () => {};
  const empresaFormHook = useEmpresaForm(socket, role, null, noop, saving, setSaving, (slug) => navigate(`/dashboard/${slug}/sedes`));
  const {
    empresaForm, setEmpresaForm, createEmpresaModal, setCreateEmpresaModal,
    openCreateEmpresa, saveNewEmpresa,
  } = empresaFormHook;

  const filters = useFiltrosDashboard(empresas, [], [], [], []);
  const { search, setSearch, filtered } = filters;

  const [fTipo, setFTipo] = useState<ClasificacionFiltro>("");
  const [orden, setOrden] = usePreferenciaLocal<OrdenEmpresas>("fama_orden_empresas", "servicio");
  const [vista, setVista] = usePreferenciaLocal<VistaEmpresas>("fama_vista_empresas", "lista");
  const [paresOcultos, setParesOcultos] = usePreferenciaLocal<string[]>("fama_duplicados_ocultos", []);
  const resumen = useResumenEmpresas(socket);
  const porEmpresa = resumen?.porEmpresa || null;
  const filteredFinal = ordenarEmpresas(filtrarPorClasificacion(filtered, fTipo), orden, (e) => porEmpresa?.[e.id]?.ultimoServicio || "");

  const pares = useMemo<ParDuplicado[]>(() => {
    const porId = new Map(empresas.map((e) => [e.id, e]));
    const mapa = new Map<string, ParDuplicado>();
    const agregar = (x: string, y: string, motivo: string, sugerencia?: ParDuplicado["sugerencia"]) => {
      const a = porId.get(x), b = porId.get(y);
      if (!a || !b) return;
      const clave = [x, y].sort().join("|");
      if (paresOcultos.includes(clave)) return;
      const previo = mapa.get(clave);
      mapa.set(clave, previo ? { ...previo, motivo: `${previo.motivo} · ${motivo}`, sugerencia: previo.sugerencia || sugerencia } : { clave, a: { id: a.id, razonSocial: a.razonSocial }, b: { id: b.id, razonSocial: b.razonSocial }, motivo, sugerencia });
    };
    detectarDuplicados(empresas).forEach((lista, id) => lista.forEach((d) => { if (id < d.id) agregar(id, d.id, TEXTO_MOTIVO_DUPLICADO[d.motivo]); }));
    detectarPosiblesSedes(empresas).forEach((s) => agregar(s.origen, s.destino, s.sedeNombre ? `Parece la sede «${s.sedeNombre}» de ${porId.get(s.destino)?.razonSocial}` : `Parece una sede nueva «${s.parte}» de ${porId.get(s.destino)?.razonSocial}`, { origen: s.origen, destino: s.destino, sedeDestinoId: s.sedeId }));
    (resumen?.duplicadosPorExtintores || []).forEach((d) => agregar(d.a, d.b, `${d.compartidos} extintor${d.compartidos === 1 ? "" : "es"} con la misma serie (${d.series.slice(0, 3).join(", ")})`));
    return [...mapa.values()];
  }, [empresas, resumen, paresOcultos]);

  const parecidas = useMemo(() => {
    const m = new Map<string, Parecida[]>();
    for (const p of pares) {
      const rol = (id: string) => (p.sugerencia ? { esSedeDe: p.sugerencia.origen === id, tieneSede: p.sugerencia.destino === id } : {});
      m.set(p.a.id, [...(m.get(p.a.id) || []), { clave: p.clave, id: p.b.id, razonSocial: p.b.razonSocial, motivo: p.motivo, ...rol(p.a.id) }]);
      m.set(p.b.id, [...(m.get(p.b.id) || []), { clave: p.clave, id: p.a.id, razonSocial: p.a.razonSocial, motivo: p.motivo, ...rol(p.b.id) }]);
    }
    return m;
  }, [pares]);

  const [fusionModal, setFusionModal] = useState(false);
  const [fusionPar, setFusionPar] = useState<DatosUnificar | null>(null);
  const [planModal, setPlanModal] = useState(false);
  const puedeFusionar = role === "admin" || role === "boss";
  const hayFiltros = !!(search || fTipo);
  const limpiarFiltros = () => { setSearch(""); setFTipo(""); };
  const abrirFusion = (par: DatosUnificar | null) => {
    setFusionPar(par);
    setFusionModal(true);
  };
  const reasignarPorObservacion = async (items: SedePorObservacion[]) => {
    if (!socket || !items.length) return;
    const ok = await confirmar({ titulo: items.length === 1 ? "¿Reasignar este extintor?" : `¿Reasignar ${items.length} extintores?`, mensaje: "Cada uno pasará a la sede que indica su observación y quedará registrado como traslado.", textoConfirmar: "Reasignar" });
    if (!ok) return;
    const fecha = new Date().toISOString().slice(0, 10);
    let fallidos = 0;
    for (const x of items) {
      const res: any = await new Promise((r) => socket.emit("traslado:create", { extintorUid: x.uid, rowIndex: x.rowIndex, empresaId: x.empresaId, sedeOrigenId: x.sedeActualId, sedeDestinoId: x.sedeSugeridaId, fecha, motivo: `Según observación: ${x.observaciones}`.slice(0, 200) }, r));
      if (!res?.success) fallidos++;
    }
    if (fallidos) toast.error(`${fallidos} extintor(es) no se pudieron reasignar`);
    else toast.success(items.length === 1 ? "Extintor reasignado" : `${items.length} extintores reasignados`);
  };

  const unificarPar = (p: ParDuplicado) => {
    if (p.sugerencia) { abrirFusion({ ...p.sugerencia, acciones: {} }); return; }
    const extA = porEmpresa?.[p.a.id]?.extintores || 0;
    const extB = porEmpresa?.[p.b.id]?.extintores || 0;
    const [origen, destino] = extA <= extB ? [p.a.id, p.b.id] : [p.b.id, p.a.id];
    abrirFusion({ origen, destino, sedeDestinoId: null, acciones: {} });
  };

  return (
    <>
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    {puedeFusionar && <ResumenPanel socket={socket} />}
    {recientes.length > 0 && (
      <div className="mb-8 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Clock className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-black text-zinc-300 uppercase tracking-wider">Últimos servicios creados</h2>
        </div>
        <ScrollableRow className="gap-3" botonesSiempreVisibles={recientes.length > 4}>
          {recientes.slice(0, 8).map((s: any) => {
            const { mes, anio } = mesAnioServicioReciente(s.fechaRetiro);
            return (
              <button
                key={s.id}
                onClick={() => navigate(rutaServicioReciente(s))}
                className="shrink-0 w-60 flex flex-col gap-2.5 bg-zinc-950/50 hover:bg-zinc-900 border border-zinc-800/60 hover:border-red-800/60 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
              >
                <span className="w-9 h-9 rounded-xl bg-red-950/40 text-red-400 flex items-center justify-center shrink-0"><FireExtinguisher className="w-4 h-4" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-zinc-100 truncate leading-tight">{s.razonSocial}</p>
                  {s.sedeNombre && <p className="flex items-center gap-1 text-[11px] text-zinc-500 truncate mt-0.5"><MapPin className="w-3 h-3 shrink-0" />{s.sedeNombre}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-800/60">
                  <span className="px-2 py-1 rounded-md bg-red-950/30 border border-red-900/30 text-[10px] font-bold text-red-300 whitespace-nowrap">
                    {ordinalServicio(s.posicionEnMes || 1)} servicio del mes
                  </span>
                  <span className="px-2 py-1 rounded-md bg-zinc-800/80 text-[10px] font-bold text-zinc-300 whitespace-nowrap">
                    {mes} {anio}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-zinc-800/80 text-[10px] font-bold text-zinc-300 whitespace-nowrap">
                    {s.extintoresCount ?? 0} extintor{s.extintoresCount === 1 ? "" : "es"}
                  </span>
                </div>
              </button>
            );
          })}
        </ScrollableRow>
      </div>
    )}

    {/* Cabecera y Filtros */}
    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
        <div className="relative flex-1 min-w-60 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUC o solicitante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all shadow-inner"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" aria-label="Limpiar búsqueda">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-1 py-1 text-xs font-bold text-zinc-400">
          <ArrowDownUp className="w-3.5 h-3.5 shrink-0" />
          <span className="sr-only">Ordenar empresas</span>
          <select value={orden} onChange={(e) => setOrden(e.target.value as OrdenEmpresas)} className="bg-transparent py-1.5 pr-2 text-zinc-200 focus:outline-none cursor-pointer">
            {OPCIONES_ORDEN.map((o) => <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {CLASIFICACION_FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFTipo(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${fTipo === f.value ? "bg-red-600 border-red-600 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
            >
              <EtiquetaClasificacion value={f.value} label={f.label} />
            </button>
          ))}
        </div>

        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1" role="group" aria-label="Vista">
          {([["lista", List, "Lista"], ["tarjetas", LayoutGrid, "Tarjetas"]] as const).map(([v, Icono, texto]) => (
            <button key={v} onClick={() => setVista(v)} aria-pressed={vista === v} title={texto} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${vista === v ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              <Icono className="w-3.5 h-3.5" /><span className="hidden xl:inline">{texto}</span>
            </button>
          ))}
        </div>

        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 transition-all"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      <button
        onClick={openCreateEmpresa}
        className="w-full md:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(220,38,38,0.3)] active:scale-95 shrink-0 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Nueva Empresa
      </button>
      {puedeFusionar && (
        <button
          onClick={() => abrirFusion(null)}
          className="w-full md:w-auto px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-bold text-zinc-200 transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2"
        >
          <GitMerge className="w-4 h-4" /> Unificar Empresas
        </button>
      )}
    </div>

    {puedeFusionar && empresasCargadas && (
      <RevisionDatosPanel
        socket={socket}
        sinClasificar={empresas.filter((e) => !e.tipoCliente).length}
        filtrandoSinClasificar={fTipo === "sin_clasificar"}
        onVerSinClasificar={() => setFTipo(fTipo === "sin_clasificar" ? "" : "sin_clasificar")}
        pares={pares}
        onUnificar={unificarPar}
        onOcultarPar={(clave) => setParesOcultos([...paresOcultos, clave])}
        onImportar={() => setPlanModal(true)}
        sedesObservacion={resumen?.sedesPorObservacion || []}
        nombreEmpresa={(id) => empresas.find((e) => e.id === id)?.razonSocial || ""}
        onReasignar={reasignarPorObservacion}
      />
    )}

    {/* Empresas */}
    {!empresasCargadas ? (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-zinc-500">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold">Cargando empresas...</p>
      </div>
    ) : filteredFinal.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800 mt-4">
        <Building2 className="w-16 h-16 text-zinc-700" strokeWidth={1.5} />
        <p className="text-base font-medium">
          {hayFiltros ? "No se encontraron resultados para tu búsqueda." : "Aún no hay empresas registradas en el sistema."}
        </p>
        {hayFiltros && (
          <button onClick={limpiarFiltros} className="mt-2 text-sm font-bold text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4 transition-colors">
            Limpiar filtros
          </button>
        )}
        {!hayFiltros && (
          <button onClick={openCreateEmpresa} className="mt-2 text-sm font-bold text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4 transition-colors">
            Comenzar creando la primera
          </button>
        )}
      </div>
    ) : (
      <>
        <p className="text-sm font-bold text-zinc-500 mb-4 px-1">{filteredFinal.length} {filteredFinal.length === 1 ? "empresa encontrada" : "empresas encontradas"}</p>
        <ListaEmpresas
          empresas={filteredFinal}
          resumen={porEmpresa}
          diasProximos={resumen?.diasProximos || 90}
          vista={vista}
          parecidas={parecidas}
          puedeFusionar={puedeFusionar}
          onAbrir={(emp) => navigate(`/dashboard/${emp.slug}/extintores`)}
          onUnificar={(clave) => { const p = pares.find((x) => x.clave === clave); if (p) unificarPar(p); }}
        />
      </>
    )}
  </div>

      {createEmpresaModal && empresaForm && (
        <EmpresaModal title="Nueva Empresa" icon={Building2} form={empresaForm} setForm={setEmpresaForm} onClose={() => setCreateEmpresaModal(false)} onSave={saveNewEmpresa} saving={saving} empresasExistentes={empresas} />
      )}
      {puedeFusionar && (
        <>
          <FusionEmpresasModal isOpen={fusionModal} onClose={() => setFusionModal(false)} socket={socket} empresas={empresas} origenInicial={fusionPar?.origen} destinoInicial={fusionPar?.destino} sedeInicial={fusionPar?.sedeDestinoId} accionesIniciales={fusionPar?.acciones} />
          <PlanDatosModal isOpen={planModal} visible={!fusionModal} onClose={() => setPlanModal(false)} socket={socket} onUnificar={abrirFusion} />
        </>
      )}
    </>
  );
}
