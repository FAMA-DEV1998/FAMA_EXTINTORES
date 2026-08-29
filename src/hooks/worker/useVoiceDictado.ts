import { useEffect, useRef, useState } from "react";
import { ESTADOS, MESES, PESOS_KG, PESOS_LB, PESOS_LT, PESOS_GAL } from "../../constants";
import type { FormData } from "../../types";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const STORAGE_KEY = "fama_voz_correcciones";

type TipoCorreccion = "marca" | "agenteExtintor" | "estadoExtintor";

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

const mejorCoincidencia = (texto: string, opciones: string[], correcciones: Record<string, string>): { valor: string; confianza: number } | null => {
  const normalizado = normalizarTexto(texto);
  if (!normalizado) return null;
  if (correcciones[normalizado]) return { valor: correcciones[normalizado], confianza: 1 };
  let mejor: { valor: string; confianza: number } | null = null;
  opciones.forEach((opcion) => {
    const score = similitud(normalizado, opcion);
    if (!mejor || score > mejor.confianza) mejor = { valor: opcion, confianza: score };
  });
  return mejor;
};

const PALABRAS_NUMERO: Record<string, string> = {
  cero: "0", uno: "1", una: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5",
  seis: "6", siete: "7", ocho: "8", nueve: "9",
};

const extraerNumero = (texto: string): string => {
  const directo = texto.match(/\d+(\.\d+)?/);
  if (directo) return directo[0];
  const palabras = normalizarTexto(texto).split(" ").map((p) => PALABRAS_NUMERO[p] || "").filter(Boolean);
  return palabras.join("");
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
  if (/kilo|kg/.test(texto)) return "KG";
  if (/libra|lb/.test(texto)) return "LB";
  if (/litro|lt/.test(texto)) return "LT";
  if (/galon|gal/.test(texto)) return "GAL";
  return null;
};

const PESOS_POR_UNIDAD: Record<"KG" | "LB" | "LT" | "GAL", readonly string[]> = {
  KG: PESOS_KG, LB: PESOS_LB, LT: PESOS_LT, GAL: PESOS_GAL,
};

const PATRON_CORRECCION = /\b(?:no,?\s*es|más\s+bien|mejor\s+dicho|corrijo|correccion|corrección)\b/;

const aplicarCorreccionInterna = (seg: string): string => {
  const partes = seg.split(PATRON_CORRECCION);
  return partes.length > 1 ? partes[partes.length - 1].trim() : seg;
};

