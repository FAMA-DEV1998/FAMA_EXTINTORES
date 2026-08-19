import type { EmpresaItem } from "../../types";

interface HomeViewProps {
  empresas: EmpresaItem[];
  connected: boolean;
  selectEmpresa: (id: string) => void;
  onCreateNew: () => void;
}

export default function HomeView({ empresas, connected, selectEmpresa, onCreateNew }: HomeViewProps) {
  return (
    <div className="scroll-area h-full overflow-y-auto p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="text-center pt-6 md:pt-10 pb-4">
        <h1 className="text-2xl md:text-4xl font-black text-zinc-800 tracking-tight">Directorio de Empresas</h1>
        <p className="text-sm md:text-base text-zinc-500 mt-2 font-medium">Selecciona un cliente para gestionar sus extintores</p>
      </div>

      {empresas.length === 0 && connected && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-zinc-400 bg-white/60 rounded-3xl border-2 border-dashed border-zinc-200 shadow-sm">
          <span className="text-6xl drop-shadow-sm opacity-80">📋</span>
          <p className="text-sm md:text-base font-bold text-zinc-500">No hay empresas registradas aún</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6">
        {empresas.map((emp) => (
          <button
            key={emp.id}
            onClick={() => selectEmpresa(emp.id)}
            className="flex items-center gap-4 p-5 bg-white border border-zinc-200/80 rounded-2xl text-left hover:border-red-300 hover:shadow-xl active:bg-red-50 transition-all hover:-translate-y-1 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-3xl group-hover:bg-red-100 transition-colors shrink-0 shadow-inner">
              🏢
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-zinc-800 text-sm md:text-base truncate group-hover:text-red-700 transition-colors">
                {emp.razonSocial}
              </p>
              <p className="text-xs text-zinc-400 font-medium mt-0.5 truncate">Toca para gestionar</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-red-600 transition-colors shrink-0">
              <span className="text-zinc-400 group-hover:text-white text-lg font-bold">›</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCreateNew}
        className="w-full md:w-auto md:self-center md:px-14 py-4 rounded-2xl bg-red-700 text-white font-black text-sm md:text-base hover:bg-red-600 shadow-lg shadow-red-900/20 transition-all hover:-translate-y-0.5 active:scale-95 mt-4 flex items-center justify-center gap-2"
      >
        <span className="text-xl leading-none">+</span> Registrar Nueva Empresa
      </button>
    </div>
  );
}