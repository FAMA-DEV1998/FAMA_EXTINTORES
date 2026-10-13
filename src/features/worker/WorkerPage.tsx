import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Building, Building2, ChevronLeft, ChevronRight, FireExtinguisher, FolderClock, History, LayoutDashboard, LogOut, type LucideIcon } from "lucide-react";
import { MESES } from "../../constants";
import type { Extintor, Servicio, WorkerView as View, Usuario } from "../../types";
import { anioFromFecha, mesFromFecha } from "../../utils/fechas";
import { emptyEmpresa } from "../../utils/empresas";
import { useSocket } from "../../hooks/useSocket";
import { useListasCatalogo } from "../../hooks/useListasCatalogo";
import EmpresaFormView from "./empresas/EmpresaFormView";
import ExtintoresListaView from "./extintores/ExtintoresListaView";
import ExtintorFormView from "./extintores/ExtintorFormView";
import EmpresasInicioView from "./empresas/EmpresasInicioView";
import SedesView from "./sedes/SedesView";
import HistorialMesesView from "./historial/HistorialMesesView";
import HistorialMesView from "./historial/HistorialMesView";
import ServicioDetalleView from "./historial/ServicioDetalleView";
import EscanearQRModal from "./extintores/EscanearQRModal";
import { useEmpresaWorker } from "./hooks/useEmpresaWorker";
import { useFiltrosExtintores } from "./extintores/useFiltrosExtintores";
import { useExtintorWorkerForm } from "./extintores/useExtintorWorkerForm";
import { useRespaldoFormulario } from "./extintores/useRespaldoFormulario";
import { useCapturaFoto } from "./extintores/useCapturaFoto";
import { useSedes } from "../../hooks/useSedes";
import { useServicios } from "../../hooks/useServicios";
import { useTraslados } from "../../hooks/useTraslados";
import TrasladoSedeModal from "../../components/extintores/TrasladoSedeModal";
import Notificaciones, { confirmar } from "../../components/ui/Notificaciones";
import { useSocketSinSenal } from "./sinSenal/useSocketSinSenal";
import EstadoSincronizacion from "./sinSenal/EstadoSincronizacion";

