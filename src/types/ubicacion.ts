export type LecturaGPS = {
  lat: number;
  lng: number;
  precision: number;
  altitud: number | null;
  precisionAltitud: number | null;
  muestras: number;
};

export type UbicacionActual = {
  id: string;
  lat: number;
  lng: number;
  precision: number;
  altitud: number | null;
  referencia: string;
  fotoId: string | null;
  origen: string;
  usuarioNombre: string;
  capturadaEn: string;
  lecturas: number;
  movido: { distancia: number; desde: string } | null;
  pendiente?: boolean;
};

export type LecturaHistorial = {
  id: string;
  lat: number;
  lng: number;
  precision: number;
  altitud: number | null;
  referencia: string;
  origen: string;
  usuarioNombre: string;
  capturadaEn: string;
  descartada: boolean;
  muestras: number;
  tieneFoto: boolean;
};

export type ExtintorUbicado = {
  uid: string;
  rowIndex: number;
  nSerie: string;
  nInterno: string;
  marca?: string;
  area?: string;
  estadoExtintor: string;
  agenteExtintor: string;
  peso: string;
  unidadPeso: string;
  sedeId: string | null;
  ubicacion: UbicacionActual | null;
};

export type ResumenUbicaciones = {
  empresaId: string;
  razonSocial: string;
  sedeId: string | null;
  sedeNombre: string | null;
  total: number;
  conUbicacion: number;
  ultima: string | null;
};
