import type { Socket } from "socket.io-client";
import type { CertificadoDatos } from "../types";
import { hojasPdfBase64 } from "../../../utils/pdf";

/**
 * Publicación de certificados en la web pública (extintoresfama.com/certificados).
 * El backend guarda el PDF con un código (EMPRESA-SEDE-AAMM-NN-XXXXXX) que el cliente
 * ingresa en la web para descargarlo.
 */

export const URL_WEB_CERTIFICADOS = "https://extintoresfama.com/certificados/";
export const enlaceWeb = (codigo: string) => `${URL_WEB_CERTIFICADOS}?codigo=${encodeURIComponent(codigo)}`;

export interface CertificadoWeb {
  codigo: string;
  activo: number;
  descargas: number;
  createdAt: string;
}

const emitir = <T,>(socket: Socket, evento: string, datos: unknown) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("El servidor no respondió")), 60000);
    socket.emit(evento, datos, (res: any) => {
      clearTimeout(t);
      if (res?.success) resolve(res as T);
      else reject(new Error(res?.error || "Error del servidor"));
    });
  });

/** Certificado web ya publicado para este certificado del sistema (o null). */
export const consultarCertificadoWeb = async (socket: Socket, certificadoId: string): Promise<CertificadoWeb | null> => {
  const r = await emitir<{ certificado: CertificadoWeb | null }>(socket, "web:certificado:porCertificado", { certificadoId });
  return r.certificado;
};

/** Código que tendrá el certificado en la web (el que ya tiene o el siguiente libre). */
export const obtenerCodigoWeb = async (socket: Socket, certificadoId: string): Promise<string> => {
  const r = await emitir<{ codigo: string }>(socket, "web:certificado:codigo", { certificadoId });
  return r.codigo;
};

const dosFrames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50))));

const fechaIso = (d: CertificadoDatos) => {
  const anio = Number(d.anioFecha), mes = Number(d.mesFecha), dia = Number(d.diaFecha);
  if (!anio || !mes || !dia) return undefined;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
};

const sumarMeses = (iso: string | undefined, meses: number) => {
  if (!iso) return undefined;
  const f = new Date(`${iso}T12:00:00`);
  f.setMonth(f.getMonth() + meses);
  return f.toISOString().slice(0, 10);
};

const servicioTexto = (d: CertificadoDatos) => {
  if (d.tipoCertificado === "ph") return "Prueba Hidrostática";
  const a = d.accionesTrabajo || { venta: false, recarga: false, mantenimiento: false };
  const partes = [a.venta && "Venta", a.recarga && "Recarga", a.mantenimiento && "Mantenimiento"].filter(Boolean) as string[];
  return partes.length ? `${partes.join(", ").replace(/, ([^,]*)$/, " y $1")} de extintores` : "Garantía y operatividad";
};

/**
 * Publica (o actualiza) el certificado en la web.
 * `aplicarCodigo` debe poner el código en las plantillas que están dentro de
 * `containerId` (para que salga impreso en el PDF) antes de generarlo.
 */
export async function publicarCertificadoWeb(opts: {
  socket: Socket;
  certificadoId: string;
  hojas: CertificadoDatos[];
  containerId: string;
  aplicarCodigo: (codigo: string) => void;
}): Promise<string> {
  const { socket, certificadoId, hojas, containerId, aplicarCodigo } = opts;
  const codigo = await obtenerCodigoWeb(socket, certificadoId);
  aplicarCodigo(codigo);
  await dosFrames();
  const pdfBase64 = await hojasPdfBase64(containerId);
  if (pdfBase64.length > 18 * 1024 * 1024) throw new Error("El PDF es demasiado grande para publicarlo");
  const d = hojas[0];
  const emision = d ? fechaIso(d) : undefined;
  const r = await emitir<{ certificado: CertificadoWeb }>(socket, "web:certificado:publicar", {
    certificadoId,
    codigo,
    pdfBase64,
    cliente: d?.nombre || undefined,
    servicio: d ? servicioTexto(d) : undefined,
    fechaEmision: emision,
    fechaVencimiento: d?.tipoCertificado === "ph" ? undefined : sumarMeses(emision, 12),
  });
  return r.certificado.codigo;
}
