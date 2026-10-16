import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { BACKEND_URL } from "../../../../config/backend";

export const SITIO_WEB = "https://extintoresfama.com";

export interface ProductoWebResumen {
  id: number;
  slug: string;
  name: string;
  sku: string | null;
  isActive: number;
  isFeatured: number;
  inStock: number;
  sortOrder: number;
  updatedAt: string;
  capacityValue: number | null;
  capacityUnit: string | null;
  marca: string | null;
  agente: string | null;
  categoria: string | null;
  imagen: string | null;
}

export interface ImagenWeb { src: string; alt?: string | null; width?: number | null; height?: number | null }

export interface ProductoWeb {
  id?: number;
  slug?: string;
  wcId?: number | null;
  name: string;
  sku: string | null;
  brandId: number | null;
  agentId: number | null;
  capacityRangeId: number | null;
  categoryId: number | null;
  ulRating: string | null;
  noConductor: string | null;
  testPressure: number | string | null;
  testPressureUnit: string | null;
  workingPressure: number | string | null;
  workingPressureUnit: string | null;
  capacityValue: number | string | null;
  capacityUnit: string | null;
  heightCm: number | string | null;
  widthCm: number | string | null;
  diameterCm: number | string | null;
  weight: string | null;
  reach: string | null;
  paint: string | null;
  finish: string | null;
  hoseLength: string | null;
  hoseResistance: string | null;
  ceilingInstall: string | null;
  extinctionRange: string | null;
  esClaseA: boolean; esClaseB: boolean; esClaseC: boolean; esClaseD: boolean; esClaseK: boolean;
  certificationsText: string | null;
  logoUl: boolean; logoAnsi: boolean; logoOsinergmin: boolean; logoIndeci: boolean; logoNfpa: boolean; logoFm: boolean;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  price: number | string | null;
  showPrice: boolean;
  inStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number | string | null;
  imagenes: ImagenWeb[];
  aplicaciones: number[];
}

export interface Taxonomias {
  marcas: { id: number; slug: string; name: string }[];
  agentes: { id: number; slug: string; name: string; short_name: string }[];
  capacidades: { id: number; slug: string; name: string; short_name: string }[];
  categorias: { id: number; slug: string; name: string }[];
  aplicaciones: { id: number; slug: string; name: string; icon: string | null }[];
}

export interface EstadoSitio {
  configurado: boolean;
  corriendo: boolean;
  ultimo: { fin: string; ok: boolean } | null;
  pendiente: boolean;
  log: string[];
}

export const productoVacio = (): ProductoWeb => ({
  name: "", sku: null, brandId: null, agentId: null, capacityRangeId: null, categoryId: null,
  ulRating: null, noConductor: null, testPressure: null, testPressureUnit: "PSI", workingPressure: null, workingPressureUnit: "PSI",
  capacityValue: null, capacityUnit: "lb", heightCm: null, widthCm: null, diameterCm: null, weight: null, reach: null,
  paint: null, finish: null, hoseLength: null, hoseResistance: null, ceilingInstall: null, extinctionRange: null,
  esClaseA: false, esClaseB: false, esClaseC: false, esClaseD: false, esClaseK: false,
  certificationsText: null, logoUl: false, logoAnsi: false, logoOsinergmin: false, logoIndeci: false, logoNfpa: false, logoFm: false,
  shortDescription: null, description: null, seoTitle: null, seoDescription: null,
  price: null, showPrice: false, inStock: true, isActive: true, isFeatured: false, sortOrder: null,
  imagenes: [], aplicaciones: [],
});

/** URL para ver una imagen del catálogo desde el sistema. */
export const urlImagen = (src: string | null | undefined) => {
  if (!src) return "";
  if (/^https?:/.test(src)) return src;
  if (src.startsWith("/media/")) return `${BACKEND_URL}/api${src}`;
  return SITIO_WEB + src;
};

export const emitir = <T,>(socket: Socket, evento: string, datos: unknown = {}, timeout = 30000) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("El servidor no respondió")), timeout);
    socket.emit(evento, datos, (res: any) => {
      clearTimeout(t);
      if (res?.success) resolve(res as T);
      else reject(new Error(res?.error || "Error del servidor"));
    });
  });

/** Convierte cualquier foto (JPG, PNG, WebP…) al formato de la tienda: WebP 800×1050 con fondo blanco. */
export async function prepararImagen(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("No se pudo leer la imagen"));
      i.src = url;
    });
    const W = 800, H = 1050, margen = 30;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    const escala = Math.min((W - margen * 2) / img.naturalWidth, (H - margen * 2) / img.naturalHeight);
    const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    const data = canvas.toDataURL("image/webp", 0.86);
    if (!data.startsWith("data:image/webp")) throw new Error("Este navegador no puede generar WebP; usa Chrome o Edge");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useProductosWeb(socket: Socket | null) {
  const [productos, setProductos] = useState<ProductoWebResumen[]>([]);
  const [taxonomias, setTaxonomias] = useState<Taxonomias | null>(null);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(() => {
    if (!socket) return;
    setLoading(true);
    emitir<{ productos: ProductoWebResumen[] }>(socket, "web:productos:list")
      .then((r) => setProductos(r.productos))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    cargar();
    emitir<Taxonomias>(socket, "web:productos:taxonomias").then(setTaxonomias).catch(() => {});
    socket.on("web:productos:changed", cargar);
    return () => { socket.off("web:productos:changed", cargar); };
  }, [socket, cargar]);

  return { productos, taxonomias, loading, recargar: cargar };
}

/** Estado de la publicación de la web y su registro en vivo. */
export function useSitioWeb(socket: Socket | null) {
  const [estado, setEstado] = useState<EstadoSitio | null>(null);
  useEffect(() => {
    if (!socket) return;
    emitir<{ estado: EstadoSitio }>(socket, "web:sitio:estado").then((r) => setEstado(r.estado)).catch(() => {});
    const onEstado = (d: { estado: EstadoSitio }) => setEstado(d.estado);
    const onLog = (d: { linea: string }) => setEstado((e) => (e ? { ...e, log: [...e.log.slice(-199), d.linea] } : e));
    socket.on("web:sitio:estado", onEstado);
    socket.on("web:sitio:log", onLog);
    return () => { socket.off("web:sitio:estado", onEstado); socket.off("web:sitio:log", onLog); };
  }, [socket]);
  const publicar = () => (socket ? emitir<{ estado: EstadoSitio }>(socket, "web:sitio:publicar").then((r) => setEstado(r.estado)) : Promise.resolve());
  return { estado, publicar };
}
