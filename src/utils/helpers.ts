import type { FormData, EmpresaData, Extintor } from "../types";
import { ESTADO_ORDEN_DEFAULT, ESTADOS_SIN_SERVICIO } from "../constants/extintores";

export const emptyForm = (): FormData => ({
    nSerie: "", nInterno: "", marca: "", fechaFabricacion: "", realizadoPH: "",
    vencimPH: "", estadoExtintor: "", agenteExtintor: "", peso: "", unidadPeso: "KG",
    ma: false, recarga: "", ph: false, valvula: "", manguera: "", manometro: "",
    tobera: "", observaciones: "", servicioExtra: "", motivoBaja: "", evidencias: [],
});

export const emptyEmpresa = (): EmpresaData => ({
    razonSocial: "", direccion: "", distrito: "", ruc: "", nombresApellidos: "",
    celular: "", nOrdenTrabajo: "", fechaRetiro: "", fechaEntrega: "",
    weightOrder: [], estadoOrder: [], agenteOrder: [],
});

export const emptyExtintor = (): Partial<Extintor> => ({
    nSerie: "", nInterno: "", marca: "", fechaFabricacion: "",
    realizadoPH: "", vencimPH: "", estadoExtintor: "", agenteExtintor: "",
    peso: "", unidadPeso: "KG", ma: "", recarga: "", ph: "",
    valvula: "", manguera: "", manometro: "", tobera: "", observaciones: "", servicioExtra: "", motivoBaja: "",
    evidencia: "[]"
});

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

export const downloadBase64 = (b64: string, fileName: string, mimeType: string) => {
    const byteChars = atob(b64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Comprime una imagen capturada de la cámara a JPEG de baja calidad/tamaño.
 * Devuelve un base64 string (sin el prefijo data:image/...).
 * maxWidth controla la resolución máxima. quality controla la calidad JPEG (0-1).
 */
export const compressImage = (
    file: File | Blob,
    maxWidth = 800,
    quality = 0.5
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let w = img.width;
                let h = img.height;

                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject(new Error("No canvas context"));
                ctx.drawImage(img, 0, 0, w, h);

                // Obtener JPEG comprimido como base64
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                // Quitar el prefijo "data:image/jpeg;base64,"
                const b64 = dataUrl.split(",")[1];
                resolve(b64);
            };
            img.onerror = () => reject(new Error("Error cargando imagen"));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Error leyendo archivo"));
        reader.readAsDataURL(file);
    });
};

/**
 * Convierte un base64 JPEG comprimido a PNG para descarga de alta calidad.
 */
export const downloadEvidenciaAsPng = (b64Jpeg: string, fileName: string) => {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, "image/png");
    };
    img.src = `data:image/jpeg;base64,${b64Jpeg}`;
};

/**
 * Convierte un string de peso ("25 KG", "10 LB", etc.) a su equivalente en KG
 * para poder compararlos numéricamente.
 */
export const getWeightInKg = (weightStr: string) => {
    if (!weightStr || weightStr === "Sin definir") return 999999; // Los vacíos van al final
    const match = weightStr.match(/([\d.]+)\s*(KG|LBS?|LT|GAL)/i);
    if (!match) return 999999;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit.startsWith("LB")) return val * 0.453592;
    if (unit === "GAL") return val * 3.785;
    return val;
};

/**
 * Devuelve la prioridad de un estado según el orden lógico por defecto
 * (Aprobado > Nuevo > Garantía > De Baja). Estados no reconocidos van al final.
 * Es el equivalente de getWeightInKg pero para Estado.
 */
export const getEstadoPrioridad = (estado: string) => {
    const idx = ESTADO_ORDEN_DEFAULT.indexOf(estado);
    return idx === -1 ? 999 : idx;
};

/**
 * Indica si, dado el Estado del extintor, no se permite registrar ningún servicio
 * (MA, PH o Recarga). La lista de estados restringidos es configurable en
 * constants/extintores.ts (ESTADOS_SIN_SERVICIO).
 */
export const estadoBloqueaServicio = (estado: string): boolean => {
    return ESTADOS_SIN_SERVICIO.includes(estado);
};

/**
 * Indica si un extintor tiene información incompleta: sin Marca, sin Agente,
 * sin Peso, o sin ningún Servicio registrado (MA, PH o Recarga).
 */
export const esExtintorIncompleto = (ext: Extintor): boolean => {
    const sinMarca = !ext.marca || !ext.marca.trim();
    const sinAgente = !ext.agenteExtintor || !ext.agenteExtintor.trim();
    const sinPeso = !ext.peso || !String(ext.peso).trim();

    // El Servicio Realizado solo es obligatorio cuando el Estado permite registrar
    // servicios. Si el estado está en ESTADOS_SIN_SERVICIO (configurable), no se
    // exige y no cuenta como información incompleta.
    const serviceRequerido = !estadoBloqueaServicio(ext.estadoExtintor || "");
    const sinServicio = serviceRequerido && ext.ma !== "SI" && ext.ph !== "SI" && !ext.recarga;

    return sinMarca || sinAgente || sinPeso || sinServicio;
};

