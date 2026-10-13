const NOMBRE_BD = "fama-sin-senal";
const ALMACEN = "datos";

let conexion: Promise<IDBDatabase | null> | null = null;

const abrir = (): Promise<IDBDatabase | null> => {
  if (conexion) return conexion;
  conexion = new Promise((resolver) => {
    try {
      const solicitud = indexedDB.open(NOMBRE_BD, 1);
      solicitud.onupgradeneeded = () => solicitud.result.createObjectStore(ALMACEN);
      solicitud.onsuccess = () => resolver(solicitud.result);
      solicitud.onerror = () => resolver(null);
      solicitud.onblocked = () => resolver(null);
    } catch {
      resolver(null);
    }
  });
  return conexion;
};

export async function leerLocal<T>(clave: string): Promise<T | null> {
  const bd = await abrir();
  if (!bd) return null;
  return new Promise((resolver) => {
    try {
      const solicitud = bd.transaction(ALMACEN, "readonly").objectStore(ALMACEN).get(clave);
      solicitud.onsuccess = () => resolver((solicitud.result as T) ?? null);
      solicitud.onerror = () => resolver(null);
    } catch {
      resolver(null);
    }
  });
}

export async function guardarLocal(clave: string, valor: unknown): Promise<boolean> {
  const bd = await abrir();
  if (!bd) return false;
  return new Promise((resolver) => {
    try {
      const transaccion = bd.transaction(ALMACEN, "readwrite");
      transaccion.objectStore(ALMACEN).put(valor, clave);
      transaccion.oncomplete = () => resolver(true);
      transaccion.onerror = () => resolver(false);
      transaccion.onabort = () => resolver(false);
    } catch {
      resolver(false);
    }
  });
}

export async function borrarLocal(clave: string): Promise<void> {
  const bd = await abrir();
  if (!bd) return;
  await new Promise<void>((resolver) => {
    try {
      const transaccion = bd.transaction(ALMACEN, "readwrite");
      transaccion.objectStore(ALMACEN).delete(clave);
      transaccion.oncomplete = () => resolver();
      transaccion.onerror = () => resolver();
    } catch {
      resolver();
    }
  });
}
