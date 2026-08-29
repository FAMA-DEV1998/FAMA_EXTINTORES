import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { ESTADOS, MESES, PESOS_KG, PESOS_LB, PESOS_LT, PESOS_GAL } from "../../constants";
import type { FormData } from "../../types";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type TipoCorreccion = "marca" | "agenteExtintor" | "estadoExtintor" | "mes" | "servicioExtra" | "peso" | "recarga";

const normalizarTexto = (v: string): string =>
  (v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9%.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

const similitud = (a: string, b: string): number => {
  const an = normalizarTexto(a), bn = normalizarTexto(b);
  if (!an || !bn) return 0;
  const distancia = distanciaLevenshtein(an, bn);
  return 1 - distancia / Math.max(an.length, bn.length, 1);
};

const normalizarFonetico = (v: string): string =>
  normalizarTexto(v)
    .replace(/h/g, "")
    .replace(/v/g, "b")
    .replace(/z/g, "s")
    .replace(/ll/g, "y")
    .replace(/qu/g, "k")
    .replace(/c(?=[ei])/g, "s")
    .replace(/c/g, "k")
    .replace(/g(?=[ei])/g, "j")
    .replace(/y/g, "i")
    .replace(/([a-z])\1+/g, "$1");

const similitudFonetica = (a: string, b: string): number => {
  const an = normalizarFonetico(a), bn = normalizarFonetico(b);
  if (!an || !bn) return 0;
  const distancia = distanciaLevenshtein(an, bn);
  return 1 - distancia / Math.max(an.length, bn.length, 1);
};

const similitudCombinada = (a: string, b: string): number => Math.max(similitud(a, b), similitudFonetica(a, b));

const colapsarRepeticiones = (texto: string): string => texto.replace(/\b([a-záéíóúñ]+)(\s+\1\b)+/gi, "$1");

const PALABRAS_RELLENO = /\b(es|era|sera|será|tiene|tenia|tenía|su|sus|el|la|los|las|un|una|de|del|con|para|esta|está|en|dice|dicen|creo|que|seria|sería|osea|digamos|diria|diría|numero|numeros)\b/g;

const limpiarRelleno = (texto: string): string => normalizarTexto(texto).replace(PALABRAS_RELLENO, " ").replace(/\s+/g, " ").trim();

const extraerCodigo = (texto: string): string => limpiarRelleno(texto).replace(/\s+/g, "").toUpperCase();

const mejorCoincidencia = (texto: string, opciones: string[], correcciones: Record<string, string>): { valor: string; confianza: number } | null => {
  const normalizado = normalizarTexto(texto);
  if (!normalizado) return null;
  if (correcciones[normalizado]) return { valor: correcciones[normalizado], confianza: 1 };

  let mejorAprendida: { valor: string; confianza: number } | null = null;
  for (const [clave, valor] of Object.entries(correcciones)) {
    const score = similitudCombinada(normalizado, clave);
    if (!mejorAprendida || score > mejorAprendida.confianza) mejorAprendida = { valor, confianza: score };
  }
  if (mejorAprendida && mejorAprendida.confianza >= 0.72) return mejorAprendida;

  let mejor: { valor: string; confianza: number } | null = null;
  opciones.forEach((opcion) => {
    const score = similitudCombinada(normalizado, opcion);
    if (!mejor || score > mejor.confianza) mejor = { valor: opcion, confianza: score };
  });
  return mejor;
};

const mejorCoincidenciaEnTexto = (
  texto: string,
  opciones: string[],
  correcciones: Record<string, string>,
): { valor: string; confianza: number; texto: string } | null => {
  const palabras = normalizarTexto(texto).split(" ").filter(Boolean);
  if (palabras.length === 0 || opciones.length === 0) return null;
  const largos = Array.from(new Set(opciones.map((o) => Math.max(1, normalizarTexto(o).split(" ").filter(Boolean).length))));
  let mejor: { valor: string; confianza: number; texto: string } | null = null;
  largos.forEach((largo) => {
    for (let i = 0; i + largo <= palabras.length; i++) {
      const ventana = palabras.slice(i, i + largo).join(" ");
      opciones.forEach((opcion) => {
        const score = similitudCombinada(ventana, opcion);
        if (!mejor || score > mejor.confianza) mejor = { valor: opcion, confianza: score, texto: ventana };
      });
      Object.entries(correcciones).forEach(([clave, valor]) => {
        const score = similitudCombinada(ventana, clave);
        if (!mejor || score > mejor.confianza) mejor = { valor, confianza: score, texto: ventana };
      });
    }
  });
  return mejor;
};

const UNIDADES_NUMERO: Record<string, number> = {
  cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};

const DECENAS_NUMERO: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};

