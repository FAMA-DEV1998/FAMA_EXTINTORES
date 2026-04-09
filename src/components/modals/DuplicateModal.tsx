import React from "react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    empresaName: string;
    duplicateWithExt: boolean;
    setDuplicateWithExt: React.Dispatch<React.SetStateAction<boolean>>;
    onDuplicate: () => void;
    saving: boolean;
};

export default function DuplicateModal({
    isOpen, onClose, empresaName, duplicateWithExt, setDuplicateWithExt, onDuplicate, saving
}: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-white">📋 Duplicar Empresa</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
                </div>
                
                <div className="px-6 py-5 flex flex-col gap-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        Se creará una copia exacta de la empresa <strong className="text-white">"{empresaName}"</strong>. ¿Qué elementos deseas incluir en la copia?
                    </p>
                    
                    <div className="flex flex-col gap-3 mt-1">
                        <button
                            type="button"
                            onClick={() => setDuplicateWithExt(false)}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-bold transition-all hover:-translate-y-0.5 ${!duplicateWithExt ? "bg-red-950/30 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"}`}
                        >
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${!duplicateWithExt ? "border-red-500" : "border-zinc-600"}`}>
                                {!duplicateWithExt && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                            </span>
                            Solo datos de empresa
                        </button>
                        <button
                            type="button"
                            onClick={() => setDuplicateWithExt(true)}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-bold transition-all hover:-translate-y-0.5 ${duplicateWithExt ? "bg-red-950/30 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"}`}
                        >
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${duplicateWithExt ? "border-red-500" : "border-zinc-600"}`}>
                                {duplicateWithExt && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                            </span>
                            Empresa + Extintores
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end shrink-0 bg-zinc-900/50">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onDuplicate} disabled={saving} className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-900/20 disabled:opacity-50 transition-all hover:-translate-y-0.5">
                        {saving ? "⏳ Duplicando..." : "Copiar"}
                    </button>
                </div>
            </div>
        </div>
    );
}