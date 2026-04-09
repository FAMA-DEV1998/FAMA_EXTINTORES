type Props = {
    observation: string | null;
    onClose: () => void;
};

export default function ObservationModal({ observation, onClose }: Props) {
    if (observation === null) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-800/20 rounded-t-2xl">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        📝 Observaciones del Extintor
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">✕</button>
                </div>
                
                {/* CAMBIO UX: Permite hacer scroll si el texto es muy largo */}
                <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
                    <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4">
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-medium">
                            {observation}
                        </p>
                    </div>
                </div>
                
                <div className="px-6 py-4 border-t border-zinc-800 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}