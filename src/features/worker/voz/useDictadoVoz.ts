import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { type TipoCorreccion, normalizarTexto, colapsarRepeticiones } from "./parsearComandoVoz";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function useDictadoVoz(socket: Socket | null) {
  const [soportado] = useState(() => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [escuchando, setEscuchando] = useState(false);
  const [transcripcion, setTranscripcion] = useState("");
  const [transcripcionFinal, setTranscripcionFinal] = useState("");
  const [correcciones, setCorrecciones] = useState<Record<string, Record<string, string>>>({});
  const recognitionRef = useRef<any>(null);
  const detenerManualRef = useRef(false);
  const baseRef = useRef("");
  const actualRef = useRef("");
  const baseFinalRef = useRef("");
  const actualFinalRef = useRef("");

  useEffect(() => {
    if (!socket) return;
    socket.emit("voz:correcciones:list", {}, (res: any) => {
      if (res?.success) setCorrecciones(res.correcciones || {});
    });
    const onUpdated = (data: Record<string, Record<string, string>>) => setCorrecciones(data || {});
    socket.on("voz:correcciones:updated", onUpdated);
    return () => { socket.off("voz:correcciones:updated", onUpdated); };
  }, [socket]);

  const construirReconocimiento = (): any => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = "es-PE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let texto = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        texto += event.results[i][0].transcript + " ";
        if (event.results[i].isFinal) final += event.results[i][0].transcript + " ";
      }
      actualRef.current = texto.trim();
      actualFinalRef.current = final.trim();
      setTranscripcion(colapsarRepeticiones(`${baseRef.current} ${actualRef.current}`.trim()));
      setTranscripcionFinal(colapsarRepeticiones(`${baseFinalRef.current} ${actualFinalRef.current}`.trim()));
    };
    recognition.onend = () => {
      if (!detenerManualRef.current) {
        baseRef.current = `${baseRef.current} ${actualRef.current}`.trim();
        baseFinalRef.current = `${baseFinalRef.current} ${actualFinalRef.current}`.trim();
        actualRef.current = "";
        actualFinalRef.current = "";
        recognitionRef.current = construirReconocimiento();
        recognitionRef.current.start();
        return;
      }
      setEscuchando(false);
    };
    recognition.onerror = (e: any) => {
      if (e?.error === "no-speech" || e?.error === "aborted") return;
      setEscuchando(false);
    };
    return recognition;
  };

  const iniciar = () => {
    if (!soportado) return;
    detenerManualRef.current = false;
    baseRef.current = "";
    actualRef.current = "";
    baseFinalRef.current = "";
    actualFinalRef.current = "";
    setTranscripcion("");
    setTranscripcionFinal("");
    recognitionRef.current = construirReconocimiento();
    recognitionRef.current.start();
    setEscuchando(true);
  };

  const detener = () => {
    detenerManualRef.current = true;
    recognitionRef.current?.stop();
    setEscuchando(false);
  };

  const reiniciar = () => {
    baseRef.current = "";
    actualRef.current = "";
    baseFinalRef.current = "";
    actualFinalRef.current = "";
    setTranscripcion("");
    setTranscripcionFinal("");
  };

  const registrarCorreccion = (tipo: TipoCorreccion, textoOido: string, valorElegido: string, esCorreccion = true) => {
    const clave = normalizarTexto(textoOido);
    if (!clave || !valorElegido) return;
    setCorrecciones((prev) => ({ ...prev, [tipo]: { ...(prev[tipo] || {}), [clave]: valorElegido } }));
    socket?.emit("voz:correcciones:save", { tipo, clave, valor: valorElegido, esCorreccion });
  };

  return { soportado, escuchando, transcripcion, transcripcionFinal, iniciar, detener, reiniciar, correcciones, registrarCorreccion };
}
