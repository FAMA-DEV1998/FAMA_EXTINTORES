import { confirmar } from "../components/ui/Notificaciones";
import { estadoRequiereDatosPH } from "./estadosExtintor";
import type { Extintor } from "../types";
import { MESES } from "../constants/meses";

const mesLabelCompleto = (mes: number): string => MESES.find((m) => parseInt(m.value, 10) === mes)?.label || String(mes);

export const calcularVencimientoPH = (mesRealizadoPH: string, realizadoPH: string): string => {
    const anio = parseInt(realizadoPH || "", 10);
    if (isNaN(anio) || (realizadoPH || "").length !== 4) return "";
    return mesRealizadoPH ? `${mesRealizadoPH}/${anio + 5}` : String(anio + 5);
};

export const parseVencimPH = (vencimPH?: string): { mes: number | null; anio: number } | null => {
    const valor = (vencimPH || "").trim();
    if (!valor) return null;
    if (valor.includes("/")) {
        const [mesStr, anioStr] = valor.split("/");
        const mes = parseInt(mesStr, 10);
        const anio = parseInt(anioStr, 10);
        if (isNaN(anio)) return null;
        return { mes: isNaN(mes) ? null : mes, anio };
    }
    const anio = parseInt(valor, 10);
    if (isNaN(anio)) return null;
    return { mes: null, anio };
};

export const formatVencimPH = (vencimPH?: string): string => {
    const parsed = parseVencimPH(vencimPH);
    if (!parsed) return "";
    return parsed.mes ? `${mesLabelCompleto(parsed.mes)} ${parsed.anio}` : String(parsed.anio);
};

export const formatRealizadoPH = (mesRealizadoPH?: string, realizadoPH?: string): string => {
    const anio = parseInt(realizadoPH || "", 10);
    if (isNaN(anio)) return "";
    const mes = parseInt(mesRealizadoPH || "", 10);
    return !isNaN(mes) && mes >= 1 && mes <= 12 ? `${mesLabelCompleto(mes)} ${anio}` : String(anio);
};

export const confirmarCambioPH = async (mesActual: string, anioActual: string, mesNuevo: string, anioNuevo: string): Promise<boolean> => {
    if (!anioActual) return true;
    if (mesActual === mesNuevo && anioActual === anioNuevo) return true;
    const labelActual = formatRealizadoPH(mesActual, anioActual);
    if (!labelActual) return true;
    const labelNuevo = formatRealizadoPH(mesNuevo, anioNuevo) || "la nueva fecha";
    return confirmar({
        titulo: "¿Cambiar la prueba hidrostática?",
        mensaje: `Existe una prueba hidrostática registrada en ${labelActual}. ¿Deseas cambiarla a ${labelNuevo}?`,
        textoConfirmar: "Sí, cambiar",
    });
};

export const phVenceEsteAnio = (ext: Extintor): boolean => {
    if (!estadoRequiereDatosPH(ext.estadoExtintor || "")) return false;
    const parsed = parseVencimPH(ext.vencimPH);
    if (!parsed) return false;
    const hoy = new Date();
    if (parsed.anio !== hoy.getFullYear()) return false;
    return parsed.mes === null || parsed.mes === hoy.getMonth() + 1;
};

export const phVencida = (ext: Extintor): boolean => {
    if (!estadoRequiereDatosPH(ext.estadoExtintor || "")) return false;
    const parsed = parseVencimPH(ext.vencimPH);
    if (!parsed) return false;
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;
    if (parsed.mes === null) return parsed.anio < anioActual;
    return parsed.anio < anioActual || (parsed.anio === anioActual && parsed.mes < mesActual);
};
