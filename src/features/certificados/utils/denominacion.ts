import type { TipoCertificado, Denominacion, CertificadoItem } from "../types";

const DENOMINACION_TITULO: Record<Denominacion, string> = {
  portatiles_rodantes: "EXTINTORES PORTATILES Y RODANTES",
  portatiles: "EXTINTORES PORTATILES",
  rodantes: "EXTINTORES RODANTES",
  extintores: "EXTINTORES",
};

const DENOMINACION_PARRAFO: Record<Denominacion, string> = {
  portatiles_rodantes: "extintores portátiles y rodantes",
  portatiles: "extintores portátiles",
  rodantes: "extintores rodantes",
  extintores: "extintores",
};

const DENOMINACION_PARRAFO_SINGULAR: Record<Denominacion, string> = {
  portatiles_rodantes: "extintor portátil o rodante",
  portatiles: "extintor portátil",
  rodantes: "extintor rodante",
  extintores: "extintor",
};

const UMBRAL_RODANTE: Record<string, number> = { KG: 25, LB: 125, LT: 25, GAL: 10 };

const normalizarUnidad = (unidad: string): string => {
  const u = unidad.toUpperCase();
  if (u.startsWith("KG")) return "KG";
  if (u.startsWith("LB")) return "LB";
  if (u.startsWith("GAL") || u.startsWith("GL")) return "GAL";
  if (u.startsWith("LT") || u === "L") return "LT";
  return "";
};

const esRodante = (capacidad: string): boolean | null => {
  const match = (capacidad || "").match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)/);
  if (!match) return null;
  const valor = parseFloat(match[1].replace(",", "."));
  const umbral = UMBRAL_RODANTE[normalizarUnidad(match[2])];
  if (isNaN(valor) || umbral === undefined) return null;
  return valor >= umbral;
};

export const detectarDenominacion = (items: CertificadoItem[]): Denominacion => {
  const clasificados = items.map((it) => esRodante(it.capacidad)).filter((v): v is boolean => v !== null);
  const hayRodantes = clasificados.includes(true);
  const hayPortatiles = clasificados.includes(false);
  if (hayRodantes && hayPortatiles) return "portatiles_rodantes";
  if (hayRodantes) return "rodantes";
  if (hayPortatiles) return "portatiles";
  return "extintores";
};

export const tituloCertificado = (tipo: TipoCertificado, denominacion: Denominacion): string => {
  const nombreExtintores = DENOMINACION_TITULO[denominacion];
  return tipo === "ph"
    ? `CERTIFICADO DE PRUEBA HIDROSTATICA DE ${nombreExtintores}`
    : `CERTIFICADO DE GARANTIA Y OPERATIVIDAD DE ${nombreExtintores} DE LUCHA CONTRA INCENDIOS Y VIGENCIA DE PRUEBA HIDROSTATICA`;
};

export const construirDenominacionTexto = (denominacion: Denominacion, esSingular: boolean): string =>
  esSingular ? DENOMINACION_PARRAFO_SINGULAR[denominacion] : DENOMINACION_PARRAFO[denominacion];
