export const URL_EXTINTOR_PUBLICO = `${(import.meta.env.VITE_URL_WEB || "https://extintoresfama.com").replace(/\/$/, "")}/e/`;

const UUID = /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i;

export const enlaceExtintor = (uid: string): string => `${URL_EXTINTOR_PUBLICO}?${uid.replace(/-/g, "").toLowerCase()}`;

export function uidDesdeQR(texto: string): string {
    const limpio = texto.trim();
    const m = limpio.match(UUID);
    if (!m) return limpio;
    const h = m[0].replace(/-/g, "").toLowerCase();
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
