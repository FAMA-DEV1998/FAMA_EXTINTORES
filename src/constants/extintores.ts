export const ESTADOS = ["Aprobado", "Nuevo - Venta", "Garantía", "De Baja"];

export const ESTADO_ORDEN_DEFAULT = ["Aprobado", "Nuevo - Venta", "Garantía", "De Baja"];

export const ESTADOS_SIN_SERVICIO = ["De Baja", "Garantía", "Nuevo - Venta"];

export const ESTADOS_SOLO_RECARGA = ["Nuevo - Venta"]

export const ESTADOS_SIN_SERVICIO_EXTRA = ["De Baja", "Garantía"];

export const ESTADOS_REQUIEREN_DATOS_PH = ["Aprobado", "Nuevo - Venta", "Garantía"];

export const PESOS_KG = ["1", "2", "4", "6", "9", "12", "25", "50", "75", "100"] as const;
export const PESOS_LB = ["5", "10", "15", "20", "25", "30", "125", "145"] as const;
export const PESOS_LT = ["1", "2", "2.5", "3", "4", "6", "9", "10", "12", "25", "50"] as const;
export const PESOS_GAL = ["1", "2", "2.5", "3", "5", "10", "15", "20", "25", "30", "55"] as const;

export const COMP_KEYS = ["valvula", "manguera", "manometro", "tobera"] as const;

export const COMP_LABELS: Record<string, string> = {
  valvula: "Válvula",
  manguera: "Manguera",
  manometro: "Manómetro",
  tobera: "Tobera",
};