export function parsearComandoVoz(
  texto: string,
  contexto: { marcas: string[]; agentes: string[]; recargas: string[]; serviciosExtra: string[]; unidadActual: "KG" | "LB" | "LT" | "GAL"; correcciones: Record<string, Record<string, string>> },
): ResultadoParseoVoz {
  const segmentos = segmentarPorPalabrasClave(texto);
  const campos: Partial<FormData> = {};
  const detecciones: DeteccionVoz[] = [];

  segmentos.forEach(({ campo, texto: segOriginal }) => {
    const seg = aplicarCorreccionInterna(segOriginal);
    if (campo === "nSerie") {
      const valor = seg.replace(/\s+/g, "").toUpperCase();
      if (valor) { campos.nSerie = valor; detecciones.push({ campo, label: "N° Serie", valor, textoOido: seg, confianza: 1, editable: true }); }
    } else if (campo === "nInterno") {
      const valor = seg.replace(/\s+/g, "").toUpperCase();
      if (valor) { campos.nInterno = valor; detecciones.push({ campo, label: "N° Interno", valor, textoOido: seg, confianza: 1, editable: true }); }
    } else if (campo === "marca") {
      const match = mejorCoincidencia(seg, contexto.marcas, contexto.correcciones.marca || {});
      const valor = match && match.confianza >= 0.55 ? match.valor : seg.replace(/\b\w/g, (c) => c.toUpperCase());
      campos.marca = valor;
      detecciones.push({ campo, label: "Marca", valor, textoOido: seg, confianza: match?.confianza || 0, opciones: contexto.marcas, tipoCorreccion: "marca", editable: true });
    } else if (campo === "fechaFabricacion") {
      const numero = extraerNumero(seg);
      if (numero.length === 4) { campos.fechaFabricacion = numero; detecciones.push({ campo, label: "Año Fabricación", valor: numero, textoOido: seg, confianza: 1, editable: true }); }
    } else if (campo === "ph") {
      const anio = (seg.match(/\d{4}/) || [""])[0];
      const mesMatch = mejorCoincidencia(seg, MESES.map((m) => m.label), {});
      const mes = mesMatch && mesMatch.confianza >= 0.5 ? MESES.find((m) => m.label === mesMatch.valor)?.value || "" : "";
      if (mes) { campos.mesRealizadoPH = mes; }
      if (anio.length === 4) { campos.realizadoPH = anio; }
      if (mes || anio) detecciones.push({ campo, label: "PH Realizado", valor: `${mesMatch?.valor || ""} ${anio}`.trim(), textoOido: seg, confianza: mesMatch?.confianza || 0, editable: true });
    } else if (campo === "estadoExtintor") {
      const alias = ESTADO_ALIAS[normalizarTexto(seg)];
      const match = alias ? { valor: alias, confianza: 1 } : mejorCoincidencia(seg, ESTADOS, {});
      if (match && match.confianza >= 0.45) {
        campos.estadoExtintor = match.valor;
        detecciones.push({ campo, label: "Estado", valor: match.valor, textoOido: seg, confianza: match.confianza, opciones: ESTADOS, editable: true });
      }
    } else if (campo === "agenteExtintor") {
      const match = mejorCoincidencia(seg, contexto.agentes, contexto.correcciones.agenteExtintor || {});
      const valor = match && match.confianza >= 0.55 ? match.valor : seg.replace(/\b\w/g, (c) => c.toUpperCase());
      campos.agenteExtintor = valor;
      detecciones.push({ campo, label: "Agente", valor, textoOido: seg, confianza: match?.confianza || 0, opciones: contexto.agentes, tipoCorreccion: "agenteExtintor", editable: true });
    } else if (campo === "peso") {
      const unidad = UNIDAD_POR_PALABRA(seg) || contexto.unidadActual;
      const numero = extraerNumero(seg);
      if (numero) {
        const valor = masCercano(numero, PESOS_POR_UNIDAD[unidad]);
        campos.unidadPeso = unidad;
        campos.peso = valor;
        detecciones.push({ campo, label: "Peso", valor: `${valor} ${unidad}`, textoOido: seg, confianza: 1, editable: true });
      }
    } else if (campo === "servicios") {
      if (/mantenimiento/.test(seg)) { campos.ma = true; campos.ph = false; }
      if (/hidrostatica/.test(seg)) { campos.ph = true; campos.ma = false; }
      if (campos.ma || campos.ph) detecciones.push({ campo, label: "Servicio", valor: campos.ph ? "Prueba Hidrostática" : "Mantenimiento", textoOido: seg, confianza: 1, editable: true });
    } else if (campo === "recarga") {
      const numero = extraerNumero(seg);
      if (numero && contexto.recargas.length > 0) {
        const conPorcentaje = contexto.recargas.filter((r) => /\d/.test(r));
        const candidatos = conPorcentaje.length > 0 ? conPorcentaje : contexto.recargas;
        const valor = candidatos.reduce((mejor, actual) => {
          const dm = Math.abs(parseFloat((mejor.match(/\d+/) || ["999"])[0]) - parseFloat(numero));
          const da = Math.abs(parseFloat((actual.match(/\d+/) || ["999"])[0]) - parseFloat(numero));
          return da < dm ? actual : mejor;
        }, candidatos[0]);
        campos.recarga = valor;
        detecciones.push({ campo, label: "Recarga", valor, textoOido: seg, confianza: 1, opciones: contexto.recargas, editable: true });
      }
    } else if (campo === "valvula" || campo === "manguera" || campo === "manometro" || campo === "tobera") {
      const negativo = /\b(mal|no|falta|malo)\b/.test(seg);
      const valor = negativo ? "" : "SI";
      (campos as any)[campo] = valor;
      detecciones.push({ campo, label: campo.charAt(0).toUpperCase() + campo.slice(1), valor: valor === "SI" ? "Bien" : "Falta", textoOido: seg, confianza: 1, editable: true });
    } else if (campo === "servicioExtra") {
      const partes = seg.split(/\s+y\s+|,/).map((p) => p.trim()).filter(Boolean);
      const resueltas = partes
        .map((p) => mejorCoincidencia(p, contexto.serviciosExtra, {}))
        .filter((m): m is { valor: string; confianza: number } => !!m && m.confianza >= 0.5)
        .map((m) => m.valor);
      if (resueltas.length > 0) {
        campos.servicioExtra = resueltas.join(", ");
        detecciones.push({ campo, label: "Servicio Adicional", valor: campos.servicioExtra, textoOido: seg, confianza: 1, opciones: contexto.serviciosExtra, editable: true });
      }
    } else if (campo === "observaciones") {
      const valor = seg.charAt(0).toUpperCase() + seg.slice(1);
      campos.observaciones = valor;
      detecciones.push({ campo, label: "Observaciones", valor, textoOido: seg, confianza: 1, editable: true });
    }
  });

  const ultimaPorCampo = new Map<string, DeteccionVoz>();
  detecciones.forEach((d) => ultimaPorCampo.set(d.campo, d));

  return { campos, detecciones: Array.from(ultimaPorCampo.values()) };
}

export function useVoiceDictado() {
  const [soportado] = useState(() => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [escuchando, setEscuchando] = useState(false);
  const [transcripcion, setTranscripcion] = useState("");
  const [correcciones, setCorrecciones] = useState<Record<string, Record<string, string>>>({});
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      setCorrecciones(guardado && typeof guardado === "object" ? guardado : {});
    } catch { setCorrecciones({}); }
  }, []);

  const iniciar = () => {
    if (!soportado) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = "es-PE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let texto = "";
      for (let i = 0; i < event.results.length; i++) texto += event.results[i][0].transcript + " ";
      setTranscripcion(texto.trim());
    };
    recognition.onend = () => setEscuchando(false);
    recognition.onerror = () => setEscuchando(false);
    recognitionRef.current = recognition;
    setTranscripcion("");
    recognition.start();
    setEscuchando(true);
  };

  const detener = () => {
    recognitionRef.current?.stop();
    setEscuchando(false);
  };

  const reiniciar = () => setTranscripcion("");

  const registrarCorreccion = (tipo: TipoCorreccion, textoOido: string, valorElegido: string) => {
    const clave = normalizarTexto(textoOido);
    if (!clave || !valorElegido) return;
    setCorrecciones((prev) => {
      const next = { ...prev, [tipo]: { ...(prev[tipo] || {}), [clave]: valorElegido } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return { soportado, escuchando, transcripcion, iniciar, detener, reiniciar, correcciones, registrarCorreccion };
}