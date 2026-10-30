const CONFIG_URL: string = import.meta.env.VITE_CONFIG_URL || "https://extintoresfama.com/api-config.json";
const CLAVE = "fama_backend_url";
const DEV_URL = `http://${window.location.hostname}:3002`;
const PERMITIDA = /^https:\/\/([a-z0-9-]+\.trycloudflare\.com|([a-z0-9-]+\.)*extintoresfama\.com)$/;

const guardada = () => {
  try { return localStorage.getItem(CLAVE) || ""; } catch { return ""; }
};

export let BACKEND_URL: string = import.meta.env.DEV
  ? import.meta.env.VITE_BACKEND_URL || DEV_URL
  : guardada() || import.meta.env.VITE_BACKEND_URL || "";

export async function cargarBackendUrl(): Promise<boolean> {
  if (import.meta.env.DEV && !import.meta.env.VITE_CONFIG_URL) return false;
  try {
    const r = await fetch(CONFIG_URL, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!r.ok) return false;
    const url = String((await r.json())?.sistemaUrl || "").replace(/\/$/, "");
    if (!PERMITIDA.test(url) || url === BACKEND_URL) return false;
    BACKEND_URL = url;
    try { localStorage.setItem(CLAVE, url); } catch {  }
    return true;
  } catch {
    return false;
  }
}
