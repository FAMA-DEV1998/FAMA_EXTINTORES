import { ESTADO_ORDEN_DEFAULT, ESTADOS_SIN_SERVICIO, ESTADOS_REQUIEREN_DATOS_PH, ESTADOS_SIN_SERVICIO_EXTRA, ESTADOS_SOLO_RECARGA, ESTADOS_SIN_COMPONENTES } from "../constants/extintores";

export const estadoColor: Record<string, string> = {
    Bueno: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
    Regular: "bg-amber-900/40 text-amber-400 border-amber-800",
    Malo: "bg-red-900/40 text-red-400 border-red-800",
    Inoperativo: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

export const serviceBadge = (ma: string, recarga: string, ph: string) => {
    const badges: { label: string; cls: string }[] = [];
    if (ma === "SI") badges.push({ label: "MA", cls: "bg-red-900/40 text-red-400 border-red-800" });
    if (recarga) badges.push({ label: `RE: ${recarga}`, cls: "bg-amber-900/40 text-amber-400 border-amber-800" });
    if (ph === "SI") badges.push({ label: "PH", cls: "bg-blue-900/40 text-blue-400 border-blue-800" });
    return badges;
};

export const getEstadoPrioridad = (estado: string) => {
    const idx = ESTADO_ORDEN_DEFAULT.indexOf(estado);
    return idx === -1 ? 999 : idx;
};

export const estadoBloqueaServicio = (estado: string): boolean => {
    return ESTADOS_SIN_SERVICIO.includes(estado);
};

export const estadoSoloPermiteRecarga = (estado: string): boolean => {
    return ESTADOS_SOLO_RECARGA.includes(estado);
};

export const estadoBloqueaServicioExtra = (estado: string): boolean => {
    return ESTADOS_SIN_SERVICIO_EXTRA.includes(estado);
};

export const estadoBloqueaComponentes = (estado: string): boolean => {
    return ESTADOS_SIN_COMPONENTES.includes(estado);
};

export const estadoRequiereDatosPH = (estado: string): boolean => {
    return ESTADOS_REQUIEREN_DATOS_PH.includes(estado);
};
