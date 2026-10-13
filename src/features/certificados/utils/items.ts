import { MESES } from "../../../constants";

export const marcaCertificado = (marca: string): string => {
  if (!marca) return "—";
  return marca.trim().toLowerCase() === "importado" ? "Asiático" : marca;
};

const UNIDAD_PESO_LABEL: Record<string, string> = {
  KG: "Kg", LB: "Lbs", LT: "Lts", GAL: "Gls",
};

export const formatCapacidad = (peso: string, unidadPeso: string): string => {
  if (!peso) return "";
  const unidad = UNIDAD_PESO_LABEL[unidadPeso] || unidadPeso || "";
  return `${peso}${unidad}`;
};

export const tipoServicioItem = (e: any): string => {
  if (e.ma === "SI") return "Mantenimiento";
  if (e.recarga) return "Recarga";
  return "—";
};

export const parseFecha = (fecha: string): Date | null => {
  const [anio, mes, dia] = (fecha || "").split("-").map((p) => parseInt(p, 10));
  if (!anio || !mes) return null;
  return new Date(anio, mes - 1, dia || 1);
};

export const addMonths = (fecha: Date, meses: number): Date => {
  const copia = new Date(fecha);
  copia.setMonth(copia.getMonth() + meses);
  return copia;
};

export const formatMesAnio = (fecha: Date): string => `${MESES[fecha.getMonth()].label} ${fecha.getFullYear()}`;