const CENTENAS_NUMERO: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
  seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};

const parsearGrupoNumero = (palabras: string[]): { valor: number; consumidas: number } | null => {
  let i = 0;
  let total = 0;
  let encontrado = false;
  if (CENTENAS_NUMERO[palabras[i]] !== undefined) { total += CENTENAS_NUMERO[palabras[i]]; i++; encontrado = true; }
  if (DECENAS_NUMERO[palabras[i]] !== undefined) {
    total += DECENAS_NUMERO[palabras[i]]; i++; encontrado = true;
    if (palabras[i] === "y" && UNIDADES_NUMERO[palabras[i + 1]] !== undefined && UNIDADES_NUMERO[palabras[i + 1]] < 10) {
      total += UNIDADES_NUMERO[palabras[i + 1]]; i += 2;
    }
  } else if (UNIDADES_NUMERO[palabras[i]] !== undefined) {
    total += UNIDADES_NUMERO[palabras[i]]; i++; encontrado = true;
  }
  if (!encontrado) return null;
  return { valor: total, consumidas: i };
};

const extraerNumero = (texto: string): string => {
  const palabras = normalizarTexto(texto).split(" ").filter(Boolean);
  let resultado = "";
  let i = 0;
  while (i < palabras.length) {
    if (/^\d+(\.\d+)?$/.test(palabras[i])) { resultado += palabras[i]; i++; continue; }
    const grupo = parsearGrupoNumero(palabras.slice(i));
    if (grupo) { resultado += String(grupo.valor); i += grupo.consumidas; continue; }
    i++;
  }
  return resultado;
};

const masCercano = (valor: string, opciones: readonly string[]): string => {
  const n = parseFloat(valor);
  if (isNaN(n)) return opciones[0] || "";
  return opciones.reduce((mejor, actual) => (Math.abs(parseFloat(actual) - n) < Math.abs(parseFloat(mejor) - n) ? actual : mejor), opciones[0]);
};

const ESTADO_ALIAS: Record<string, string> = {
  "aprobado": "Aprobado",
  "nuevo": "Nuevo - Venta",
  "venta": "Nuevo - Venta",
  "nuevo venta": "Nuevo - Venta",
  "garantia": "Garantía",
  "baja": "De Baja",
  "de baja": "De Baja",
};

type CampoClave =
  | "nSerie" | "nInterno" | "marca" | "fechaFabricacion" | "ph"
  | "estadoExtintor" | "agenteExtintor" | "peso" | "servicios" | "recarga"
  | "valvula" | "manguera" | "manometro" | "tobera" | "servicioExtra" | "observaciones";

