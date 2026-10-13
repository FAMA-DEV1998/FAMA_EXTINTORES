import type { PqsVariante } from "../types";

export const FAMILIA_LABEL_FIJA: Record<string, string> = {
  co2: "CO2",
  pqs: "PQS",
  acetato: "Acetato de Potasio",
  h2o_desmineralizado: "H2O Desmineralizado",
  h2o_presurizado: "H2O Presurizado",
};

const FAMILIA_LABEL_CORTA: Record<string, string> = {
  co2: "CO2",
  pqs: "PQS",
  acetato: "K",
  h2o_desmineralizado: "H2O DES",
  h2o_presurizado: "H2O PRE",
};

export const formatearAgente = (agente: string): string =>
  (agente || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => (palabra === "h2o" ? "H2O" : palabra.charAt(0).toUpperCase() + palabra.slice(1)))
    .join(" ");

export const clasificarAgente = (agente: string): string => {
  const a = (agente || "").toLowerCase();
  if (a.includes("co2") || a.includes("carbónico") || a.includes("carbonico")) return "co2";
  if (a.includes("pqs") || a.includes("polvo")) return "pqs";
  if (a.includes("acetato")) return "acetato";
  if (a.includes("h2o") && a.includes("desmineral")) return "h2o_desmineralizado";
  if (a.includes("h2o") && a.includes("presuriz")) return "h2o_presurizado";
  return a.trim();
};

const PQS_LABEL: Record<PqsVariante, string> = {
  "75_solo": "polvo químico seco (PQS) al 75%",
  "90_certificado_ul": "polvo químico seco (PQS) al 90% Certificado UL",
};

export const PQS_TIPO_LABEL: Record<PqsVariante, string> = {
  "75_solo": "75%",
  "90_certificado_ul": "90% con certificado UL",
};

export const PQS_VARIANTES: PqsVariante[] = ["90_certificado_ul", "75_solo"];

export const construirAgentesTexto = (agentesPresentes: string[], familias: string[], pqsVariante: PqsVariante) => {
  const partes: string[] = [];
  if (familias.includes("co2")) partes.push("gas carbónico CO2");
  if (familias.includes("pqs")) partes.push(PQS_LABEL[pqsVariante]);
  if (familias.includes("acetato")) partes.push("acetato de potasio");
  if (familias.includes("h2o_desmineralizado")) partes.push("H2O Desmineralizado");
  if (familias.includes("h2o_presurizado")) partes.push("H2O Presurizado");
  const conocidas = ["co2", "pqs", "acetato", "h2o_desmineralizado", "h2o_presurizado"];
  const otros = Array.from(new Set(
    familias
      .filter((f) => !conocidas.includes(f))
      .map((f) => formatearAgente(agentesPresentes.find((a) => clasificarAgente(a) === f) || f))
      .filter(Boolean)
  ));
  partes.push(...otros);
  if (partes.length === 0) return "extintores";
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
};

export const construirAgentesTextoCorto = (agentesPresentes: string[], familias: string[]) => {
  const partes: string[] = [];
  const conocidas = ["co2", "pqs", "acetato", "h2o_desmineralizado", "h2o_presurizado"];
  conocidas.forEach((f) => { if (familias.includes(f)) partes.push(FAMILIA_LABEL_CORTA[f]); });
  const otros = Array.from(new Set(
    familias
      .filter((f) => !conocidas.includes(f))
      .map((f) => formatearAgente(agentesPresentes.find((a) => clasificarAgente(a) === f) || f))
      .filter(Boolean)
  ));
  partes.push(...otros);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
};

export const presionPSIPorDefecto = (familia: string): string => {
  if (familia === "co2") return "3000";
  if (familia === "pqs") return "600";
  return "";
};

const tipoExtintorLabel = (familia: string, agenteOriginal: string): string => {
  if (familia === "pqs") return "PQS";
  if (familia === "co2") return "CO2";
  if (familia === "acetato") return "K";
  if (familia === "h2o_desmineralizado") return "H2O DES";
  if (familia === "h2o_presurizado") return "H2O PRE";
  return formatearAgente(agenteOriginal) || "—";
};

export const tipoExtintorLabelCertificado = (familia: string, agenteOriginal: string): string => {
  if (familia === "pqs") return "PQS-ABC";
  return tipoExtintorLabel(familia, agenteOriginal);
};
