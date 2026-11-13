export interface Microfono { id: string; nombre: string; externo: boolean }

export const MIC_AUTOMATICO = "auto";
const CLAVE = "fama_voz_microfono";
const VIRTUALES = new Set(["default", "communications", ""]);
const EXTERNO = /usb|headset|auricular|aud[ií]fono|manos libres|bluetooth|\bbt\b|wired|cable|extern|lavalier|solapa|lapel|rode|boya|hollyland|\bdji\b|airpods|buds|jabra|shure|blue yeti|fifine|maono|sennheiser|logitech/i;
const INTERNO = /integrad|built.?in|internal|interno|predeterminad|speakerphone|altavoz|tel[eé]fono|phone|bottom|inferior|superior|\btop\b|\bback\b|\bfront\b|trasero|frontal|array|realtek|high definition audio|conexant|smart sound|intel/i;

export const esExterno = (nombre: string) => EXTERNO.test(nombre) || (!!nombre && !INTERNO.test(nombre));

export function leerElegido(): string {
    try { return localStorage.getItem(CLAVE) || MIC_AUTOMATICO; } catch { return MIC_AUTOMATICO; }
}

export function guardarElegido(id: string) {
    try { localStorage.setItem(CLAVE, id); } catch { return; }
}

export async function listarMicrofonos(): Promise<Microfono[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    const vistos = new Set<string>();
    return dispositivos
        .filter((d) => d.kind === "audioinput" && !VIRTUALES.has(d.deviceId))
        .filter((d) => (vistos.has(d.groupId + d.label) ? false : (vistos.add(d.groupId + d.label), true)))
        .map((d, i) => ({ id: d.deviceId, nombre: d.label || `Micrófono ${i + 1}`, externo: esExterno(d.label) }));
}

export function escoger(lista: Microfono[], elegido: string): Microfono | null {
    if (elegido !== MIC_AUTOMATICO) {
        const fijo = lista.find((m) => m.id === elegido);
        if (fijo) return fijo;
    }
    return lista.find((m) => EXTERNO.test(m.nombre)) ?? lista.find((m) => m.externo) ?? null;
}

const restricciones = (m: Microfono | null): MediaTrackConstraints => ({
    ...(m ? { deviceId: { exact: m.id } } : {}),
    echoCancellation: !m?.externo,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
});

export async function abrirMicrofono(elegido: string): Promise<{ stream: MediaStream; microfono: Microfono | null; lista: Microfono[] }> {
    let lista = await listarMicrofonos();
    if (!lista.length || lista.every((m) => !m.nombre || m.nombre.startsWith("Micrófono "))) {
        const permiso = await navigator.mediaDevices.getUserMedia({ audio: true });
        permiso.getTracks().forEach((t) => t.stop());
        lista = await listarMicrofonos();
    }
    const microfono = escoger(lista, elegido);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: restricciones(microfono) });
        return { stream, microfono: microfono ?? nombreEnUso(stream, lista), lista };
    } catch (e) {
        if (!microfono) throw e;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: restricciones(null) });
        return { stream, microfono: nombreEnUso(stream, lista), lista };
    }
}

function nombreEnUso(stream: MediaStream, lista: Microfono[]): Microfono | null {
    const pista = stream.getAudioTracks()[0];
    const id = pista?.getSettings().deviceId;
    return lista.find((m) => m.id === id) ?? (pista?.label ? { id: id || "", nombre: pista.label, externo: esExterno(pista.label) } : null);
}
