import { useCallback, useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        SpeechRecognition?: any;
        webkitSpeechRecognition?: any;
        webkitAudioContext?: typeof AudioContext;
    }
}

export type ModoDictado = "audio" | "navegador";

export interface Grabacion { audio: Blob | null; mime: string; textoNavegador: string }

const MAX_SEGUNDOS = 60;
const TIPOS_AUDIO = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

const reconocimientoNavegador = () => (typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined);

export function useDictadoVoz() {
    const [soporte] = useState(() => ({
        audio: typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined",
        navegador: !!reconocimientoNavegador(),
    }));
    const [grabando, setGrabando] = useState(false);
    const [nivel, setNivel] = useState(0);
    const [segundos, setSegundos] = useState(0);
    const [textoVivo, setTextoVivo] = useState("");
    const [error, setError] = useState("");
    const recorder = useRef<MediaRecorder | null>(null);
    const trozos = useRef<Blob[]>([]);
    const flujo = useRef<MediaStream | null>(null);
    const contexto = useRef<AudioContext | null>(null);
    const cuadro = useRef(0);
    const reloj = useRef(0);
    const reconocedor = useRef<any>(null);
    const detenido = useRef(true);
    const base = useRef("");
    const actual = useRef("");
    const finDeVoz = useRef<(() => void) | null>(null);
    const autoDetener = useRef<(() => void) | null>(null);

    const limpiar = useCallback(() => {
        cancelAnimationFrame(cuadro.current);
        window.clearInterval(reloj.current);
        flujo.current?.getTracks().forEach((t) => t.stop());
        flujo.current = null;
        contexto.current?.close().catch(() => undefined);
        contexto.current = null;
        setNivel(0);
    }, []);

    useEffect(() => () => {
        detenido.current = true;
        try { reconocedor.current?.abort(); } catch { reconocedor.current = null; }
        if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
        limpiar();
    }, [limpiar]);

    const crearReconocedor = useCallback(() => {
        const Clase = reconocimientoNavegador();
        const r = new Clase();
        r.lang = "es-PE";
        r.continuous = true;
        r.interimResults = true;
        r.maxAlternatives = 1;
        r.onresult = (e: any) => {
            let texto = "";
            for (let i = 0; i < e.results.length; i++) texto += e.results[i][0].transcript + " ";
            actual.current = texto.trim();
            setTextoVivo(`${base.current} ${actual.current}`.trim());
        };
        r.onerror = (e: any) => {
            if (e?.error === "no-speech" || e?.error === "aborted") return;
            if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setError("Permite el uso del micrófono para dictar.");
            else if (e?.error === "network") setError("El reconocimiento del teléfono necesita internet.");
        };
        r.onend = () => {
            base.current = `${base.current} ${actual.current}`.trim();
            actual.current = "";
            if (!detenido.current) {
                try { reconocedor.current = crearReconocedor(); reconocedor.current.start(); return; } catch { detenido.current = true; }
            }
            finDeVoz.current?.();
            finDeVoz.current = null;
        };
        return r;
    }, []);

    const medir = useCallback((stream: MediaStream) => {
        const Clase = window.AudioContext || window.webkitAudioContext;
        if (!Clase) return;
        const ctx = new Clase();
        contexto.current = ctx;
        const analizador = ctx.createAnalyser();
        analizador.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analizador);
        const datos = new Uint8Array(analizador.fftSize);
        const paso = () => {
            analizador.getByteTimeDomainData(datos);
            let suma = 0;
            for (const v of datos) suma += ((v - 128) / 128) ** 2;
            setNivel(Math.min(1, Math.sqrt(suma / datos.length) * 4));
            cuadro.current = requestAnimationFrame(paso);
        };
        paso();
    }, []);

    const iniciar = useCallback(async (modo: ModoDictado) => {
        setError("");
        setTextoVivo("");
        setSegundos(0);
        base.current = "";
        actual.current = "";
        trozos.current = [];
        detenido.current = false;
        try {
            if (modo === "audio") {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
                flujo.current = stream;
                const mime = TIPOS_AUDIO.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
                const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined);
                rec.ondataavailable = (e) => { if (e.data.size > 0) trozos.current.push(e.data); };
                rec.start(250);
                recorder.current = rec;
                medir(stream);
            } else {
                reconocedor.current = crearReconocedor();
                reconocedor.current.start();
            }
            const inicio = Date.now();
            reloj.current = window.setInterval(() => {
                const s = Math.floor((Date.now() - inicio) / 1000);
                setSegundos(s);
                if (s >= MAX_SEGUNDOS) autoDetener.current?.();
            }, 250);
            setGrabando(true);
            return true;
        } catch (e) {
            detenido.current = true;
            limpiar();
            const nombre = (e as Error)?.name;
            setError(nombre === "NotAllowedError" ? "Permite el uso del micrófono para dictar." : nombre === "NotFoundError" ? "No se encontró un micrófono." : "No se pudo iniciar el micrófono.");
            return false;
        }
    }, [crearReconocedor, limpiar, medir]);

    const detener = useCallback(async (): Promise<Grabacion> => {
        detenido.current = true;
        setGrabando(false);
        const rec = recorder.current;
        recorder.current = null;
        const audio = rec && rec.state !== "inactive"
            ? await new Promise<Blob>((resolver) => {
                rec.onstop = () => resolver(new Blob(trozos.current, { type: rec.mimeType || "audio/webm" }));
                rec.stop();
            })
            : null;
        if (reconocedor.current) {
            await new Promise<void>((resolver) => {
                finDeVoz.current = resolver;
                try { reconocedor.current.stop(); } catch { resolver(); }
                window.setTimeout(resolver, 1500);
            });
            reconocedor.current = null;
        }
        limpiar();
        return { audio, mime: audio?.type || "", textoNavegador: `${base.current} ${actual.current}`.trim() };
    }, [limpiar]);

    const cancelar = useCallback(() => {
        detenido.current = true;
        setGrabando(false);
        if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
        recorder.current = null;
        try { reconocedor.current?.abort(); } catch { reconocedor.current = null; }
        reconocedor.current = null;
        limpiar();
    }, [limpiar]);

    return { soporte, grabando, nivel, segundos, textoVivo, error, iniciar, detener, cancelar, autoDetener, maxSegundos: MAX_SEGUNDOS };
}
