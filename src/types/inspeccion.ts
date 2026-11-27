export type EstadoItemInspeccion = "CONFORME" | "NECESITA CAMBIO" | "NO APLICA";

export type HallazgoInspeccion = { texto: string; recomendacion: string };

export type CampanaInspeccion = {
  id: string;
  empresaId: string;
  sedeId: string | null;
  periodo: string;
  estado: "abierta" | "cerrada";
  domicilio: string;
  actividadEconomica: string;
  responsableInspeccion: string;
  cargoInspector: string;
  nroTrabajadores: string;
  responsableAutorizacion: string;
  responsableSIG: string;
  responsableRegistro: string;
  cargoRegistro: string;
  creadoPor: string;
  cerradaEn: string | null;
  createdAt: string;
  empresaNombre: string;
  sedeNombre: string | null;
  total: number;
  inspeccionados: number;
  noEncontrados: number;
  conHallazgos: number;
};

export type ExtintorInspeccion = {
  uid: string;
  rowIndex: number;
  nSerie: string;
  nInterno: string;
  area: string;
  marca: string;
  fechaFabricacion: string;
  realizadoPH: string;
  mesRealizadoPH: string;
  vencimPH: string;
  agenteExtintor: string;
  peso: string;
  unidadPeso: string;
  estadoExtintor: string;
  sedeId: string | null;
};

export type RegistroInspeccion = {
  id: string;
  campanaId: string;
  extintorUid: string;
  estado: "inspeccionado" | "no_encontrado";
  manometro: string;
  pasador: string;
  manguera: string;
  tarjeta: string;
  tarjetaCoincide: boolean;
  proxRecarga: string;
  hallazgos: HallazgoInspeccion[] | null;
  observacion: string;
  levantado: boolean;
  usuarioNombre: string;
  inspeccionadoEn: string;
  fotos: string[];
  pendiente?: boolean;
};

export type DetalleInspeccion = {
  campana: CampanaInspeccion;
  extintores: ExtintorInspeccion[];
  registros: RegistroInspeccion[];
};
