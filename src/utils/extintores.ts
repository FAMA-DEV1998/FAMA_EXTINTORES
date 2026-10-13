import { estadoBloqueaServicio, estadoRequiereDatosPH } from "./estadosExtintor";
import type { ExtintorFormData, Extintor } from "../types";

export const emptyExtintorForm = (): ExtintorFormData => ({
    nSerie: "", nInterno: "", marca: "", fechaFabricacion: "", realizadoPH: "", mesRealizadoPH: "",
    vencimPH: "", estadoExtintor: "", agenteExtintor: "", peso: "", unidadPeso: "KG",
    ma: false, recarga: "", ph: false, valvula: "", manguera: "", manometro: "",
    tobera: "", observaciones: "", servicioExtra: "", motivoBaja: "", evidencias: [],
});

export const emptyExtintor = (): Partial<Extintor> => ({
    nSerie: "", nInterno: "", marca: "", fechaFabricacion: "",
    realizadoPH: "", mesRealizadoPH: "", vencimPH: "", estadoExtintor: "", agenteExtintor: "",
    peso: "", unidadPeso: "KG", ma: "", recarga: "", ph: "",
    valvula: "", manguera: "", manometro: "", tobera: "", observaciones: "", servicioExtra: "", motivoBaja: "",
    evidencia: "[]"
});

export const getWeightInKg = (weightStr: string) => {
    if (!weightStr || weightStr === "Sin definir") return 999999;
    const match = weightStr.match(/([\d.]+)\s*(KG|LBS?|LT|GAL)/i);
    if (!match) return 999999;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit.startsWith("LB")) return val * 0.453592;
    if (unit === "GAL") return val * 3.785;
    return val;
};

export const esExtintorIncompleto = (ext: Extintor): boolean => {
    const sinEstado = !ext.estadoExtintor || !ext.estadoExtintor.trim();
    const sinMarca = !ext.marca || !ext.marca.trim();
    const sinAgente = !ext.agenteExtintor || !ext.agenteExtintor.trim();
    const sinPeso = !ext.peso || !String(ext.peso).trim();

    const serviceRequerido = !estadoBloqueaServicio(ext.estadoExtintor || "");
    const sinServicio = serviceRequerido && ext.ma !== "SI" && ext.ph !== "SI" && !ext.recarga;

    const datosPHRequeridos = estadoRequiereDatosPH(ext.estadoExtintor || "");
    const sinFabricacion = datosPHRequeridos && (!ext.fechaFabricacion || !ext.fechaFabricacion.trim());
    const sinRealizadoPH = datosPHRequeridos && (!ext.realizadoPH || !ext.realizadoPH.trim());
    const sinVencimPH = datosPHRequeridos && (!ext.vencimPH || !ext.vencimPH.trim());

    return sinEstado || sinMarca || sinAgente || sinPeso || sinServicio || sinFabricacion || sinRealizadoPH || sinVencimPH;
};

export const getCamposFaltantes = (ext: Extintor): string[] => {
    const faltantes: string[] = [];

    if (!ext.estadoExtintor || !ext.estadoExtintor.trim()) faltantes.push("Estado");
    if (!ext.marca || !ext.marca.trim()) faltantes.push("Marca");
    if (!ext.agenteExtintor || !ext.agenteExtintor.trim()) faltantes.push("Agente");
    if (!ext.peso || !String(ext.peso).trim()) faltantes.push("Peso");

    const serviceRequerido = !estadoBloqueaServicio(ext.estadoExtintor || "");
    if (serviceRequerido && ext.ma !== "SI" && ext.ph !== "SI" && !ext.recarga) {
        faltantes.push("Servicio");
    }

    const datosPHRequeridos = estadoRequiereDatosPH(ext.estadoExtintor || "");
    if (datosPHRequeridos) {
        if (!ext.fechaFabricacion || !ext.fechaFabricacion.trim()) faltantes.push("Fabricación");
        if (!ext.realizadoPH || !ext.realizadoPH.trim()) faltantes.push("PH Realizado");
        if (!ext.vencimPH || !ext.vencimPH.trim()) faltantes.push("Vence PH");
    }

    return faltantes;
};

export const getRecargasPermitidas = (agenteExtintor: string, recargasDisponibles: string[]): string[] => {
    const esPQS = (agenteExtintor || "").trim().toUpperCase() === "PQS";
    return recargasDisponibles.filter((r) => {
        const tienePorcentaje = /\d/.test(r);
        return esPQS ? tienePorcentaje : !tienePorcentaje;
    });
};
