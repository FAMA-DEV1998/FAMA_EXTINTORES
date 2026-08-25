import type { Dispatch, SetStateAction } from "react";
import type { Sede } from "../../types";
import { SedeModal } from "../modals";

interface SedesViewProps {
  sedes: Sede[];
  sedeModal: boolean;
  setSedeModal: (v: boolean) => void;
  editingSede: Sede | null;
  setEditingSede: Dispatch<SetStateAction<Sede | null>>;
  savingSede: boolean;
  openCreateSede: () => void;
  openEditSede: (s: Sede) => void;
  saveSede: () => void;
  activeSedeId: string | null;
  changeActiveSede: (sedeId: string | null) => void;
  setView: (v: "todos") => void;
}

export default function SedesView({
  sedes, sedeModal, setSedeModal, editingSede, setEditingSede, savingSede,
  openCreateSede, openEditSede, saveSede, activeSedeId, changeActiveSede, setView,
}: SedesViewProps) {
  const irAExtintores = (sedeId: string) => {
    changeActiveSede(sedeId);
    setView("todos");
  };

  return (
    <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-5 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-black text-zinc-800">🏬 Sedes</h2>
        <button
          onClick={openCreateSede}
          className="px-4 py-2.5 rounded-xl bg-red-700 text-white font-bold text-sm hover:bg-red-600 shadow-md active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span className="text-lg leading-none">+</span> Nueva Sede
        </button>
      </div>

      {sedes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400 bg-white/60 border-2 border-dashed border-zinc-200 rounded-3xl">
          <span className="text-5xl opacity-80">🏬</span>
          <p className="text-sm font-bold text-zinc-500">Esta empresa aún no tiene sedes registradas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sedes.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${activeSedeId === s.id ? "bg-red-50 border-red-600" : "bg-white border-zinc-200 hover:border-zinc-300"}`}
            >
              <button onClick={() => irAExtintores(s.id)} className="flex-1 text-left flex items-center gap-2">
                {activeSedeId === s.id && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />}
                <span>
                  <p className="font-bold text-zinc-800">{s.nombre}</p>
                  {s.direccion && <p className="text-xs text-zinc-500 mt-0.5">{s.direccion}</p>}
                </span>
              </button>
              <button
                onClick={() => openEditSede(s)}
                className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm flex items-center justify-center transition-all"
                title="Editar Sede"
              >
                ✏️
              </button>
            </div>
          ))}
        </div>
      )}

      <SedeModal
        isOpen={sedeModal}
        form={editingSede}
        setForm={setEditingSede}
        onClose={() => setSedeModal(false)}
        onSave={saveSede}
        saving={savingSede}
      />
    </div>
  );
}
