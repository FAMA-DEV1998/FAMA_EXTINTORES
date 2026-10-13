import { useState } from "react";

const leer = <T,>(clave: string, inicial: T): T => {
  try {
    const guardado = localStorage.getItem(clave);
    return guardado === null ? inicial : (JSON.parse(guardado) as T);
  } catch {
    return inicial;
  }
};

export function usePreferenciaLocal<T>(clave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => leer(clave, inicial));
  const actualizar = (nuevo: T) => {
    setValor(nuevo);
    try {
      localStorage.setItem(clave, JSON.stringify(nuevo));
    } catch {
      return;
    }
  };
  return [valor, actualizar] as const;
}
