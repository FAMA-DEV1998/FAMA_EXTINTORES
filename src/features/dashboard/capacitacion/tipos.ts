import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

/** Igual que backend/src/capacitacion/cap.plantilla.ts (medidas en mm sobre A4 horizontal 297 × 210). */
export type Fuente = "sans" | "sans-bold" | "serif" | "serif-bold" | "serif-italic" | "serif-bold-italic";
export type Alineacion = "izquierda" | "centro" | "derecha";
export interface CampoTexto {
  texto: string; x: number; y: number; ancho: number; tam: number; color: string;
  fuente: Fuente; alinear: Alineacion; interlineado: number; visible: boolean;
}
export interface ImagenPos { src: string | null; x: number; y: number; ancho: number; visible: boolean }
export type ClaveTexto = "titulo" | "subtitulo" | "otorgado" | "nombre" | "cuerpo" | "fecha" | "codigo";
export interface PlantillaCertificado {
  version: 1;
  curso: string;
  vigenciaMeses: number;
  fondo: { estilo: "fama" | "simple" | "imagen"; imagen: string | null; colorPrimario: string; colorSecundario: string; colorAcento: string };
  logo: ImagenPos;
  firmas: (ImagenPos & { nombre: string; cargo: string })[];
  textos: Record<ClaveTexto, CampoTexto>;
  qr: { x: number; y: number; tam: number; color: string; visible: boolean };
}

export const HOJA = { ancho: 297, alto: 210 };
export const NOMBRES_TEXTO: Record<ClaveTexto, string> = {
  titulo: "Título", subtitulo: "Subtítulo", otorgado: "Texto «otorgado a»", nombre: "Nombre del participante",
  cuerpo: "Texto principal", fecha: "Lugar y fecha", codigo: "Código y verificación",
};
export const VARIABLES = ["{nombre}", "{dni}", "{cargo}", "{empresa}", "{puntaje}", "{fecha}", "{fecha_larga}", "{vence}", "{codigo}", "{curso}"];

export interface CodigoCap {
  id: string; codigo: string; empresaId: string | null; empresaNombre: string; cupos: number; intentosMax: number;
  notaMinima: number; venceEn: string | null; activo: boolean; creadoPor: string; createdAt: string;
  registrados: number; aprobados: number;
}
export interface TrabajadorCap {
  id: string; dni: string; nombres: string; apellidos: string; cargo: string; registrado: string;
  intentos: number; enCurso: boolean; mejorPuntaje: number | null; estado: "aprobado" | "reprobado" | "pendiente";
  certificado: { codigo: string; fecha: string; puntaje: number } | null;
  historial: { fecha: number; estado: string; puntaje: number | null; escenario: string; motivo: string | null }[];
}

export const emitir = <T,>(socket: Socket, evento: string, datos: unknown = {}, timeout = 30000) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("El servidor no respondió")), timeout);
    socket.emit(evento, datos, (res: any) => {
      clearTimeout(t);
      if (res?.success) resolve(res as T);
      else reject(new Error(res?.error || "Error del servidor"));
    });
  });

export const ENLACE_WEB = (codigo: string) => `https://extintoresfama.com/capacitacion/?codigo=${encodeURIComponent(codigo)}`;

export function useCodigosCap(socket: Socket | null) {
  const [codigos, setCodigos] = useState<CodigoCap[]>([]);
  const [cargando, setCargando] = useState(false);
  const cargar = useCallback(() => {
    if (!socket) return;
    setCargando(true);
    emitir<{ codigos: CodigoCap[] }>(socket, "cap:codigos:list").then((r) => setCodigos(r.codigos)).catch(() => {}).finally(() => setCargando(false));
  }, [socket]);
  useEffect(() => {
    if (!socket) return;
    cargar();
    socket.on("cap:changed", cargar);
    return () => { socket.off("cap:changed", cargar); };
  }, [socket, cargar]);
  return { codigos, cargando, recargar: cargar };
}

export const leerArchivo = (f: File) =>
  new Promise<string>((ok, mal) => {
    if (!/^image\/(png|jpeg)$/.test(f.type)) return mal(new Error("Usa una imagen PNG o JPG"));
    if (f.size > 4 * 1024 * 1024) return mal(new Error("La imagen debe pesar menos de 4 MB"));
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => mal(new Error("No se pudo leer la imagen"));
    r.readAsDataURL(f);
  });

export function descargarBase64(b64: string, nombre: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
