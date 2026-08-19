import { useEmpresaScope } from "../../context/EmpresaScopeContext";

export default function SedesView() {
    const { sedes, role } = useEmpresaScope() as any;

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-zinc-800/60 bg-zinc-950/30 flex items-center justify-between">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                    🏬 Sedes
                    <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">
                        Total: {sedes.sedes.length}
                    </span>
                </h3>
                <button
                    onClick={sedes.openCreateSede}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                >
                    <span className="text-lg leading-none">+</span> Nueva Sede
                </button>
            </div>

            {sedes.sedes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 text-zinc-500 bg-zinc-950/20">
                    <span className="text-6xl drop-shadow-md opacity-80">🏬</span>
                    <p className="text-base font-medium">Esta empresa aún no tiene sedes registradas.</p>
                    <button onClick={sedes.openCreateSede} className="mt-2 text-sm font-bold text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4 transition-colors">
                        Registrar la primera
                    </button>
                </div>
            ) : (
                <div className="divide-y divide-zinc-800/40">
                    {sedes.sedes.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/20 transition-colors">
                            <div>
                                <p className="font-bold text-zinc-100">{s.nombre}</p>
                                <p className="text-xs text-zinc-500 font-medium mt-0.5">{s.direccion || "Sin dirección"} {s.distrito ? `· ${s.distrito}` : ""}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => sedes.openEditSede(s)} className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-sm flex items-center justify-center border border-zinc-700 transition-all" title="Editar Sede">
                                    ✏️
                                </button>
                                <button onClick={() => sedes.deleteSede(s.id, role)} className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-red-900/80 text-sm flex items-center justify-center border border-zinc-700 hover:border-red-700/80 transition-all" title="Eliminar Sede">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}