const PALABRAS_CLAVE: { campo: CampoClave; patrones: string[] }[] = [
  { campo: "nSerie", patrones: ["numero de serie", "número de serie", "numero serie", "serie"] },
  { campo: "nInterno", patrones: ["numero interno", "número interno", "interno", "tag"] },
  { campo: "marca", patrones: ["marca"] },
  { campo: "fechaFabricacion", patrones: ["año de fabricacion", "año de fabricación", "fabricacion", "fabricación"] },
  { campo: "ph", patrones: ["prueba hidrostatica realizada", "prueba hidrostática realizada", "ph realizado", "realizado ph"] },
  { campo: "estadoExtintor", patrones: ["estado"] },
  { campo: "agenteExtintor", patrones: ["agente"] },
  { campo: "peso", patrones: ["peso", "kilos", "kilogramos", "libras", "litros", "galones"] },
  { campo: "servicios", patrones: ["servicio", "servicios"] },
  { campo: "recarga", patrones: ["recarga"] },
  { campo: "valvula", patrones: ["valvula", "válvula"] },
  { campo: "manguera", patrones: ["manguera"] },
  { campo: "manometro", patrones: ["manometro", "manómetro"] },
  { campo: "tobera", patrones: ["tobera"] },
  { campo: "servicioExtra", patrones: ["servicio adicional", "adicional"] },
  { campo: "observaciones", patrones: ["observaciones", "observacion", "observación", "nota"] },
];

const segmentarPorPalabrasClave = (texto: string): { campo: CampoClave; texto: string }[] => {
  const normalizado = normalizarTexto(texto);
  const candidatos: { campo: CampoClave; patron: string; index: number }[] = [];
  PALABRAS_CLAVE.forEach(({ campo, patrones }) => {
    patrones.forEach((patron) => {
      let desde = 0;
      while (true) {
        const idx = normalizado.indexOf(patron, desde);
        if (idx === -1) break;
        const antes = idx === 0 || normalizado[idx - 1] === " ";
        const despues = idx + patron.length === normalizado.length || normalizado[idx + patron.length] === " ";
        if (antes && despues) candidatos.push({ campo, patron, index: idx });
        desde = idx + patron.length;
      }
    });
  });
  candidatos.sort((a, b) => a.index - b.index || b.patron.length - a.patron.length);
  const ocupado = new Array(normalizado.length).fill(false);
  const ocurrencias: { campo: CampoClave; index: number; largo: number }[] = [];
  candidatos.forEach((c) => {
    const fin = c.index + c.patron.length;
    let libre = true;
    for (let i = c.index; i < fin; i++) if (ocupado[i]) { libre = false; break; }
    if (!libre) return;
    for (let i = c.index; i < fin; i++) ocupado[i] = true;
    ocurrencias.push({ campo: c.campo, index: c.index, largo: c.patron.length });
  });
  ocurrencias.sort((a, b) => a.index - b.index);
  const segmentos: { campo: CampoClave; texto: string }[] = [];
  for (let i = 0; i < ocurrencias.length; i++) {
    const actual = ocurrencias[i];
    const inicio = actual.index + actual.largo;
    const fin = i + 1 < ocurrencias.length ? ocurrencias[i + 1].index : normalizado.length;
    const seg = normalizado.slice(inicio, fin).trim();
    if (seg) segmentos.push({ campo: actual.campo, texto: seg });
  }
  return segmentos;
};

export interface DeteccionVoz {
  campo: string;
  label: string;
  valor: string;
  textoOido: string;
  confianza: number;
  opciones?: string[];
  tipoCorreccion?: TipoCorreccion;
  editable: boolean;
}

export interface ResultadoParseoVoz {
  campos: Partial<FormData>;
  detecciones: DeteccionVoz[];
}

const UNIDAD_POR_PALABRA = (texto: string): "KG" | "LB" | "LT" | "GAL" | null => {
  const t = normalizarTexto(texto);
  if (/\b(kilos?|kilogramos?|kg)\b/.test(t)) return "KG";
  if (/\b(libras?|lb)\b/.test(t)) return "LB";
  if (/\b(litros?|lts?|l)\b/.test(t)) return "LT";
  if (/\b(galones?|galon|gal)\b/.test(t)) return "GAL";
  return null;
};

const PESOS_POR_UNIDAD: Record<"KG" | "LB" | "LT" | "GAL", readonly string[]> = {
  KG: PESOS_KG, LB: PESOS_LB, LT: PESOS_LT, GAL: PESOS_GAL,
};

