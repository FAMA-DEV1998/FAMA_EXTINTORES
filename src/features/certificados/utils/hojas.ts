import type { CertificadoDatos, HojaMeta, HojaGuardada, TipoCertificado } from "../types";
import { clasificarAgente } from "./agentes";

export const metaPorDefecto = (): HojaMeta => ({
  filtroAgente: "todos",
  filtroEstado: "todos",
  pqsVariante: "75_solo",
  plantillaId: null,
  plantillaNombre: "",
});

export const normalizarHojasGuardadas = (raw: string): HojaGuardada[] => {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.hojas) && parsed.hojas.length > 0) {
      return parsed.hojas.map((h: any) => ({
        meta: { ...metaPorDefecto(), ...(h.meta || {}) },
        datos: h.datos,
      }));
    }
    if (parsed?.tipoCertificado) {
      return [{ meta: metaPorDefecto(), datos: parsed }];
    }
    return [];
  } catch {
    return [];
  }
};

export const extintorEntraEnHoja = (e: any, tipoCertificado: TipoCertificado, filtro: string, filtroEstado: string): boolean => {
  if (tipoCertificado === "ph" && e.ph !== "SI") return false;
  if (filtro !== "todos" && clasificarAgente(e.agenteExtintor) !== filtro) return false;
  if (filtroEstado !== "todos" && e.estadoExtintor !== filtroEstado) return false;
  return true;
};

export const extintoresSinCertificar = (certificado: any, servicio: any, extintores: any[]): any[] => {
  const hojas = normalizarHojasGuardadas(certificado?.datos || "");
  if (!servicio || hojas.length === 0) return [];
  const incluidos = new Set(hojas.flatMap((h) => (h.datos?.items || []).map((i) => i.uid)));
  const porUid = new Map((extintores || []).map((e: any) => [e.uid, e]));
  return (servicio.extintorUids || [])
    .filter((uid: string) => !incluidos.has(uid) && porUid.has(uid))
    .map((uid: string) => ({ ...porUid.get(uid), ...(servicio.extintorEstados?.[uid] || {}) }))
    .filter((e: any) => hojas.some((h) => extintorEntraEnHoja(e, h.datos.tipoCertificado, h.meta.filtroAgente, h.meta.filtroEstado)));
};

export const serializarHojas = (hojas: HojaGuardada[]): string => JSON.stringify({ hojas });

const FAMILIA_LABEL_ESTATICO: Record<string, string> = {
  co2: "CO₂",
  pqs: "PQS",
  acetato: "Acetato de Potasio",
  h2o_desmineralizado: "H2O Desmineralizado",
  h2o_presurizado: "H2O Presurizado",
};

export const construirEtiquetaHoja = (
  datos: CertificadoDatos,
  meta: HojaMeta,
  familiasDisponibles?: { key: string; label: string }[],
): string => {
  const tipoLabel = datos.tipoCertificado === "ph" ? "Prueba Hidrostática" : "Garantía y Operatividad";
  const agenteLabel = meta.filtroAgente === "todos"
    ? "Todos"
    : (familiasDisponibles?.find((f) => f.key === meta.filtroAgente)?.label || FAMILIA_LABEL_ESTATICO[meta.filtroAgente] || meta.filtroAgente);
  let etiqueta = `${tipoLabel} — ${agenteLabel}`;
  if (meta.filtroEstado && meta.filtroEstado !== "todos") etiqueta += ` · ${meta.filtroEstado}`;
  return etiqueta;
};
