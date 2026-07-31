export const ESTADOS = ["Aprobado", "Nuevo - Venta", "Garantía", "De Baja"];

// Secuencia lógica usada para el orden automático (igual sistema que Peso)
export const ESTADO_ORDEN_DEFAULT = ["Aprobado", "Nuevo - Venta", "Garantía", "De Baja"];

// Estados en los que NO se permite registrar ningún servicio (MA, PH, Recarga).
// Para agregar/quitar un estado restringido en el futuro, solo se edita este arreglo.
export const ESTADOS_SIN_SERVICIO = ["De Baja", "Garantía", "Nuevo - Venta"];

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