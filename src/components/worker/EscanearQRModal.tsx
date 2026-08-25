import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Extintor, Servicio, TrasladoSede } from "../../types";
import ExtintorCard from "./ExtintorCard";
import ExtintorHistorialModal from "./ExtintorHistorialModal";

export type ResultadoScan = {
    extintor: Extintor;
    empresa: { id: string; razonSocial: string };
    sede: { id: string; nombre: string } | null;
    servicios: Servicio[];
    traslados: TrasladoSede[];
};

interface Props {
    isOpen: boolean;
    socket: Socket | null;
    onClose: () => void;
    onAsociar?: (r: ResultadoScan) => void;
    onCrearServicio?: (r: ResultadoScan) => void;
    onIrAlServicio?: (r: ResultadoScan, servicio: Servicio) => void;
    scopeEmpresaId?: string;
    scopeSedeId?: string | null;
    onAsociarDirecto?: (r: ResultadoScan) => void;
}

export default function EscanearQRModal({
    isOpen, socket, onClose, onAsociar, onCrearServicio, onIrAlServicio,
    scopeEmpresaId, scopeSedeId, onAsociarDirecto,
}: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const escaneandoRef = useRef(false);

    const [error, setError] = useState<string | null>(null);
    const [buscando, setBuscando] = useState(false);
    const [resultado, setResultado] = useState<ResultadoScan | null>(null);
    const [historialAbierto, setHistorialAbierto] = useState(false);

    const escaneoAcotado = scopeEmpresaId !== undefined;

    const detenerCamara = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const buscarExtintor = (uid: string) => {
        if (!socket) return;
        escaneandoRef.current = false;
        detenerCamara();
        setBuscando(true);
        socket.emit("extintor:scan", { uid }, (res: any) => {
            setBuscando(false);
            if (!res?.success) {
                setError(res?.error || "Extintor no encontrado");
                return;
            }
            setResultado(res);
            if (escaneoAcotado) {
                if (res.empresa.id !== scopeEmpresaId) {
                    setError("Este extintor pertenece a otra Empresa. No puede asociarse desde aquí.");
                    return;
                }
                if ((res.sede?.id ?? null) !== (scopeSedeId ?? null)) {
                    setError("Este extintor pertenece a otra Sede. No puede asociarse desde aquí.");
                    return;
                }
                if (res.extintor.estadoExtintor === "De Baja") {
                    setError("Este extintor está De Baja y no puede asociarse a un servicio.");
                    return;
                }
                onAsociarDirecto?.(res);
                handleClose();
            }
        });
    };

    const loop = async () => {
        if (!escaneandoRef.current || !videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const { default: jsQR } = await import("jsqr");
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code?.data) {
                    buscarExtintor(code.data);
                    return;
                }
            }
        }
        rafRef.current = requestAnimationFrame(loop);
    };

    const iniciarCamara = async () => {
        setError(null);
        setResultado(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            escaneandoRef.current = true;
            rafRef.current = requestAnimationFrame(loop);
        } catch {
            setError("No se pudo acceder a la cámara. Revisa los permisos.");
        }
    };

    useEffect(() => {
        if (isOpen) iniciarCamara();
        else detenerCamara();
        return () => detenerCamara();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleClose = () => {
        detenerCamara();
        setResultado(null);
        setError(null);
        setHistorialAbierto(false);
        onClose();
    };

    if (!isOpen) return null;

    const bloqueadoPorBaja = resultado?.extintor.estadoExtintor === "De Baja";
    const sedeNameById = resultado?.sede ? { [resultado.sede.id]: resultado.sede.nombre } : {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                    <h3 className="text-base font-black text-zinc-800">📷 Escanear QR</h3>
                    <button onClick={handleClose} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {!resultado ? (
                        <div className="flex flex-col gap-3 p-5">
                            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-900">
                                <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
                                <canvas ref={canvasRef} className="hidden" />
                                <div className="absolute inset-8 border-4 border-white/70 rounded-2xl pointer-events-none" />
                            </div>
                            {buscando && <p className="text-sm font-bold text-zinc-500 text-center">Buscando extintor...</p>}
                            {error && (
                                <div className="flex flex-col gap-2 items-center">
                                    <p className="text-sm font-bold text-red-600 text-center">{error}</p>
                                    <button onClick={iniciarCamara} className="text-xs font-bold text-red-600 underline">Reintentar</button>
                                </div>
                            )}
                            {!error && !buscando && <p className="text-xs text-zinc-400 text-center">Apunta la cámara al código QR del extintor</p>}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 p-5">
                            <div className="flex flex-col gap-1 px-1">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Empresa</span>
                                <span className="text-sm font-black text-zinc-800">{resultado.empresa.razonSocial}</span>
                                {resultado.sede && (
                                    <span className="text-xs font-bold text-zinc-500">🏬 {resultado.sede.nombre}</span>
                                )}
                            </div>

                            <ExtintorCard ext={resultado.extintor} index={0} context="historial" hasSedes={!!resultado.sede} sedeNameById={sedeNameById} />

                            {error && (
                                <div className="px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                                    ⚠️ {error}
                                </div>
                            )}

                            <button onClick={() => setHistorialAbierto(true)} className="px-4 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-sm active:scale-95 transition-all">
                                📜 Ver Historial Completo
                            </button>

                            {!escaneoAcotado && (
                                <div className="flex flex-col gap-2 pt-1">
                                    {bloqueadoPorBaja ? (
                                        <div className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold text-center">
                                            ⚠️ Extintor De Baja: solo consulta de información e historial.
                                        </div>
                                    ) : (
                                        <>
                                            {onAsociar && (
                                                <button onClick={() => onAsociar(resultado)} className="px-4 py-3 rounded-xl bg-zinc-800 text-white font-bold text-sm active:scale-95 transition-all">
                                                    🔗 Asociar a Servicio Existente
                                                </button>
                                            )}
                                            {onCrearServicio && (
                                                <button onClick={() => onCrearServicio(resultado)} className="px-4 py-3 rounded-xl bg-red-700 text-white font-bold text-sm active:scale-95 transition-all">
                                                    + Crear Nuevo Servicio
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            <button onClick={iniciarCamara} className="text-xs font-bold text-zinc-500 underline self-center">Escanear otro</button>
                        </div>
                    )}
                </div>
            </div>

            {historialAbierto && resultado && (
                <ExtintorHistorialModal
                    extintor={resultado.extintor}
                    servicios={resultado.servicios}
                    traslados={resultado.traslados}
                    sedeNameById={sedeNameById}
                    onClose={() => setHistorialAbierto(false)}
                    onIrAlServicio={onIrAlServicio ? (s) => onIrAlServicio(resultado, s) : undefined}
                />
            )}
        </div>
    );
}
