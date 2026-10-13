import type { Extintor, Servicio } from "../types";

export const serviciosDelExtintor = (servicios: Servicio[], uid: string): Servicio[] => {
    return servicios
        .filter((s) => s.extintorUids.includes(uid))
        .sort((a, b) => (a.fechaRetiro || "").localeCompare(b.fechaRetiro || ""));
};

const ORDINALES_SERVICIO = ["Primer", "Segundo", "Tercer", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo"];

const ORDINALES_TRASLADO = ["Primero", "Segundo", "Tercer", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo"];

export const ordinalServicio = (n: number): string => ORDINALES_SERVICIO[n - 1] || `${n}.º`;

export const ordinalTraslado = (n: number): string => ORDINALES_TRASLADO[n - 1] || `${n}.º`;

export const getSnapshotHastaFecha = (
    servicios: Servicio[],
    uid: string,
    fechaLimite?: string
): Partial<Extintor> | null => {
    const candidatos = servicios
        .filter((s) => s.extintorUids.includes(uid) && s.extintorEstados?.[uid])
        .filter((s) => fechaLimite === undefined || (s.fechaRetiro || "") <= fechaLimite)
        .sort((a, b) => (b.fechaRetiro || "").localeCompare(a.fechaRetiro || ""));
    return candidatos.length > 0 ? candidatos[0].extintorEstados![uid] : null;
};

export const CAMPOS_HISTORIAL_EXTINTOR: { key: keyof Extintor; label: string; grupo: string }[] = [
    { key: "nSerie", label: "N° Serie", grupo: "Identificación" },
    { key: "estadoExtintor", label: "Estado", grupo: "Estado" },
    { key: "ma", label: "Mantenimiento (MA)", grupo: "Servicio" },
    { key: "ph", label: "Prueba Hidrostática (PH)", grupo: "Servicio" },
    { key: "recarga", label: "Recarga", grupo: "Servicio" },
    { key: "realizadoPH", label: "PH Realizado", grupo: "Prueba Hidrostática" },
    { key: "vencimPH", label: "Vencimiento PH", grupo: "Prueba Hidrostática" },
    { key: "valvula", label: "Válvula", grupo: "Componentes" },
    { key: "manguera", label: "Manguera", grupo: "Componentes" },
    { key: "manometro", label: "Manómetro", grupo: "Componentes" },
    { key: "tobera", label: "Tobera", grupo: "Componentes" },
    { key: "servicioExtra", label: "Servicio Extra", grupo: "Adicionales" },
    { key: "motivoBaja", label: "Motivo de Baja", grupo: "Adicionales" },
    { key: "observaciones", label: "Observaciones", grupo: "Adicionales" },
];

const formatValorHistorial = (v: any): string => {
    if (v === "" || v === null || v === undefined) return "—";
    if (v === true || v === "SI") return "Sí";
    if (v === false) return "No";
    return String(v);
};

export const diffSnapshots = (
    anterior: Partial<Extintor> | null,
    actual: Partial<Extintor>
): { campo: string; grupo: string; anterior: string; nuevo: string }[] => {
    const cambios: { campo: string; grupo: string; anterior: string; nuevo: string }[] = [];
    for (const { key, label, grupo } of CAMPOS_HISTORIAL_EXTINTOR) {
        const valAnterior = anterior ? (anterior as any)[key] : undefined;
        const valNuevo = (actual as any)[key];
        if (String(valAnterior ?? "") !== String(valNuevo ?? "")) {
            if (valNuevo === undefined && valAnterior === undefined) continue;
            cambios.push({ campo: label, grupo, anterior: formatValorHistorial(valAnterior), nuevo: formatValorHistorial(valNuevo) });
        }
    }
    return cambios;
};

export const agruparCambios = (
    cambios: { campo: string; grupo: string; anterior: string; nuevo: string }[]
): { grupo: string; items: { campo: string; anterior: string; nuevo: string }[] }[] => {
    const ordenGrupos = [...new Set(CAMPOS_HISTORIAL_EXTINTOR.map((c) => c.grupo))];
    return ordenGrupos
        .map((grupo) => ({ grupo, items: cambios.filter((c) => c.grupo === grupo) }))
        .filter((g) => g.items.length > 0);
};
