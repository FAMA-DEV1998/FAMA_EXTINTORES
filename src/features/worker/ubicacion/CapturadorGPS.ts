import type { LecturaGPS } from "../../../types";
import { distanciaMetros } from "../../../utils/geo";

export type EstadoCaptura = "inactivo" | "buscando" | "mejorando" | "listo" | "sin-permiso" | "no-disponible";

export type ResumenCaptura = {
  estado: EstadoCaptura;
  lectura: LecturaGPS | null;
  ultimaPrecision: number | null;
  muestras: number;
};

type Muestra = { lat: number; lng: number; precision: number; altitud: number | null; precisionAltitud: number | null; t: number };

const PRECISION_MAXIMA = 150;
const VELOCIDAD_QUIETO = 1.5;
const VENTANA_MS = 120_000;
const PRECISION_OBJETIVO = 4;
const MUESTRAS_OBJETIVO = 12;

export class CapturadorGPS {
  private vigilancia: number | null = null;
  private corte: ReturnType<typeof setTimeout> | null = null;
  private muestras: Muestra[] = [];
  private inicio = 0;
  private estado: EstadoCaptura = "inactivo";
  private ultimaPrecision: number | null = null;
  private cache: ResumenCaptura | null = null;
  private alCambiar: () => void;

  constructor(alCambiar: () => void) {
    this.alCambiar = alCambiar;
  }

  iniciar() {
    this.detener();
    this.muestras = [];
    this.inicio = Date.now();
    if (!("geolocation" in navigator)) {
      this.cambiar("no-disponible");
      return;
    }
    this.cambiar("buscando");
    this.vigilancia = navigator.geolocation.watchPosition(this.alRecibir, this.alFallar, { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 });
    this.corte = setTimeout(() => this.detener(), VENTANA_MS);
  }

  detener() {
    if (this.vigilancia !== null) navigator.geolocation.clearWatch(this.vigilancia);
    this.vigilancia = null;
    if (this.corte) clearTimeout(this.corte);
    this.corte = null;
    if (this.estado === "buscando" || this.estado === "mejorando") this.cambiar(this.muestras.length > 0 ? "listo" : "inactivo");
  }

  get activo() {
    return this.vigilancia !== null;
  }

  resumen(): ResumenCaptura {
    if (!this.cache) {
      this.cache = { estado: this.estado, lectura: this.lectura(), ultimaPrecision: this.ultimaPrecision, muestras: this.muestras.length };
    }
    return this.cache;
  }

  lectura(): LecturaGPS | null {
    if (this.muestras.length === 0) return null;
    const mejor = Math.min(...this.muestras.map((m) => m.precision));
    let candidatas = this.muestras.filter((m) => m.precision <= Math.max(mejor * 2, mejor + 5));
    let centro = promedio(candidatas);
    const consistentes = candidatas.filter((m) => distanciaMetros(m, centro) <= Math.max(3, m.precision * 2.5));
    if (consistentes.length > 0 && consistentes.length < candidatas.length) {
      candidatas = consistentes;
      centro = promedio(candidatas);
    }
    const n = candidatas.length;
    const precision = Math.max(2, mejor * (n >= 8 ? 0.75 : n >= 3 ? 0.9 : 1));
    const conAltitud = candidatas.filter((m) => m.altitud !== null);
    const altitud = conAltitud.length ? conAltitud.reduce((s, m) => s + (m.altitud as number), 0) / conAltitud.length : null;
    const precisionAltitud = conAltitud.length ? Math.min(...conAltitud.map((m) => m.precisionAltitud ?? 999)) : null;
    return {
      lat: centro.lat,
      lng: centro.lng,
      precision: Math.round(precision * 10) / 10,
      altitud: altitud === null ? null : Math.round(altitud * 10) / 10,
      precisionAltitud: precisionAltitud === null || precisionAltitud === 999 ? null : Math.round(precisionAltitud),
      muestras: n,
    };
  }

  private alRecibir = (pos: GeolocationPosition) => {
    const c = pos.coords;
    this.ultimaPrecision = c.accuracy;
    if (pos.timestamp < this.inicio - 1000) return this.cambiar(this.estado);
    if (!Number.isFinite(c.accuracy) || c.accuracy > PRECISION_MAXIMA) return this.cambiar(this.estado);
    if (typeof c.speed === "number" && c.speed > VELOCIDAD_QUIETO) return this.cambiar(this.estado);
    this.muestras.push({ lat: c.latitude, lng: c.longitude, precision: c.accuracy, altitud: c.altitude, precisionAltitud: c.altitudeAccuracy, t: pos.timestamp });
    if (this.muestras.length > 120) this.muestras.shift();
    const lectura = this.lectura();
    if (lectura && lectura.precision <= PRECISION_OBJETIVO && lectura.muestras >= MUESTRAS_OBJETIVO) {
      this.detener();
      this.cambiar("listo");
      return;
    }
    this.cambiar("mejorando");
  };

  private alFallar = (err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      this.detener();
      this.cambiar("sin-permiso");
    }
  };

  private cambiar(estado: EstadoCaptura) {
    this.estado = estado;
    this.cache = null;
    this.alCambiar();
  }
}

const promedio = (lista: Muestra[]) => {
  let peso = 0;
  let lat = 0;
  let lng = 0;
  for (const m of lista) {
    const w = 1 / Math.max(1, m.precision) ** 2;
    peso += w;
    lat += m.lat * w;
    lng += m.lng * w;
  }
  return { lat: lat / peso, lng: lng / peso };
};
