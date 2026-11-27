import { useRef, useState } from "react";
import { uidDesdeQR } from "../../../utils/qrExtintor";

export function useLectorQR(alLeer: (uid: string) => void) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const escaneandoRef = useRef(false);
    const alLeerRef = useRef(alLeer);
    alLeerRef.current = alLeer;
    const [errorCamara, setErrorCamara] = useState<string | null>(null);

    const detener = () => {
        escaneandoRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const ciclo = async () => {
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
                if (code?.data && escaneandoRef.current) {
                    detener();
                    alLeerRef.current(uidDesdeQR(code.data));
                    return;
                }
            }
        }
        rafRef.current = requestAnimationFrame(ciclo);
    };

    const iniciar = async () => {
        detener();
        setErrorCamara(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            escaneandoRef.current = true;
            rafRef.current = requestAnimationFrame(ciclo);
        } catch {
            setErrorCamara("No se pudo acceder a la cámara. Revisa los permisos.");
        }
    };

    return { videoRef, canvasRef, iniciar, detener, errorCamara };
}
