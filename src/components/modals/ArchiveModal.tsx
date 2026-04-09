type Props = {
    isOpen: boolean;
    onClose: () => void;
    onArchive: () => void;
    saving: boolean;
};

export default function ArchiveModal({ isOpen, onClose, onArchive, saving }: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-red-900/50 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-red-950/10 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                        🗂️ Archivar Empresa
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
                </div>
                
                <div className="px-6 py-6 flex flex-col gap-3">
                    <p className="text-sm font-medium text-zinc-300 leading-relaxed">
                        ¿Estás seguro de que deseas archivar esta empresa?
                    </p>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 mt-1">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            La empresa y todos sus extintores dejarán de ser visibles en la lista principal, pero podrán ser restaurados por el jefe desde el panel de <strong className="text-zinc-300">Archivados</strong>.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end shrink-0 bg-zinc-900/50">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={onArchive}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-900/20 disabled:opacity-50 transition-all hover:-translate-y-0.5"
                    >
                        {saving ? "⏳ Procesando..." : "Sí, Archivar"}
                    </button>
                </div>
            </div>
        </div>
    );
}