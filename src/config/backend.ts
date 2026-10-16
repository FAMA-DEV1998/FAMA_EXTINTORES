/**
 * Dirección del backend.
 *
 * El servidor usa túneles gratuitos de Cloudflare cuya dirección cambia cada vez
 * que se enciende. CONECTAR_INTERNET.bat la publica en
 * https://extintoresfama.com/api-config.json (campo "sistemaUrl") y la app la lee
 * al abrirse: ya no hace falta cambiar VITE_BACKEND_URL en Vercel ni volver a desplegar.
 *
 * Orden: api-config.json → última dirección que funcionó (sin internet) → VITE_BACKEND_URL.
 * En desarrollo (npm run dev) se usa el backend local, salvo que se defina VITE_BACKEND_URL.
 */
const CONFIG_URL: string = import.meta.env.VITE_CONFIG_URL || "https://extintoresfama.com/api-config.json";
const CLAVE = "fama_backend_url";
const DEV_URL = `http://${window.location.hostname}:3002`;
// Solo se aceptan direcciones de Cloudflare o del dominio propio (evita redirecciones maliciosas)
const PERMITIDA = /^https:\/\/([a-z0-9-]+\.trycloudflare\.com|([a-z0-9-]+\.)*extintoresfama\.com)$/;

const guardada = () => {
  try { return localStorage.getItem(CLAVE) || ""; } catch { return ""; }
};

export let BACKEND_URL: string = import.meta.env.DEV
  ? import.meta.env.VITE_BACKEND_URL || DEV_URL
  : guardada() || import.meta.env.VITE_BACKEND_URL || "";

/** Consulta la dirección actual del servidor. Devuelve true si cambió. */
export async function cargarBackendUrl(): Promise<boolean> {
  if (import.meta.env.DEV && !import.meta.env.VITE_CONFIG_URL) return false;
  try {
    const r = await fetch(CONFIG_URL, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!r.ok) return false;
    const url = String((await r.json())?.sistemaUrl || "").replace(/\/$/, "");
    if (!PERMITIDA.test(url) || url === BACKEND_URL) return false;
    BACKEND_URL = url;
    try { localStorage.setItem(CLAVE, url); } catch { /* modo privado */ }
    return true;
  } catch {
    return false; // sin internet: se sigue con la última dirección conocida
  }
}
