import type { CertificadoDatos } from "../components/certificados/CertificadoTemplate";
import type { PqsVariante } from "../hooks/dashboard/useCertificado";

export interface HojaMeta {
  filtroAgente: string;
  filtroEstado: string;
  pqsVariante: PqsVariante;
  plantillaId: string | null;
  plantillaNombre: string;
}

export interface HojaGuardada {
  meta: HojaMeta;
  datos: CertificadoDatos;
}

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