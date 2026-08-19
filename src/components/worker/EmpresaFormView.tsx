import type { Dispatch, SetStateAction } from "react";
import { DISTRITOS_LIMA } from "../../constants";
import type { EmpresaData } from "../../types";
import { Card, Field, inputCls } from "../ui/WorkerUI";

interface EmpresaFormViewProps {
  empresa: EmpresaData;
  setEmpresa: Dispatch<SetStateAction<EmpresaData>>;
  handleEmpresaSave: () => void;
  saving: boolean;
  connected: boolean;
}

export default function EmpresaFormView({ empresa, setEmpresa, handleEmpresaSave, saving, connected }: EmpresaFormViewProps) {
  return (
    <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <Card title="🏢 Datos de la Empresa">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
          <Field label="Razón Social" className="md:col-span-2">
            <input className={inputCls} value={empresa.razonSocial} onChange={(e) => setEmpresa((p) => ({ ...p, razonSocial: e.target.value }))} placeholder="Nombre oficial de la empresa" />
          </Field>
          <Field label="Dirección" className="md:col-span-2">
            <input className={inputCls} value={empresa.direccion} onChange={(e) => setEmpresa((p) => ({ ...p, direccion: e.target.value }))} placeholder="Dirección completa" />
          </Field>
          <Field label="Distrito">
            <select className={inputCls} value={empresa.distrito} onChange={(e) => setEmpresa((p) => ({ ...p, distrito: e.target.value }))}>
              <option value="">Seleccionar distrito...</option>
              {DISTRITOS_LIMA.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="RUC">
            <div className="relative">
              <input className={inputCls} value={empresa.ruc} onChange={(e) => { if (e.target.value.length <= 11) setEmpresa((p) => ({ ...p, ruc: e.target.value })); }} placeholder="20xxxxxxxxx" inputMode="numeric" maxLength={11} />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] md:text-xs font-bold ${empresa.ruc.length === 11 ? "text-emerald-500" : "text-zinc-400 bg-zinc-50 px-1"}`}>
                {empresa.ruc.length}/11 {empresa.ruc.length === 11 && "✓"}
              </span>
            </div>
          </Field>
        </div>
      </Card>

      <Card title="👤 Datos del Solicitante">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
          <Field label="Nombres y Apellidos" className="md:col-span-2">
            <input className={inputCls} value={empresa.nombresApellidos} onChange={(e) => setEmpresa((p) => ({ ...p, nombresApellidos: e.target.value }))} placeholder="Nombre completo del contacto" />
          </Field>
          <Field label="Celular">
            <input className={inputCls} value={empresa.celular} onChange={(e) => setEmpresa((p) => ({ ...p, celular: e.target.value }))} placeholder="9xx xxx xxx" inputMode="tel" />
          </Field>
          <Field label="N° Orden de Trabajo">
            <input className={inputCls} value={empresa.nOrdenTrabajo} onChange={(e) => setEmpresa((p) => ({ ...p, nOrdenTrabajo: e.target.value }))} placeholder="Ej: OT-0001" />
          </Field>
        </div>
      </Card>

      <Card title="📅 Fechas de Servicio">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
          <Field label="Fecha de Retiro">
            <input className={inputCls} type="date" value={empresa.fechaRetiro} onChange={(e) => setEmpresa((p) => ({ ...p, fechaRetiro: e.target.value }))} />
          </Field>
          <Field label="Fecha de Entrega (Estimada)">
            <input className={inputCls} type="date" value={empresa.fechaEntrega} onChange={(e) => setEmpresa((p) => ({ ...p, fechaEntrega: e.target.value }))} />
          </Field>
        </div>
      </Card>

      <div className="flex flex-col pt-2 pb-8">
        <button
          onClick={handleEmpresaSave}
          disabled={saving || !connected || !empresa.razonSocial}
          className="w-full py-4 md:py-5 rounded-2xl bg-red-700 text-white font-black text-sm md:text-base disabled:opacity-50 hover:bg-red-600 shadow-xl shadow-red-900/20 transition-all active:scale-95 hover:-translate-y-0.5"
        >
          {saving ? "⏳ Guardando información..." : "💾 Guardar Datos de Empresa"}
        </button>
      </div>
    </div>
  );
}