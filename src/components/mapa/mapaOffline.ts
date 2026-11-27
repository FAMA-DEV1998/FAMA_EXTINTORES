import { aMundo, TAM_TESELA, type Limites } from "../../utils/geo";

export const CACHE_MAPA = "fama-mapa-v1";
export const ZOOM_MAX_TESELAS = 19;
export const ZOOM_MAX_VISTA = 21;
export const ATRIBUCION = "Imágenes © Esri, Maxar, Earthstar Geographics";
const CLAVE_ZONAS = "fama_mapas_descargados";
const MAX_TESELAS = 1500;

export const urlTesela = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

type Tesela = { z: number; x: number; y: number };

export const teselasDe = (limites: Limites, zMin: number, zMax: number): Tesela[] => {
  const lista: Tesela[] = [];
  for (let z = zMin; z <= zMax; z++) {
    const a = aMundo({ lat: limites.norte, lng: limites.oeste }, z);
    const b = aMundo({ lat: limites.sur, lng: limites.este }, z);
    const max = 2 ** z - 1;
    const x0 = Math.max(0, Math.floor(a.x / TAM_TESELA));
    const x1 = Math.min(max, Math.floor(b.x / TAM_TESELA));
    const y0 = Math.max(0, Math.floor(a.y / TAM_TESELA));
    const y1 = Math.min(max, Math.floor(b.y / TAM_TESELA));
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) lista.push({ z, x, y });
  }
  return lista;
};

export const planDescarga = (limites: Limites) => {
  let zMax = ZOOM_MAX_TESELAS;
  let teselas = teselasDe(limites, 14, zMax);
  while (teselas.length > MAX_TESELAS && zMax > 16) {
    zMax -= 1;
    teselas = teselasDe(limites, 14, zMax);
  }
  return { teselas, zMax, megas: Math.max(1, Math.round((teselas.length * 22) / 1024)) };
};

export type ZonaGuardada = { clave: string; nombre: string; limites: Limites; zMax: number; teselas: number; fecha: string };

export const zonasGuardadas = (): ZonaGuardada[] => {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_ZONAS) || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
};

export const zonaGuardada = (clave: string) => zonasGuardadas().find((z) => z.clave === clave) || null;

const guardarZona = (zona: ZonaGuardada) => {
  try {
    localStorage.setItem(CLAVE_ZONAS, JSON.stringify([zona, ...zonasGuardadas().filter((z) => z.clave !== zona.clave)].slice(0, 40)));
  } catch { }
};

export const mapaSinConexionDisponible = () => typeof caches !== "undefined" && !!navigator.serviceWorker?.controller;

export async function descargarZona(
  clave: string,
  nombre: string,
  limites: Limites,
  alAvanzar: (hechas: number, total: number) => void,
  senal: AbortSignal,
): Promise<{ ok: boolean; fallidas: number; total: number }> {
  if (typeof caches === "undefined") return { ok: false, fallidas: 0, total: 0 };
  const { teselas, zMax } = planDescarga(limites);
  const cache = await caches.open(CACHE_MAPA);
  let hechas = 0;
  let fallidas = 0;
  let indice = 0;
  const trabajar = async () => {
    while (indice < teselas.length && !senal.aborted) {
      const t = teselas[indice++];
      const url = urlTesela(t.z, t.x, t.y);
      try {
        if (!(await cache.match(url))) {
          const res = await fetch(url, { mode: "cors", credentials: "omit", signal: senal });
          if (res.ok) await cache.put(url, res);
          else fallidas += 1;
        }
      } catch {
        if (!senal.aborted) fallidas += 1;
      }
      hechas += 1;
      alAvanzar(hechas, teselas.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, trabajar));
  if (senal.aborted) return { ok: false, fallidas, total: teselas.length };
  guardarZona({ clave, nombre, limites, zMax, teselas: teselas.length, fecha: new Date().toISOString() });
  return { ok: fallidas < teselas.length * 0.1, fallidas, total: teselas.length };
}
