import type { ExtintorFormData } from "../../../types";

export type SeccionVoz = "datos" | "tipo" | "servicio" | "piezas";

export const SECCION_DE_PASO: (SeccionVoz | null)[] = ["datos", "tipo", "servicio", "piezas", null];

export interface AlternativaVoz { valor: string; confianza: number }

export interface DeteccionVoz {
    campo: string;
    etiqueta: string;
    valor: string;
    cambios: Partial<ExtintorFormData>;
    textoOido: string;
    confianza: number;
    alternativas: AlternativaVoz[];
    tipoCorreccion: string | null;
}

export interface ResultadoVoz {
    texto: string;
    motor: "whisper" | "navegador";
    confianzaAudio: number | null;
    aviso: string | null;
    detecciones: DeteccionVoz[];
}

export interface EstadoServicioVoz { disponible: boolean; listo: boolean; cargando: boolean; error: string | null; modelo?: string | null; dispositivo?: string | null }

export interface CampoGuia { id: string; etiqueta: string; decir: string; nota?: string }

export const GUIA_SECCION: Record<SeccionVoz, { titulo: string; campos: CampoGuia[] }> = {
    datos: {
        titulo: "Datos de la etiqueta",
        campos: [
            { id: "nSerie", etiqueta: "N° Serie", decir: "Serie A B C 1 2 3", nota: "Letra por letra y número por número." },
            { id: "nInterno", etiqueta: "N° Interno", decir: "Interno T 0 4 5" },
            { id: "marca", etiqueta: "Marca", decir: "Marca Amerex" },
            { id: "fechaFabricacion", etiqueta: "Año de fabricación", decir: "Fabricación 2020" },
        ],
    },
    tipo: {
        titulo: "Tipo de extintor",
        campos: [
            { id: "estadoExtintor", etiqueta: "Estado", decir: "Estado aprobado" },
            { id: "agenteExtintor", etiqueta: "Agente", decir: "Agente PQS" },
            { id: "peso", etiqueta: "Peso", decir: "Peso 6 kilos", nota: "Di la unidad: kilos, libras, litros o galones." },
            { id: "motivoBaja", etiqueta: "Motivo de baja", decir: "Motivo abolladura", nota: "Solo se usa si el estado es De Baja." },
        ],
    },
    servicio: {
        titulo: "Servicio realizado",
        campos: [
            { id: "servicio", etiqueta: "Servicio", decir: "Servicio mantenimiento" },
            { id: "recarga", etiqueta: "Recarga", decir: "Recarga 75 por ciento" },
            { id: "phFecha", etiqueta: "PH realizado", decir: "PH realizado mayo 2021", nota: "Mes y año de la última prueba hidrostática." },
            { id: "servicioExtra", etiqueta: "Adicionales", decir: "Adicional soporte de pared", nota: "Puedes decir varios: «soporte de pared y señalización»." },
        ],
    },
    piezas: {
        titulo: "Piezas y observaciones",
        campos: [
            { id: "componentes", etiqueta: "Componentes instalados", decir: "Válvula sí, manguera no", nota: "También: «todos los componentes» o «sin tobera»." },
            { id: "observaciones", etiqueta: "Observaciones", decir: "Observaciones etiqueta despegada", nota: "Dilas al final: todo lo que sigue se copia tal cual." },
        ],
    },
};

export const normalizarVoz = (v: string): string =>
    (v || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9%.\s]/g, " ").replace(/\s+/g, " ").trim();
