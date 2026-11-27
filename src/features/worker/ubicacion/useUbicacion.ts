import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { rastreoUbicacion } from "./rastreoUbicacion";

export const useRastreoUbicacion = () => useSyncExternalStore(rastreoUbicacion.suscribir, rastreoUbicacion.resumen);

export type PosicionEnVivo = { lat: number; lng: number; precision: number; t: number };

export function usePosicionEnVivo(activo: boolean) {
  const [posicion, setPosicion] = useState<PosicionEnVivo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
    if (!("geolocation" in navigator)) {
      setError("Este teléfono no tiene GPS disponible en el navegador.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setError(null);
        setPosicion((previa) => {
          const nueva = { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy, t: p.timestamp };
          if (previa && Date.now() - previa.t < 4000 && nueva.precision > previa.precision * 2.5) return previa;
          return nueva;
        });
      },
      (e) => setError(e.code === e.PERMISSION_DENIED ? "Sin permiso de ubicación. Actívalo en los ajustes del navegador." : "Buscando señal GPS…"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [activo]);

  return { posicion, error };
}

type OrientacionIOS = DeviceOrientationEvent & { webkitCompassHeading?: number };
type ConstructorOrientacion = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export function useBrujula(activo: boolean) {
  const [rumbo, setRumbo] = useState<number | null>(null);
  const [necesitaPermiso, setNecesitaPermiso] = useState(
    () => typeof DeviceOrientationEvent !== "undefined" && typeof (DeviceOrientationEvent as ConstructorOrientacion).requestPermission === "function",
  );

  useEffect(() => {
    if (!activo || necesitaPermiso || typeof window === "undefined") return;
    let ultimo = 0;
    const alGirar = (e: Event) => {
      const ev = e as OrientacionIOS;
      const ahora = Date.now();
      if (ahora - ultimo < 120) return;
      let valor: number | null = null;
      if (typeof ev.webkitCompassHeading === "number") valor = ev.webkitCompassHeading;
      else if (ev.absolute && typeof ev.alpha === "number") valor = 360 - ev.alpha;
      if (valor === null) return;
      ultimo = ahora;
      const pantalla = (screen.orientation?.angle ?? 0) % 360;
      setRumbo(((valor + pantalla) % 360 + 360) % 360);
    };
    window.addEventListener("deviceorientationabsolute", alGirar);
    window.addEventListener("deviceorientation", alGirar);
    return () => {
      window.removeEventListener("deviceorientationabsolute", alGirar);
      window.removeEventListener("deviceorientation", alGirar);
    };
  }, [activo, necesitaPermiso]);

  const pedirPermiso = useCallback(async () => {
    const C = DeviceOrientationEvent as ConstructorOrientacion;
    try {
      const r = await C.requestPermission?.();
      if (r === "granted") setNecesitaPermiso(false);
    } catch { }
  }, []);

  return { rumbo, necesitaPermiso, pedirPermiso };
}
