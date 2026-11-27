import type { EstadoItemInspeccion, ExtintorInspeccion } from "../../../types";

export const ITEMS_INSPECCION = [
  { clave: "manometro", etiqueta: "Manómetro" },
  { clave: "pasador", etiqueta: "Pasador" },
  { clave: "manguera", etiqueta: "Manguera" },
  { clave: "tarjeta", etiqueta: "Tarjeta" },
] as const;

export type ClaveItem = (typeof ITEMS_INSPECCION)[number]["clave"];

export const OPCIONES_ITEM: { valor: EstadoItemInspeccion; etiqueta: string }[] = [
  { valor: "CONFORME", etiqueta: "Conforme" },
  { valor: "NECESITA CAMBIO", etiqueta: "Necesita cambio" },
  { valor: "NO APLICA", etiqueta: "No aplica" },
];

export const FOTOS_INSPECCION = [
  { tipo: "panoramica", etiqueta: "Panorámica del extintor", ayuda: "Que se vea el extintor completo y su entorno" },
  { tipo: "frontal", etiqueta: "Tarjeta (frente)", ayuda: "Lado frontal de la tarjeta de inspección" },
  { tipo: "posterior", etiqueta: "Tarjeta (reverso)", ayuda: "Lado posterior de la tarjeta" },
] as const;

export const HALLAZGOS_FRECUENTES: { texto: string; recomendacion: string }[] = [
  { texto: "Gabinete oxidado", recomendacion: "Colocar gabinete nuevo" },
  { texto: "Gabinete descolorido", recomendacion: "Colocar gabinete nuevo" },
  { texto: "Gabinete en mal estado", recomendacion: "Colocar gabinete nuevo" },
  { texto: "Sin mica", recomendacion: "Colocar mica nueva" },
  { texto: "Mica rota", recomendacion: "Cambiar mica" },
  { texto: "Chapa rota", recomendacion: "Cambiar chapa plush" },
  { texto: "Falta señalética", recomendacion: "Colocar señal nueva 60x40cm" },
  { texto: "Señal rota", recomendacion: "Colocar señal nueva 60x40cm" },
  { texto: "Pedestal oxidado", recomendacion: "Colocar pedestal nuevo" },
  { texto: "Extintor obstruido", recomendacion: "Despejar acceso al extintor" },
  { texto: "Extintor vencido", recomendacion: "Realizar recarga" },
];

export const CAMPOS_COMPLETABLES: { clave: keyof ExtintorInspeccion; etiqueta: string; ejemplo: string }[] = [
  { clave: "area", etiqueta: "Ubicación", ejemplo: "Ej.: Pasadizo, Of. Principal" },
  { clave: "nInterno", etiqueta: "N° interno", ejemplo: "Ej.: 15" },
  { clave: "nSerie", etiqueta: "N° serie", ejemplo: "Ej.: 16749" },
  { clave: "marca", etiqueta: "Marca o procedencia", ejemplo: "Ej.: NACIONAL" },
  { clave: "fechaFabricacion", etiqueta: "Fabricación", ejemplo: "Ej.: 2020" },
  { clave: "agenteExtintor", etiqueta: "Agente", ejemplo: "Ej.: PQS" },
  { clave: "peso", etiqueta: "Capacidad", ejemplo: "Ej.: 6" },
];

export const esCO2 = (agente: string) => /co2|co₂/i.test(agente || "");

export const vacio = (v: unknown) => {
  const t = String(v ?? "").trim().toUpperCase();
  return !t || t === "S/N" || t === "S/TAG";
};

export const nombreExtintor = (e: Pick<ExtintorInspeccion, "nInterno" | "nSerie">) =>
  [e.nInterno && `N° ${e.nInterno}`, e.nSerie && e.nSerie !== "S/N" ? `Serie ${e.nSerie}` : ""].filter(Boolean).join(" · ") || "S/N";

export const idRegistro = (campanaId: string, uid: string) => `${campanaId}:${uid}`;

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const textoPeriodo = (periodo: string) => {
  const [a, m] = periodo.split("-").map(Number);
  return a && m ? `${MESES[m - 1]} ${a}` : periodo;
};
