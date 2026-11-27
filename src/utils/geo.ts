export type Punto = { lat: number; lng: number };

const RADIO_TIERRA = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;
const grados = (r: number) => (r * 180) / Math.PI;

export const distanciaMetros = (a: Punto, b: Punto) => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const rumboGrados = (desde: Punto, hacia: Punto) => {
  const y = Math.sin(rad(hacia.lng - desde.lng)) * Math.cos(rad(hacia.lat));
  const x = Math.cos(rad(desde.lat)) * Math.sin(rad(hacia.lat)) - Math.sin(rad(desde.lat)) * Math.cos(rad(hacia.lat)) * Math.cos(rad(hacia.lng - desde.lng));
  return (grados(Math.atan2(y, x)) + 360) % 360;
};

const PUNTOS_CARDINALES = ["norte", "noreste", "este", "sureste", "sur", "suroeste", "oeste", "noroeste"];
export const cardinal = (rumbo: number) => PUNTOS_CARDINALES[Math.round(((rumbo % 360) + 360) % 360 / 45) % 8];

export const formatearDistancia = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);

export const formatearPrecision = (m: number) => `±${m < 10 ? m.toFixed(m < 3 ? 1 : 0) : Math.round(m)} m`;

export const calidadPrecision = (m: number): "alta" | "media" | "baja" => (m <= 8 ? "alta" : m <= 25 ? "media" : "baja");

export const TAM_TESELA = 256;

export const aMundo = (p: Punto, zoom: number) => {
  const escala = TAM_TESELA * 2 ** zoom;
  const s = Math.min(Math.max(Math.sin(rad(p.lat)), -0.9999), 0.9999);
  return { x: ((p.lng + 180) / 360) * escala, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * escala };
};

export const desdeMundo = (x: number, y: number, zoom: number): Punto => {
  const escala = TAM_TESELA * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * y) / escala;
  return { lat: grados(Math.atan(Math.sinh(n))), lng: (x / escala) * 360 - 180 };
};

export const metrosPorPixel = (lat: number, zoom: number) => (Math.cos(rad(lat)) * 2 * Math.PI * RADIO_TIERRA) / (TAM_TESELA * 2 ** zoom);

export type Limites = { norte: number; sur: number; este: number; oeste: number };

export const limitesDe = (puntos: Punto[], margenMetros = 0): Limites | null => {
  if (puntos.length === 0) return null;
  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  const centroLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const dLat = margenMetros / 111320;
  const dLng = margenMetros / (111320 * Math.max(0.1, Math.cos(rad(centroLat))));
  return { norte: Math.max(...lats) + dLat, sur: Math.min(...lats) - dLat, este: Math.max(...lngs) + dLng, oeste: Math.min(...lngs) - dLng };
};

export const haceCuanto = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `hace ${d} día${d === 1 ? "" : "s"}`;
  const meses = Math.round(d / 30.4);
  if (meses < 12) return `hace ${meses} mes${meses === 1 ? "" : "es"}`;
  const anios = Math.round(meses / 12);
  return `hace ${anios} año${anios === 1 ? "" : "s"}`;
};
