import { useState } from "react";
import type { WorkerView as View } from "../types";
import { emptyEmpresa, emptyForm } from "../utils/helpers";
import { useSocket, useCatalogLists } from "../hooks";
import { EmpresaFormView, ExtintoresListaView, ExtintorFormView, HomeView } from "../components/worker";
import { useEmpresaWorkerData, useExtintorFilters, useExtintorForm, useFormBackup, usePhotoCapture } from "../hooks/worker";

export default function WorkerPage({ user, onLogout }: { user: { id: string; username: string; role: string; displayName: string }; onLogout: () => void }) {
  const { socket, connected, catalogs } = useSocket(user.id, onLogout);
  const { MARCAS, AGENTES, RECARGAS, MOTIVOS_BAJA, SERVICIOS_EXTRA } = useCatalogLists(catalogs);

  const [view, setView] = useState<View>("home");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const empresaData = useEmpresaWorkerData(socket, setView, showToast, setSaving);
  const {
    empresas, activeId, activeIdRef, empresa, setEmpresa, extintores,
    changeActiveId, selectEmpresa, handleEmpresaSave,
  } = empresaData;

  const extintorForm = useExtintorForm(
    socket,
    user.role,
    activeId,
    setView,
    showToast,
    setSaving,
    () => formBackup.clearFormBackup()
  );
  const {
    form, setForm, editingRow, setEditingRow,
    handleRealizadoPH, handleExtintorSave, handleEdit, handleDelete, setF,
  } = extintorForm;

  const formBackup = useFormBackup(
    socket, form, editingRow, activeIdRef, view, empresa.razonSocial,
    changeActiveId, setForm, setEditingRow, setView, showToast
  );
  const { persistFormState, clearFormBackup } = formBackup;

  const photoCapture = usePhotoCapture(setForm, showToast);
  const {
    cameraInputRef, galleryInputRef, compressingPhoto,
    handleCameraCapture, removeEvidencia, MAX_EVIDENCIAS,
  } = photoCapture;

  const filters = useExtintorFilters(extintores, empresa);
  const {
    search, setSearch, fMarca, setFMarca, fAgente, setFAgente,
    fPeso, setFPeso, fEstado, setFEstado, soloIncompletos, setSoloIncompletos,
    incompletosCount, marcasDisponibles, agentesDisponibles,
    pesosDisponibles, estadosDisponibles, extintoresOrdenados,
  } = filters;

  return (
    <div className="app-workers flex flex-col h-dvh w-full bg-zinc-50/50 shadow-2xl relative" style={{ fontFamily: "'Instrument Sans', 'SF Pro Display', system-ui, sans-serif" }}>

      <header className="relative flex items-center justify-between px-5 md:px-8 bg-linear-to-r from-red-800 to-red-700 shrink-0 h-16 md:h-20 shadow-md z-20">
        <div className="flex items-center justify-start gap-4 z-10 w-1/3">
          {view !== "home" && (
            <button
              onClick={() => setView(view === "form" ? "lista" : "home")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-red-900/40 hover:bg-red-900/60 text-white transition-all active:scale-95"
            >
              <span className="text-2xl leading-none -mt-1">‹</span>
            </button>
          )}
          <div className="flex items-center gap-2 bg-red-950/30 px-3 py-1.5 rounded-full border border-red-900/30">
            <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? "bg-emerald-400 dot-pulse" : "bg-zinc-400"}`} />
            <span className="text-[10px] md:text-xs text-white/90 font-bold hidden sm:inline-block tracking-wide">
              {connected ? "En línea" : "Desconectado"}
            </span>
          </div>
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
              <a href="/dashboard" className="text-[9px] text-red-100 hover:text-white font-bold bg-red-950/40 hover:bg-red-900 px-2.5 py-1 rounded-full mt-1.5 transition-all border border-red-900/50">
                Dashboard
              </a>
            )}
          </div>
          <div className="w-px h-8 bg-red-900/50 mx-1 hidden sm:block" />
          <button onClick={onLogout} className="w-10 h-10 flex items-center justify-center rounded-full bg-red-900/40 hover:bg-red-900/60 text-white transition-all active:scale-95" title="Salir">
            ⏻
          </button>
        </div>
      </header>

      {activeId && view !== "home" && (
        <nav className="flex items-center gap-2 p-3 md:p-4 bg-white border-b border-zinc-200 shrink-0 shadow-sm z-10 overflow-x-auto scrollbar-hide">
          {(["empresa", "lista", "form"] as const).map((v) => {
            const labels = {
              empresa: "🏢 Empresa",
              lista: `📋 Lista${extintores.length ? ` (${extintores.length})` : ""}`,
              form: "➕ Nuevo Extintor",
            };
            const isActive = view === v;
            return (
              <button
                key={v}
                onClick={() => {
                  if (v === "form") { setForm(emptyForm()); setEditingRow(null); clearFormBackup(); }
                  setView(v);
                }}
                className={`flex-1 min-w-fit px-4 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 ${isActive ? "bg-red-700 text-white shadow-md shadow-red-900/20" : "bg-zinc-100/80 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"}`}
              >
                {labels[v]}
              </button>
            );
          })}
        </nav>
      )}

      {toast && (
        <div
          className={`toast-anim fixed top-24 left-1/2 z-50 px-6 py-3.5 rounded-full text-sm font-bold text-white shadow-2xl whitespace-nowrap flex items-center gap-2 ${toast.type === "ok" ? "bg-emerald-600 shadow-emerald-900/30" : "bg-red-600 shadow-red-900/30"}`}
          style={{ transform: "translateX(-50%)" }}
        >
          {toast.type === "ok" ? "✅" : "⚠️"} {toast.msg}
        </div>
      )}

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
        className="hidden"
        onChange={handleCameraCapture}
      />

      <main className="flex-1 overflow-hidden relative bg-zinc-50/50">

        {view === "home" && (
          <HomeView
            empresas={empresas}
            connected={connected}
            selectEmpresa={selectEmpresa}
            onCreateNew={() => { setEmpresa(emptyEmpresa()); changeActiveId(""); setView("empresa"); }}
          />
        )}

        {view === "empresa" && (
          <EmpresaFormView
            empresa={empresa}
            setEmpresa={setEmpresa}
            handleEmpresaSave={handleEmpresaSave}
            saving={saving}
            connected={connected}
          />
        )}

        {view === "lista" && (
          <ExtintoresListaView
            empresa={empresa}
            activeId={activeId}
            setView={setView}
            extintores={extintores}
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
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            setForm={setForm}
            setEditingRow={setEditingRow}
          />
        )}

        {view === "form" && (
          <ExtintorFormView
            editingRow={editingRow}
            form={form}
            setForm={setForm}
            setF={setF}
            handleRealizadoPH={handleRealizadoPH}
            handleExtintorSave={handleExtintorSave}
            socket={socket}
            userRole={user.role}
            MARCAS={MARCAS}
            AGENTES={AGENTES}
            RECARGAS={RECARGAS}
            MOTIVOS_BAJA={MOTIVOS_BAJA}
            SERVICIOS_EXTRA={SERVICIOS_EXTRA}
            saving={saving}
            connected={connected}
            setView={setView}
            setEditingRow={setEditingRow}
            clearFormBackup={clearFormBackup}
            MAX_EVIDENCIAS={MAX_EVIDENCIAS}
            removeEvidencia={removeEvidencia}
            persistFormState={persistFormState}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            compressingPhoto={compressingPhoto}
          />
        )}
      </main>
    </div>
  );
}