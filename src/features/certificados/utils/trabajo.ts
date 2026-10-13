import type { AccionTrabajo } from "../types";

export const ESTADO_NUEVO_VENTA = "Nuevo - Venta";

const ACCION_ORDEN: AccionTrabajo[] = ["venta", "recarga", "mantenimiento"];

const ACCION_ARTICULO: Record<AccionTrabajo, string> = {
  venta: "la venta",
  recarga: "la recarga",
  mantenimiento: "el mantenimiento",
};

const ACCION_NOMBRE: Record<AccionTrabajo, string> = {
  venta: "venta",
  recarga: "recarga",
  mantenimiento: "mantenimiento",
};

export const construirTextoAccion = (acciones: Record<AccionTrabajo, boolean>): string => {
  const seleccion = ACCION_ORDEN.filter((a) => acciones[a]);
  if (seleccion.length === 0) return ACCION_ARTICULO.recarga;
  const [primero, ...resto] = seleccion;
  if (resto.length === 0) return ACCION_ARTICULO[primero];
  const nombres = resto.map((a) => ACCION_NOMBRE[a]);
  if (nombres.length === 1) return `${ACCION_ARTICULO[primero]} y/o ${nombres[0]}`;
  const ultimo = nombres[nombres.length - 1];
  const previos = nombres.slice(0, -1);
  return `${ACCION_ARTICULO[primero]}, ${previos.join(", ")} y/o ${ultimo}`;
};