const PATRON_CORRECCION_AMPLIA = /\bno\s+es\b|\bno\b|\bmás\s+bien\b|\bmejor\s+dicho\b|\bcorrijo\b|\bcorreccion\b|\bcorrección\b/;
const PATRON_CORRECCION_FRASE = /\bno\s+es\b|\bmás\s+bien\b|\bmejor\s+dicho\b|\bcorrijo\b|\bcorreccion\b|\bcorrección\b/;

const aplicarCorreccionInterna = (seg: string, patron: RegExp): string => {
  const partes = seg.split(patron);
  if (partes.length <= 1) return seg;
  const ultima = partes[partes.length - 1].trim();
  return ultima || seg;
};

export function parsearComandoVoz(
  texto: string,
  contexto: { marcas: string[]; agentes: string[]; recargas: string[]; serviciosExtra: string[]; unidadActual: "KG" | "LB" | "LT" | "GAL"; agenteActual?: string; correcciones: Record<string, Record<string, string>> },
): ResultadoParseoVoz {
  const segmentos = segmentarPorPalabrasClave(texto);
  const campos: Partial<FormData> = {};
  const detecciones: DeteccionVoz[] = [];

  segmentos.forEach(({ campo, texto: segOriginal }) => {
    const usaCorreccionAmplia = campo !== "valvula" && campo !== "manguera" && campo !== "manometro" && campo !== "tobera";
    const seg = aplicarCorreccionInterna(segOriginal, usaCorreccionAmplia ? PATRON_CORRECCION_AMPLIA : PATRON_CORRECCION_FRASE);
    if (campo === "nSerie") {
      const valor = extraerCodigo(seg);
      if (valor) { campos.nSerie = valor; detecciones.push({ campo, label: "N° Serie", valor, textoOido: seg, confianza: 1, editable: true }); }
    } else if (campo === "nInterno") {
      const valor = extraerCodigo(seg);
      if (valor) { campos.nInterno = valor; detecciones.push({ campo, label: "N° Interno", valor, textoOido: seg, confianza: 1, editable: true }); }
    } else if (campo === "marca") {
      const segLimpio = limpiarRelleno(seg);
      const match = mejorCoincidencia(segLimpio, contexto.marcas, contexto.correcciones.marca || {});
      const valor = match ? match.valor : (contexto.marcas[0] || seg.replace(/\b\w/g, (c) => c.toUpperCase()));
      campos.marca = valor;
      detecciones.push({ campo, label: "Marca", valor, textoOido: segLimpio, confianza: match?.confianza ?? 0, opciones: contexto.marcas, tipoCorreccion: "marca", editable: true });
    } else if (campo === "fechaFabricacion") {
      const numero = extraerNumero(seg);
      if (numero.length === 4) { campos.fechaFabricacion = numero; detecciones.push({ campo, label: "Año Fabricación", valor: numero, textoOido: seg, confianza: 1, editable: true }); }
    } else if (campo === "ph") {
      const anio = (seg.match(/\d{4}/) || [""])[0];
      const segMes = limpiarRelleno(seg.replace(/\d{4}/, ""));
      const mesMatch = mejorCoincidencia(segMes, MESES.map((m) => m.label), contexto.correcciones.mes || {});
      const mes = mesMatch && mesMatch.confianza >= 0.5 ? MESES.find((m) => m.label === mesMatch.valor)?.value || "" : "";
      if (mes) { campos.mesRealizadoPH = mes; }
      if (anio.length === 4) { campos.realizadoPH = anio; }
      if (mes || anio) detecciones.push({ campo, label: "PH Realizado", valor: `${mesMatch?.valor || ""} ${anio}`.trim(), textoOido: segMes || seg, confianza: mesMatch?.confianza || 0, opciones: MESES.map((m) => m.label), tipoCorreccion: "mes", editable: true });
    } else if (campo === "estadoExtintor") {
      const segLimpio = limpiarRelleno(seg);
      const alias = ESTADO_ALIAS[segLimpio];
      const match = alias ? { valor: alias, confianza: 1 } : mejorCoincidencia(segLimpio, ESTADOS, contexto.correcciones.estadoExtintor || {});
      if (match) {
        campos.estadoExtintor = match.valor;
        detecciones.push({ campo, label: "Estado", valor: match.valor, textoOido: segLimpio, confianza: match.confianza, opciones: ESTADOS, tipoCorreccion: "estadoExtintor", editable: true });
      }
    } else if (campo === "agenteExtintor") {
      const segLimpio = limpiarRelleno(seg);
      const match = mejorCoincidencia(segLimpio, contexto.agentes, contexto.correcciones.agenteExtintor || {});
      const valor = match ? match.valor : (contexto.agentes[0] || seg.replace(/\b\w/g, (c) => c.toUpperCase()));
      campos.agenteExtintor = valor;
      detecciones.push({ campo, label: "Agente", valor, textoOido: segLimpio, confianza: match?.confianza ?? 0, opciones: contexto.agentes, tipoCorreccion: "agenteExtintor", editable: true });
    } else if (campo === "peso") {
      const segLimpio = limpiarRelleno(seg);
      const unidad = UNIDAD_POR_PALABRA(seg) || contexto.unidadActual;
      const claveAprendida = contexto.correcciones.peso?.[normalizarTexto(segLimpio)];
      const numero = extraerNumero(seg);
      if (claveAprendida || numero) {
        const valor = claveAprendida || masCercano(numero, PESOS_POR_UNIDAD[unidad]);
        campos.unidadPeso = unidad;
        campos.peso = valor;
        detecciones.push({ campo, label: "Peso", valor: `${valor} ${unidad}`, textoOido: segLimpio, confianza: claveAprendida ? 1 : 0.8, opciones: [...PESOS_POR_UNIDAD[unidad]], tipoCorreccion: "peso", editable: true });
      }
    } else if (campo === "servicios") {
      if (/mantenimiento/.test(seg)) { campos.ma = true; campos.ph = false; }
      if (/hidrostatica/.test(seg)) { campos.ph = true; campos.ma = false; }
      if (campos.ma || campos.ph) detecciones.push({ campo, label: "Servicio", valor: campos.ph ? "Prueba Hidrostática" : "Mantenimiento", textoOido: seg, confianza: 1, editable: true });
    } else if (campo === "recarga") {
      if (contexto.recargas.length > 0) {
        const numero = extraerNumero(seg);
        const agenteConocido = normalizarTexto(campos.agenteExtintor || contexto.agenteActual || "");
        const esPQS = agenteConocido.includes("pqs");
        const conPorcentaje = contexto.recargas.filter((r) => /\d/.test(r));
        const sinPorcentaje = contexto.recargas.filter((r) => !/\d/.test(r));
        const segLimpio = limpiarRelleno(seg);
        const claveAprendida = contexto.correcciones.recarga?.[normalizarTexto(segLimpio)];
        let valor = claveAprendida || "";
        if (!valor) {
          if (esPQS && numero && conPorcentaje.length > 0) {
            valor = conPorcentaje.reduce((mejor, actual) => {
              const dm = Math.abs(parseFloat((mejor.match(/\d+/) || ["999"])[0]) - parseFloat(numero));
              const da = Math.abs(parseFloat((actual.match(/\d+/) || ["999"])[0]) - parseFloat(numero));
              return da < dm ? actual : mejor;
            }, conPorcentaje[0]);
          } else {
            valor = sinPorcentaje[0] || contexto.recargas[0];
          }
        }
        campos.recarga = valor;
        detecciones.push({ campo, label: "Recarga", valor, textoOido: segLimpio, confianza: claveAprendida ? 1 : 0.8, opciones: contexto.recargas, tipoCorreccion: "recarga", editable: true });
      }
    } else if (campo === "valvula" || campo === "manguera" || campo === "manometro" || campo === "tobera") {
      const negativo = /\b(mal|no|falta|malo)\b/.test(seg);
      const valor = negativo ? "" : "SI";
      (campos as any)[campo] = valor;
      detecciones.push({ campo, label: campo.charAt(0).toUpperCase() + campo.slice(1), valor: valor === "SI" ? "Bien" : "Falta", textoOido: seg, confianza: 1, editable: true });
    } else if (campo === "servicioExtra") {
      const partes = seg.split(/\s+y\s+|,/).map((p) => p.trim()).filter(Boolean);
      const resueltas = partes
        .map((p) => mejorCoincidencia(p, contexto.serviciosExtra, contexto.correcciones.servicioExtra || {}))
        .filter((m): m is { valor: string; confianza: number } => !!m && m.confianza >= 0.5)
        .map((m) => m.valor);
      if (resueltas.length > 0) {
        campos.servicioExtra = resueltas.join(", ");
        detecciones.push({ campo, label: "Servicio Adicional", valor: campos.servicioExtra, textoOido: seg, confianza: 1, opciones: contexto.serviciosExtra, tipoCorreccion: "servicioExtra", editable: true });
      }
    } else if (campo === "observaciones") {
      const valor = seg.charAt(0).toUpperCase() + seg.slice(1);
      campos.observaciones = valor;
      detecciones.push({ campo, label: "Observaciones", valor, textoOido: seg, confianza: 1, editable: true });
    }
  });

  const normalizadoCompleto = normalizarTexto(texto);
  const pesoSinEtiqueta = normalizadoCompleto.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|lb|libras?|lt|litros?|l|gal|galones?)\b/);
  if (!campos.peso && pesoSinEtiqueta) {
    const unidad = UNIDAD_POR_PALABRA(pesoSinEtiqueta[2]) || contexto.unidadActual;
    const valor = masCercano(pesoSinEtiqueta[1].replace(",", "."), PESOS_POR_UNIDAD[unidad]);
    campos.unidadPeso = unidad;
    campos.peso = valor;
    detecciones.push({ campo: "peso", label: "Peso", valor: `${valor} ${unidad}`, textoOido: pesoSinEtiqueta[0], confianza: 0.9, opciones: [...PESOS_POR_UNIDAD[unidad]], tipoCorreccion: "peso", editable: true });
  }
  if (!campos.marca) {
    const encontrada = mejorCoincidenciaEnTexto(normalizadoCompleto, contexto.marcas, contexto.correcciones.marca || {});
    if (encontrada && encontrada.confianza >= 0.6) {
      campos.marca = encontrada.valor;
      detecciones.push({ campo: "marca", label: "Marca", valor: encontrada.valor, textoOido: encontrada.texto, confianza: encontrada.confianza, opciones: contexto.marcas, tipoCorreccion: "marca", editable: true });
    }
  }
  if (!campos.agenteExtintor) {
    const encontrada = mejorCoincidenciaEnTexto(normalizadoCompleto, contexto.agentes, contexto.correcciones.agenteExtintor || {});
    if (encontrada && encontrada.confianza >= 0.6) {
      campos.agenteExtintor = encontrada.valor;
      detecciones.push({ campo: "agenteExtintor", label: "Agente", valor: encontrada.valor, textoOido: encontrada.texto, confianza: encontrada.confianza, opciones: contexto.agentes, tipoCorreccion: "agenteExtintor", editable: true });
    }
  }

  const ultimaPorCampo = new Map<string, DeteccionVoz>();
  detecciones.forEach((d) => ultimaPorCampo.set(d.campo, d));

  return { campos, detecciones: Array.from(ultimaPorCampo.values()) };
}

export function useVoiceDictado(socket: Socket | null) {
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