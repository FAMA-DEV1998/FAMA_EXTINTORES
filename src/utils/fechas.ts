import { MESES } from "../constants/meses";

export const mesFromFecha = (fecha: string): number | null => {
    if (!fecha) return null;
    const m = parseInt(fecha.split("-")[1]);
    return isNaN(m) ? null : m;
};

export const anioFromFecha = (fecha: string): number | null => {
    if (!fecha) return null;
    const y = parseInt(fecha.split("-")[0]);
    return isNaN(y) ? null : y;
};

export const mesAnioLabel = (fecha: string): string => {
    const [anio, mes] = (fecha || "").split("-");
    const idx = parseInt(mes, 10) - 1;
    if (!anio || isNaN(idx) || idx < 0 || idx > 11) return "Sin fecha";
    return `${MESES[idx].label} ${anio}`;
};