export default function WorkerPage({ user, onLogout }: { user: Usuario; onLogout: () => void }) {
  const { socket: socketReal, connected, catalogs: catalogosServidor } = useSocket(user.id, onLogout, true);
  const { socket, sinSenal, resumen: estadoSinSenal } = useSocketSinSenal(socketReal, user.id);
  const catalogs = catalogosServidor.marcas.length > 0 || !estadoSinSenal.catalogos ? catalogosServidor : estadoSinSenal.catalogos;
  const puedeGuardar = connected || estadoSinSenal.listo;
  const { MARCAS, AGENTES, RECARGAS, MOTIVOS_BAJA, SERVICIOS_EXTRA, ETIQUETAS_CERTIFICADO } = useListasCatalogo(catalogs);

  const cerrarSesion = async () => {
    if (estadoSinSenal.pendientes > 0) {
      const ok = await confirmar({
        titulo: `Tienes ${estadoSinSenal.pendientes} cambio${estadoSinSenal.pendientes === 1 ? "" : "s"} sin enviar`,
        mensaje: "Quedarán guardados en este teléfono y se enviarán la próxima vez que inicies sesión con este usuario y haya señal.",
        textoConfirmar: "Cerrar sesión igual",
        textoCancelar: "Quedarme",
      });
      if (!ok) return;
    }
    onLogout();
  };

  const [view, setView] = useState<View>("home");
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    if (type === "err") toast.error(msg);
    else toast.success(msg);
  };

  const empresaData = useEmpresaWorker(socket, setView, showToast, setSaving);
  const {
    empresas, activeId, activeIdRef, empresa, setEmpresa, extintores, extintoresGlobal,
    activeSedeId, changeActiveSede, changeActiveId, selectEmpresa, handleEmpresaSave,
  } = empresaData;

  const extintorForm = useExtintorWorkerForm(
    socket,
    user.role,
    activeId,
    setView,
    showToast,
    setSaving,
    () => formBackup.clearFormBackup(),
    activeSedeId
  );
  const {
    form, setForm, editingRow, setEditingRow, returnView,
    lastSavedExtintor, clearLastSavedExtintor,
    handleRealizadoPH, handleMesRealizadoPH, handleExtintorSave, handleEdit, openCrearExtintor, handleDelete, deleteExtintorSilent, setF,
    coincidencias, cerrarAvisoDuplicado, confirmarYGuardar,
  } = extintorForm;

  const formBackup = useRespaldoFormulario(
    socket, form, editingRow, activeIdRef, view, empresa.razonSocial,
    changeActiveId, setForm, setEditingRow, setView, showToast
  );
  const { persistFormState, clearFormBackup } = formBackup;

  const photoCapture = useCapturaFoto(setForm, showToast, form.evidencias.length);
  const {
    cameraInputRef, galleryInputRef, compressingPhoto,
    handleCameraCapture, removeEvidencia, MAX_EVIDENCIAS,
  } = photoCapture;

  const filters = useFiltrosExtintores(extintores, empresa);
  const {
    search, setSearch, fMarca, setFMarca, fAgente, setFAgente,
    fPeso, setFPeso, fEstado, setFEstado, soloIncompletos, setSoloIncompletos,
    incompletosCount, marcasDisponibles, agentesDisponibles,
    pesosDisponibles, estadosDisponibles, extintoresOrdenados,
  } = filters;

  const sedesHook = useSedes(socket, activeId);
  const { sedes, sedeModal, setSedeModal, editingSede, setEditingSede, savingSede, openCreateSede, openEditSede, saveSede } = sedesHook;
  const hasSedes = sedes.length > 0;
  const sedeNameById = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));

  const serviciosHook = useServicios(socket, activeId, activeSedeId ?? null);
  const { servicios, saveServicio, deleteServicio, updateServicioDatos, addExtintorToServicio, removeExtintorDeServicio, setExtintorEstado } = serviciosHook;
  const serviciosGlobalHook = useServicios(socket, activeId, undefined);
  const { servicios: serviciosGlobal } = serviciosGlobalHook;

  const [activeAnio, setActiveAnio] = useState(() => new Date().getFullYear());
  const [activeMes, setActiveMes] = useState<number | null>(null);
  const [activeServicioId, setActiveServicioId] = useState<string | null>(null);
  const activeServicio = servicios.find((s) => s.id === activeServicioId) || null;

  useEffect(() => {
    if (!activeServicio) return;
    const anio = anioFromFecha(activeServicio.fechaRetiro);
    const mes = mesFromFecha(activeServicio.fechaRetiro);
    if (anio !== null) setActiveAnio(anio);
    if (mes !== null) setActiveMes(mes);
  }, [activeServicio?.id, activeServicio?.fechaRetiro]);

  const [trasladoExtintor, setTrasladoExtintor] = useState<Extintor | null>(null);
  const trasladosHook = useTraslados(socket, trasladoExtintor?.uid);

  const [qrModal, setQrModal] = useState(false);
  const [scanUidParaAsociar, setScanUidParaAsociar] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<{ empresaId: string; sedeId: string | null; uid: string; action: "asociar" | "crear" | "servicio"; servicioId?: string } | null>(null);

  useEffect(() => {
    const saved = lastSavedExtintor;
    if (!saved || !activeServicio || returnView !== "servicio") return;
    if (saved.isNew && !activeServicio.extintorUids.includes(saved.uid)) {
      addExtintorToServicio(activeServicio.id, saved.uid);
    }
    setExtintorEstado(activeServicio.id, saved.uid, saved.estado);
    clearLastSavedExtintor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSavedExtintor, activeServicio?.id, returnView]);

  const onSelectMes = (anio: number, mes: number) => {
    setActiveAnio(anio);
    setActiveMes(mes);
    setView("historialMes");
  };

  const onCrearServicio = (fechaRetiro: string, fechaEntrega: string) => {
    saveServicio({ fechaRetiro, fechaEntrega, extintorUids: [] }, (ok, id) => {
      if (ok && id) {
        setActiveServicioId(id);
        setView("servicio");
      }
    });
  };

  const iniciarFlujoQR = (r: { extintor: Extintor; empresa: { id: string; razonSocial: string }; sede: { id: string; nombre: string } | null }, accion: "asociar" | "crear") => {
    setQrModal(false);
    selectEmpresa(r.empresa.id);
    changeActiveSede(r.sede?.id ?? null);
    setPendingScan({ empresaId: r.empresa.id, sedeId: r.sede?.id ?? null, uid: r.extintor.uid, action: accion });
  };

  const irAlServicioDesdeQR = (r: { empresa: { id: string; razonSocial: string } }, servicio: Servicio) => {
    setQrModal(false);
    selectEmpresa(r.empresa.id);
    changeActiveSede(servicio.sedeId ?? null);
    setPendingScan({ empresaId: r.empresa.id, sedeId: servicio.sedeId ?? null, uid: "", action: "servicio", servicioId: servicio.id });
  };

  useEffect(() => {
    if (!pendingScan) return;
    if (activeId !== pendingScan.empresaId || activeSedeId !== pendingScan.sedeId) return;
    setScanUidParaAsociar(pendingScan.uid);
    if (pendingScan.action === "servicio" && pendingScan.servicioId) {
      setActiveServicioId(pendingScan.servicioId);
      setView("servicio");
    } else {
      setView("historial");
    }
    setPendingScan(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScan, activeId, activeSedeId]);

  const irAlServicioDesdeHistorial = (s: Servicio) => {
    const anio = anioFromFecha(s.fechaRetiro);
    const mes = mesFromFecha(s.fechaRetiro);
    if (anio === null || mes === null) return;
    if (s.sedeId !== activeSedeId) changeActiveSede(s.sedeId);
    setActiveAnio(anio);
    setActiveMes(mes);
    setActiveServicioId(s.id);
    setView("servicio");
  };

  const goBack = () => {
    if (view === "form") { setView(returnView); return; }
    if (view === "servicio") { setView("historialMes"); return; }
    if (view === "historialMes") { setView("historial"); return; }
    if (view === "historial" && activeSedeId) { changeActiveSede(null); setView("todos"); return; }
    setView("home");
  };

  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;
  const trampaAtrasRef = useRef(false);
  const ignorarPopRef = useRef(false);

  useEffect(() => {
    if (view !== "home" && !trampaAtrasRef.current) {
      window.history.pushState({ ...(window.history.state || {}), famaWorker: true }, "");
      trampaAtrasRef.current = true;
    } else if (view === "home" && trampaAtrasRef.current) {
      trampaAtrasRef.current = false;
      ignorarPopRef.current = true;
      window.history.back();
    }
  }, [view]);

  useEffect(() => {
    const onPop = () => {
      if (ignorarPopRef.current) { ignorarPopRef.current = false; return; }
      if (!trampaAtrasRef.current) return;
      trampaAtrasRef.current = false;
      goBackRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const mesActivoLabel = MESES.find((m) => parseInt(m.value) === activeMes)?.label || "";

  const mostrarTabs = activeId && view !== "home" && !["historialMes", "servicio", "form"].includes(view);

  return (
    <div className="app-workers flex flex-col h-dvh w-full bg-zinc-50/50 shadow-2xl relative" style={{ fontFamily: "'Instrument Sans', 'SF Pro Display', system-ui, sans-serif" }}>

      <header className="relative flex items-center justify-between px-5 md:px-8 bg-linear-to-r from-red-800 to-red-700 shrink-0 h-16 md:h-20 shadow-md z-20">
        <div className="flex items-center justify-start gap-4 z-10 w-1/3">
          {view !== "home" && (
            <button
              onClick={goBack}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-red-900/40 hover:bg-red-900/60 text-white transition-all active:scale-95"
              aria-label="Volver"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <EstadoSincronizacion resumen={estadoSinSenal} sinSenal={sinSenal} />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
          <div className="text-white font-black text-2xl md:text-3xl tracking-[4px] leading-none drop-shadow-sm">
            FAMA
          </div>
          <div className="text-red-200 text-[9px] md:text-[10px] font-bold tracking-[5px] uppercase mt-1 opacity-90">
            Extintores
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 z-10 w-1/3">
          <div className="flex flex-col items-end text-right sm:flex">
            <span className="text-xs text-white font-bold leading-none truncate max-w-32">
              {user.displayName.split(" ")[0]}
            </span>
            {(user.role === "admin" || user.role === "boss") && (
              <Link to="/dashboard" className="flex items-center gap-1 text-[9px] text-red-100 hover:text-white font-bold bg-red-950/40 hover:bg-red-900 px-2.5 py-1 rounded-full mt-1.5 transition-all border border-red-900/50">
                <LayoutDashboard className="w-3 h-3" />
                Dashboard
              </Link>
            )}
          </div>
          <div className="w-px h-8 bg-red-900/50 mx-1 hidden sm:block" />
          <button onClick={cerrarSesion} className="w-10 h-10 flex items-center justify-center rounded-full bg-red-900/40 hover:bg-red-900/60 text-white transition-all active:scale-95" title="Salir" aria-label="Cerrar sesión">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {activeId && view !== "home" && (
        <div className="px-4 md:px-8 pt-3 flex items-center gap-1.5 text-xs font-bold text-zinc-500 flex-wrap">
          <button onClick={() => { changeActiveSede(null); setView("todos"); }} className="text-zinc-700 hover:text-red-600 transition-colors">
            {empresa.razonSocial || activeId}
          </button>
          {activeSedeId && <><ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" /><button onClick={() => setView("sedes")} className="text-red-600 hover:text-red-700 transition-colors">{sedeNameById[activeSedeId] || "Sede"}</button></>}
          {(view === "historial" || view === "historialMes" || view === "servicio") && <><ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" /><button onClick={() => setView("historial")} disabled={view === "historial"} className="text-red-600 hover:text-red-700 transition-colors disabled:hover:text-red-600">Historial</button></>}
          {(view === "historialMes" || view === "servicio") && <><ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" /><button onClick={() => setView("historialMes")} disabled={view === "historialMes"} className="text-red-600 hover:text-red-700 transition-colors disabled:hover:text-red-600">{mesActivoLabel} {activeAnio}</button></>}
          {view === "servicio" && <><ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" /><span className="text-red-600">Servicio</span></>}
        </div>
      )}

      {mostrarTabs && (
        <nav className="flex items-center gap-2 p-3 md:p-4 bg-white border-b border-zinc-200 shrink-0 shadow-sm z-10 overflow-x-auto scrollbar-hide">
          {(activeSedeId
            ? (["todos", "historial"] as const)
            : (["empresa", "todos", "historial", "sedes"] as const)
          ).map((v) => {
            const pestanas: Record<string, { label: string; icono: LucideIcon }> = {
              empresa: { label: "Datos", icono: Building2 },
              todos: { label: `Todos los Extintores${extintores.length ? ` (${extintores.length})` : ""}`, icono: FireExtinguisher },
              historial: hasSedes && !activeSedeId ? { label: "Historial previo a sedes", icono: FolderClock } : { label: "Historial", icono: History },
              sedes: { label: "Sedes", icono: Building },
            };
            const { label, icono: Icono } = pestanas[v];
            const isActive = view === v;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 ${isActive ? "bg-red-700 text-white shadow-md shadow-red-900/20" : "bg-zinc-100/80 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"}`}
              >
                <Icono className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>
      )}

      <Notificaciones tema="claro" />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleCameraCapture}
      />

      <main className="flex-1 overflow-hidden relative bg-zinc-50/50">

        {view === "home" && (
          <EmpresasInicioView
            empresas={empresas}
            connected={connected || estadoSinSenal.listo}
            disponiblesSinSenal={connected ? null : estadoSinSenal.empresasDisponibles}
            selectEmpresa={selectEmpresa}
            onCreateNew={() => { setEmpresa(emptyEmpresa()); changeActiveId(""); setView("empresa"); }}
            onEscanearQR={() => setQrModal(true)}
          />
        )}

        {view === "empresa" && (
          <EmpresaFormView
            empresa={empresa}
            setEmpresa={setEmpresa}
            handleEmpresaSave={handleEmpresaSave}
            saving={saving}
            connected={puedeGuardar}
            empresasExistentes={empresas}
          />
        )}

        {view === "sedes" && (
          <SedesView
            sedes={sedes}
            sedeModal={sedeModal}
            setSedeModal={setSedeModal}
            editingSede={editingSede}
            setEditingSede={setEditingSede}
            savingSede={savingSede}
            openCreateSede={openCreateSede}
            openEditSede={openEditSede}
            saveSede={saveSede}
            activeSedeId={activeSedeId}
            changeActiveSede={changeActiveSede}
            setView={setView}
          />
        )}

        {view === "historial" && (
          <HistorialMesesView servicios={servicios} onSelectMes={onSelectMes} esHistorialPrevioASedes={hasSedes && !activeSedeId} />
        )}

        {view === "historialMes" && activeMes !== null && (
          <HistorialMesView
            anio={activeAnio}
            mes={activeMes}
            servicios={servicios}
            savingServicio={serviciosHook.savingServicio}
            onCrear={onCrearServicio}
            onSelectServicio={(id) => { setActiveServicioId(id); setView("servicio"); }}
            sedeNameById={hasSedes && !activeSedeId ? sedeNameById : undefined}
          />
        )}

        {view === "servicio" && activeServicio && (
          <ServicioDetalleView
            servicio={activeServicio}
            extintores={extintoresGlobal}
            servicios={servicios}
            empresa={empresa}
            activeId={activeId}
            socket={socket}
            hasSedes={hasSedes}
            sedeNameById={sedeNameById}
            onDelete={() => deleteServicio(activeServicio.id, () => setView("historialMes"))}
            onGuardarFechas={(fechaRetiro, fechaEntrega, notas) => updateServicioDatos(activeServicio.id, fechaRetiro, fechaEntrega, notas)}
            addExtintorToServicio={addExtintorToServicio}
            removeExtintorDeServicio={removeExtintorDeServicio}
            setExtintorEstado={setExtintorEstado}
            onNuevoExtintor={() => openCrearExtintor("servicio")}
            onEditarExtintor={(ext) => handleEdit(ext, "servicio")}
            deleteExtintorSilent={deleteExtintorSilent}
            autoAsociarUid={scanUidParaAsociar}
            onAutoAsociarConsumido={() => setScanUidParaAsociar(null)}
            etiquetasDisponibles={ETIQUETAS_CERTIFICADO}
          />
        )}

        {view === "todos" && (
          <ExtintoresListaView
            empresa={empresa}
            activeId={activeId}
            setView={setView}
            extintores={extintores}
            servicios={serviciosGlobal}
            socket={socket}
            search={search}
            setSearch={setSearch}
            fMarca={fMarca}
            setFMarca={setFMarca}
            fAgente={fAgente}
            setFAgente={setFAgente}
            fPeso={fPeso}
            setFPeso={setFPeso}
            fEstado={fEstado}
            setFEstado={setFEstado}
            soloIncompletos={soloIncompletos}
            setSoloIncompletos={setSoloIncompletos}
            incompletosCount={incompletosCount}
            marcasDisponibles={marcasDisponibles}
            agentesDisponibles={agentesDisponibles}
            pesosDisponibles={pesosDisponibles}
            estadosDisponibles={estadosDisponibles}
            extintoresOrdenados={extintoresOrdenados}
            handleDelete={handleDelete}
            hasSedes={hasSedes}
            activeSedeId={activeSedeId}
            sedeNameById={sedeNameById}
            onTrasladar={setTrasladoExtintor}
            onIrAlServicio={irAlServicioDesdeHistorial}
          />
        )}

        {view === "form" && (
          <ExtintorFormView
            editingRow={editingRow}
            form={form}
            setForm={setForm}
            setF={setF}
            handleRealizadoPH={handleRealizadoPH}
            handleMesRealizadoPH={handleMesRealizadoPH}
            handleExtintorSave={handleExtintorSave}
            socket={socket}
            userRole={user.role}
            MARCAS={MARCAS}
            AGENTES={AGENTES}
            RECARGAS={RECARGAS}
            MOTIVOS_BAJA={MOTIVOS_BAJA}
            SERVICIOS_EXTRA={SERVICIOS_EXTRA}
            saving={saving}
            connected={puedeGuardar}
            sinSenal={!connected}
            setView={setView}
            setEditingRow={setEditingRow}
            clearFormBackup={clearFormBackup}
            onCancel={() => setView(returnView)}
            MAX_EVIDENCIAS={MAX_EVIDENCIAS}
            removeEvidencia={removeEvidencia}
            persistFormState={persistFormState}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            compressingPhoto={compressingPhoto}
            coincidencias={coincidencias}
            onUsarExistente={(rowIndex) => {
              const ext = extintoresGlobal.find((e) => e.rowIndex === rowIndex) || extintores.find((e) => e.rowIndex === rowIndex);
              if (ext) handleEdit(ext, returnView);
              else cerrarAvisoDuplicado();
            }}
            onCerrarAvisoDuplicado={cerrarAvisoDuplicado}
            onConfirmarYGuardar={confirmarYGuardar}
          />
        )}
      </main>

      <TrasladoSedeModal
        isOpen={!!trasladoExtintor}
        extintorNombre={trasladoExtintor?.nSerie || "S/N"}
        sedeOrigenNombre={trasladoExtintor?.sedeId ? (sedeNameById[trasladoExtintor.sedeId] || "—") : "Sin sede"}
        sedesDisponibles={sedes.filter((s) => s.id !== trasladoExtintor?.sedeId)}
        onClose={() => setTrasladoExtintor(null)}
        saving={trasladosHook.savingTraslado}
        onConfirm={(data) => {
          if (!trasladoExtintor || !activeId) return;
          trasladosHook.trasladarExtintor({
            extintorUid: trasladoExtintor.uid,
            rowIndex: trasladoExtintor.rowIndex,
            empresaId: activeId,
            sedeOrigenId: trasladoExtintor.sedeId,
            sedeDestinoId: data.sedeDestinoId,
            fecha: data.fecha,
            motivo: data.motivo,
          }, (ok, error) => {
            if (ok) setTrasladoExtintor(null);
            else if (error) showToast(error, "err");
          });
        }}
      />

      <EscanearQRModal
        isOpen={qrModal}
        socket={socket}
        onClose={() => setQrModal(false)}
        onAsociar={(r) => iniciarFlujoQR(r, "asociar")}
        onCrearServicio={(r) => iniciarFlujoQR(r, "crear")}
        onIrAlServicio={irAlServicioDesdeQR}
      />
    </div>
  );
}