/**
 * Devuelve la lista de campos faltantes de un extintor, para mostrarlos en la
 * tarjeta (ej.: ["Marca", "Peso"]). Usa la misma regla que esExtintorIncompleto
 * (Servicio solo se exige si el Estado permite registrar servicios).
 */
export const getCamposFaltantes = (ext: Extintor): string[] => {
    const faltantes: string[] = [];

    if (!ext.marca || !ext.marca.trim()) faltantes.push("Marca");
    if (!ext.agenteExtintor || !ext.agenteExtintor.trim()) faltantes.push("Agente");
    if (!ext.peso || !String(ext.peso).trim()) faltantes.push("Peso");

    const serviceRequerido = !estadoBloqueaServicio(ext.estadoExtintor || "");
    if (serviceRequerido && ext.ma !== "SI" && ext.ph !== "SI" && !ext.recarga) {
        faltantes.push("Servicio");
    }

    return faltantes;
};

/**
 * Ordena una lista de extintores replicando EXACTAMENTE el criterio del Dashboard:
 * Estado > Agente > Peso > Marca (agrupada por cantidad) > N° Serie > N° Interno.
 * El Dashboard es la fuente de la verdad: los arreglos weightOrder/estadoOrder/agenteOrder
 * se guardan en la Empresa y deben aplicarse igual en Workers.
 *
 * @param list Lista a ordenar (puede venir ya filtrada por búsqueda)
 * @param countsSourceList Lista sobre la que se calculan los conteos marca+peso
 *        (usar SIEMPRE la lista completa de extintores de la empresa, no la filtrada)
 */
export const sortExtintoresPersonalizado = (
    list: Extintor[],
    weightOrder: string[] = [],
    estadoOrder: string[] = [],
    agenteOrder: string[] = [],
    countsSourceList: Extintor[] = list
): Extintor[] => {
    const marcaPesoCounts: Record<string, number> = {};
    countsSourceList.forEach((e) => {
        const p = e.peso ? `${e.peso} ${e.unidadPeso}` : "Sin definir";
        const m = e.marca || "Sin definir";
        const key = `${p}|${m}`;
        marcaPesoCounts[key] = (marcaPesoCounts[key] || 0) + 1;
    });

    return [...list].sort((a, b) => {
        if (estadoOrder.length > 0) {
            const valA = a.estadoExtintor || "Sin definir";
            const valB = b.estadoExtintor || "Sin definir";
            const idxA = estadoOrder.indexOf(valA);
            const idxB = estadoOrder.indexOf(valB);
            if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
            if (idxA !== -1 && idxB === -1) return -1;
            if (idxB !== -1 && idxA === -1) return 1;
        }

        if (agenteOrder.length > 0) {
            const valA = a.agenteExtintor || "Sin definir";
            const valB = b.agenteExtintor || "Sin definir";
            const idxA = agenteOrder.indexOf(valA);
            const idxB = agenteOrder.indexOf(valB);
            if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
            if (idxA !== -1 && idxB === -1) return -1;
            if (idxB !== -1 && idxA === -1) return 1;
        }

        if (weightOrder.length > 0) {
            const valA = a.peso ? `${a.peso} ${a.unidadPeso}` : "Sin definir";
            const valB = b.peso ? `${b.peso} ${b.unidadPeso}` : "Sin definir";
            const idxA = weightOrder.indexOf(valA);
            const idxB = weightOrder.indexOf(valB);
            if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
            if (idxA !== -1 && idxB === -1) return -1;
            if (idxB !== -1 && idxA === -1) return 1;
        }

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

/**
 * Devuelve las opciones de Recarga permitidas según el Agente seleccionado:
 * - Agente = PQS  → solo recargas con porcentaje (ej. "75% NACIONAL", "90% UL")
 * - Agente ≠ PQS  → solo recargas sin porcentaje (ej. "OTROS")
 * Se basa en si el valor del catálogo contiene un dígito, para funcionar
 * dinámicamente sin importar el texto exacto configurado en el catálogo.
 */
export const getRecargasPermitidas = (agenteExtintor: string, recargasDisponibles: string[]): string[] => {
    const esPQS = (agenteExtintor || "").trim().toUpperCase() === "PQS";
    return recargasDisponibles.filter((r) => {
        const tienePorcentaje = /\d/.test(r);
        return esPQS ? tienePorcentaje : !tienePorcentaje;
    });
};