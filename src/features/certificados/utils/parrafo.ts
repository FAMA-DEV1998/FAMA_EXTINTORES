import type { CertificadoDatos } from "../types";
import { construirDenominacionTexto } from "./denominacion";

export const aplicarDenominacionParrafo = (html: string, texto: string): string => {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = html;
  contenedor.querySelectorAll('[data-campo="denominacion"]').forEach((el) => { el.textContent = texto; });
  return contenedor.innerHTML;
};

const ORDEN_CAMPOS_PARRAFO = ["cliente", "ubicacion", "trabajo", "denominacion", "agentes", "maquina", "normas"];

export const sanitizarHtmlBold = (html: string): string => {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = html || "";
  const limpiar = (nodo: Node): string => {
    let resultado = "";
    nodo.childNodes.forEach((hijo) => {
      if (hijo.nodeType === Node.TEXT_NODE) {
        resultado += (hijo.textContent || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      } else if (hijo.nodeType === Node.ELEMENT_NODE) {
        const el = hijo as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const campo = el.getAttribute("data-campo");
        if (tag === "span" && campo) {
          resultado += `<span data-campo="${campo}" contenteditable="false">${limpiar(el)}</span>`;
        } else if (tag === "strong" || tag === "b") {
          resultado += `<strong>${limpiar(el)}</strong>`;
        } else if (tag === "br") {
          resultado += "<br>";
        } else if (tag === "div" || tag === "p") {
          resultado += `${limpiar(el)}<br>`;
        } else {
          resultado += limpiar(el);
        }
      }
    });
    return resultado;
  };
  const limpio = limpiar(contenedor).replace(/(<br>)+$/, "");
  const soloTexto = document.createElement("div");
  soloTexto.innerHTML = limpio;
  return (soloTexto.textContent || "").trim() === "" ? "" : limpio;
};

const construirSegmentosParrafo = (datos: CertificadoDatos): Record<string, string> => {
  const esPH = datos.tipoCertificado === "ph";
  const esPlaca = datos.tipoIdentificacion === "placa";
  const soloUnidadPlaca = esPlaca && !datos.dniAdicional && !datos.nombre.trim();
  const esSingular = datos.items.length === 1;
  const labelIdentificacion = datos.tipoIdentificacion === "ruc" ? "RUC N°" : datos.tipoIdentificacion === "dni" ? "DNI N°" : "Placa N°";
  const ubicacionCompleta = `${datos.ubicacion || "—"}${datos.distrito ? ` - ${datos.distrito}` : ""} - Lima`;
  const etiquetasTexto = ["NTP 350.043.1", "833.030", ...datos.etiquetasAdicionales].join("; ");

  const cliente = soloUnidadPlaca
    ? `<strong>UNIDAD PLACA ${datos.numeroIdentificacion || "—"}</strong>`
    : `<strong>${datos.nombre || "—"}</strong> con <strong>${labelIdentificacion} ${datos.numeroIdentificacion || "—"}${esPlaca && datos.dniAdicional ? ` y DNI N° ${datos.dniAdicional}` : ""}</strong>`;

  return {
    cliente,
    ubicacion: `<strong>${ubicacionCompleta}</strong>`,
    trabajo: datos.textoAccion,
    denominacion: construirDenominacionTexto(datos.denominacion, esSingular),
    agentes: esPH ? (datos.agentesTextoCorto || "") : datos.agentesTexto,
    maquina: `<strong>MARCA KAMEX MAQUINARIAS EIRL</strong>, modelo <strong>KPH-02</strong>`,
    normas: `<strong>${etiquetasTexto} según detalle:</strong>`,
  };
};

export const construirParrafoAutomatico = (datos: CertificadoDatos): string => {
  const esPH = datos.tipoCertificado === "ph";
  const esPlaca = datos.tipoIdentificacion === "placa";
  const esSingular = datos.items.length === 1;
  const seg = construirSegmentosParrafo(datos);

  const sujeto = `<span data-campo="cliente" contenteditable="false">${seg.cliente}</span>`;
  const ubicacionParte = esPlaca ? "" : ` ubicado en <span data-campo="ubicacion" contenteditable="false">${seg.ubicacion}</span>`;

  if (esPH) {
    return `${sujeto}${ubicacionParte}, se ha efectuado la Prueba Hidrostática ${esSingular ? "al" : "a los"} <span data-campo="denominacion" contenteditable="false">${seg.denominacion}</span>${datos.agentesTextoCorto ? ` <span data-campo="agentes" contenteditable="false">${seg.agentes}</span>` : ""}, utilizando la máquina <span data-campo="maquina" contenteditable="false">${seg.maquina}</span>, dicho trabajo se ha realizado conforme lo establece la <span data-campo="normas" contenteditable="false">${seg.normas}</span>`;
  }
  return `${sujeto}${ubicacionParte}, se ha efectuado <span data-campo="trabajo" contenteditable="false">${seg.trabajo}</span> ${esSingular ? "del" : "de los"} <span data-campo="denominacion" contenteditable="false">${seg.denominacion}</span> de <span data-campo="agentes" contenteditable="false">${seg.agentes}</span>, dicho trabajo se ha realizado conforme lo establece la <span data-campo="normas" contenteditable="false">${seg.normas}</span>`;
};

const sincronizarCampoParrafo = (contenedor: HTMLElement, campo: string, contenido: string, forzarActualizacion: boolean) => {
  const existente = contenedor.querySelector(`[data-campo="${campo}"]`);
  if (existente) {
    if (forzarActualizacion) existente.innerHTML = contenido;
    return;
  }
  if (!contenido) return;
  const idx = ORDEN_CAMPOS_PARRAFO.indexOf(campo);
  let referenciaPrevia: Element | null = null;
  for (let i = idx - 1; i >= 0 && !referenciaPrevia; i--) {
    referenciaPrevia = contenedor.querySelector(`[data-campo="${ORDEN_CAMPOS_PARRAFO[i]}"]`);
  }
  const nuevo = document.createElement("span");
  nuevo.setAttribute("data-campo", campo);
  nuevo.setAttribute("contenteditable", "false");
  nuevo.innerHTML = contenido;
  if (referenciaPrevia) {
    referenciaPrevia.after(document.createTextNode(" "), nuevo);
  } else if (contenedor.firstChild) {
    contenedor.prepend(nuevo, document.createTextNode(" "));
  } else {
    contenedor.appendChild(nuevo);
  }
};

export const sincronizarCamposParrafo = (
  html: string,
  datos: CertificadoDatos,
  anteriores: Record<string, string> = {},
): { html: string; segmentos: Record<string, string> } => {
  const esPH = datos.tipoCertificado === "ph";
  const seg = construirSegmentosParrafo(datos);
  const campos = esPH
    ? ["cliente", "ubicacion", "denominacion", "agentes", "maquina", "normas"]
    : ["cliente", "ubicacion", "trabajo", "denominacion", "agentes", "normas"];
  const contenedor = document.createElement("div");
  contenedor.innerHTML = html || "";
  const segmentos: Record<string, string> = {};
  campos.forEach((campo) => {
    const valorNuevo = seg[campo];
    const cambio = anteriores[campo] === undefined || anteriores[campo] !== valorNuevo;
    sincronizarCampoParrafo(contenedor, campo, valorNuevo, cambio);
    segmentos[campo] = valorNuevo;
  });
  return { html: contenedor.innerHTML, segmentos };
};
