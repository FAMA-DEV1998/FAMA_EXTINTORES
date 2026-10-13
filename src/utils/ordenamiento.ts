import { getWeightInKg } from "./extintores";
import { getEstadoPrioridad } from "./estadosExtintor";
import type { Extintor } from "../types";

const compararPorOrden = (valA: string, valB: string, orden: string[], respaldo: (a: string, b: string) => number): number => {
    if (valA === valB) return 0;
    const idxA = orden.indexOf(valA);
    const idxB = orden.indexOf(valB);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return respaldo(valA, valB);
};

export const sortExtintoresPersonalizado = (
    list: Extintor[],
    weightOrder: string[] = [],
    estadoOrder: string[] = [],
    agenteOrder: string[] = [],
    countsSourceList: Extintor[] = list,
    sedeOrder: string[] = [],
    sedeNameById: Record<string, string> = {}
): Extintor[] => {
    const marcaPesoCounts: Record<string, number> = {};
    countsSourceList.forEach((e) => {
        const p = e.peso ? `${e.peso} ${e.unidadPeso}` : "Sin definir";
        const m = e.marca || "Sin definir";
        const key = `${p}|${m}`;
        marcaPesoCounts[key] = (marcaPesoCounts[key] || 0) + 1;
    });

    return [...list].sort((a, b) => {
        if (sedeOrder.length > 0) {
            const valA = a.sedeId ? (sedeNameById[a.sedeId] || "Sin sede") : "Sin sede";
            const valB = b.sedeId ? (sedeNameById[b.sedeId] || "Sin sede") : "Sin sede";
            const idxA = sedeOrder.indexOf(valA);
            const idxB = sedeOrder.indexOf(valB);
            if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
            if (idxA !== -1 && idxB === -1) return -1;
            if (idxB !== -1 && idxA === -1) return 1;
        }

        const estadoA = a.estadoExtintor || "Sin definir";
        const estadoB = b.estadoExtintor || "Sin definir";
        const cmpEstado = compararPorOrden(estadoA, estadoB, estadoOrder, (x, y) => (getEstadoPrioridad(x) - getEstadoPrioridad(y)) || x.localeCompare(y, "es"));
        if (cmpEstado !== 0) return cmpEstado;

        const agenteA = a.agenteExtintor || "Sin definir";
        const agenteB = b.agenteExtintor || "Sin definir";
        const cmpAgente = compararPorOrden(agenteA, agenteB, agenteOrder, (x, y) => x.localeCompare(y, "es"));
        if (cmpAgente !== 0) return cmpAgente;

        const pesoA = a.peso ? `${a.peso} ${a.unidadPeso}` : "Sin definir";
        const pesoB = b.peso ? `${b.peso} ${b.unidadPeso}` : "Sin definir";
        const cmpPeso = compararPorOrden(pesoA, pesoB, weightOrder, (x, y) => (getWeightInKg(x) - getWeightInKg(y)) || x.localeCompare(y, "es"));
        if (cmpPeso !== 0) return cmpPeso;

        const pA = a.peso ? `${a.peso} ${a.unidadPeso}` : "Sin definir";
        const mA = a.marca || "Sin definir";
        const pB = b.peso ? `${b.peso} ${b.unidadPeso}` : "Sin definir";
        const mB = b.marca || "Sin definir";

        const countA = marcaPesoCounts[`${pA}|${mA}`] || 0;
        const countB = marcaPesoCounts[`${pB}|${mB}`] || 0;
        if (countA !== countB) return countA - countB;
        if (mA !== mB) return mA.localeCompare(mB, "es");

        const serieA = (a.nSerie || "").trim().toUpperCase();
        const serieB = (b.nSerie || "").trim().toUpperCase();
        if (serieA !== serieB) return serieA.localeCompare(serieB, "es");

        const internoA = (a.nInterno || "").trim().toUpperCase();
        const internoB = (b.nInterno || "").trim().toUpperCase();
        if (internoA !== internoB) return internoA.localeCompare(internoB, "es");

        return 0;
    });
};
