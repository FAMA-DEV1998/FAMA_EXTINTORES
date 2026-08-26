import type { Dispatch, SetStateAction } from "react";
import { DISTRITOS_LIMA } from "../../constants";
import type { EmpresaData } from "../../types";
import { validarRucPorTipo, detectarTipoClientePorRuc } from "../../utils/helpers";
import { Card, Field, inputCls } from "../ui/WorkerUI";

interface EmpresaFormViewProps {
  empresa: EmpresaData;
  setEmpresa: Dispatch<SetStateAction<EmpresaData>>;
  handleEmpresaSave: () => void;
  saving: boolean;
  connected: boolean;
}

export default function EmpresaFormView({ empresa, setEmpresa, handleEmpresaSave, saving, connected }: EmpresaFormViewProps) {
  const tipoCliente = empresa.tipoCliente || "";
  const esPersona = tipoCliente === "persona";
  const maxLen = esPersona ? 8 : 11;
  const errorRuc = tipoCliente ? validarRucPorTipo(tipoCliente, empresa.ruc) : null;

  const setRuc = (valor: string) => {
    const limpio = valor.replace(/\D/g, "").slice(0, maxLen);
    setEmpresa((p) => {
      const detectado = p.tipoCliente !== "persona" ? detectarTipoClientePorRuc(limpio) : null;
      return { ...p, ruc: limpio, tipoCliente: detectado || p.tipoCliente };
    });
  };

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
          <Field label="Tipo de Cliente">
            <select className={inputCls} value={tipoCliente} onChange={(e) => setEmpresa((p) => ({ ...p, tipoCliente: e.target.value || null }))}>
              <option value="">Sin clasificar</option>
              <option value="persona">Persona (DNI)</option>
              <option value="ruc10">RUC 10</option>
              <option value="ruc20">RUC 20</option>
            </select>
          </Field>
          <Field label={esPersona ? "DNI" : "RUC"} className="md:col-span-2">
            <div className="relative">
              <input className={inputCls} value={empresa.ruc} onChange={(e) => setRuc(e.target.value)} placeholder={esPersona ? "8 dígitos" : "20xxxxxxxxx"} inputMode="numeric" maxLength={maxLen} />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] md:text-xs font-bold ${empresa.ruc.length === maxLen ? "text-emerald-500" : "text-zinc-400 bg-zinc-50 px-1"}`}>
                {empresa.ruc.length}/{maxLen} {empresa.ruc.length === maxLen && "✓"}
              </span>
            </div>
            {errorRuc && <p className="text-xs font-bold text-amber-600 mt-1.5">⚠️ {errorRuc}</p>}
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

      <div className="flex flex-col pt-2 pb-8">
        <button
          onClick={handleEmpresaSave}
          disabled={saving || !connected || !empresa.razonSocial || (empresa.ruc.length > 0 && empresa.ruc.length !== maxLen)}
          className="w-full py-4 md:py-5 rounded-2xl bg-red-700 text-white font-black text-sm md:text-base disabled:opacity-50 hover:bg-red-600 shadow-xl shadow-red-900/20 transition-all active:scale-95 hover:-translate-y-0.5"
        >
          {saving ? "⏳ Guardando información..." : "💾 Guardar Datos de Empresa"}
        </button>
      </div>
    </div>
  );
}