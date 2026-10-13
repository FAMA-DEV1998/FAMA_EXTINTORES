export type TipoCertificado = "garantia" | "ph";

export type TipoIdentificacion = "ruc" | "dni" | "placa";

export type Denominacion = "portatiles_rodantes" | "portatiles" | "rodantes" | "extintores";

export interface CertificadoItem {
  uid: string;
  item: string;
  serie: string;
  nInterno: string;
  marca: string;
  tipo: string;
  capacidad: string;
  tipoServicio: string;
  estanqueidad: string;
  vencimientoRecarga: string;
  anioFabricacion: string;
  realizadoPH: string;
  vencimientoPH: string;
  presionPSI: string;
  rating: string;
  condicion: string;
}

export interface CertificadoColumnas {
  item: boolean;
  nInterno: boolean;
  marca: boolean;
  tipoServicio: boolean;
  rating: boolean;
}

export interface CertificadoDatos {
  tipoCertificado: TipoCertificado;
  denominacion: Denominacion;
  tipoIdentificacion: TipoIdentificacion;
  nombre: string;
  numeroIdentificacion: string;
  dniAdicional: string;
  ubicacion: string;
  distrito: string;
  diaFecha: string;
  mesFecha: string;
  anioFecha: string;
  agentesTexto: string;
  agentesTextoCorto: string;
  items: CertificadoItem[];
  columnas: CertificadoColumnas;
  accionesTrabajo: { venta: boolean; recarga: boolean; mantenimiento: boolean };
  textoAccion: string;
  etiquetasAdicionales: string[];
  parrafoPersonalizado?: string;
  segmentosSincronizados?: Record<string, string>;
  parrafosPorTipo?: Partial<Record<TipoCertificado, { texto: string; segmentos: Record<string, string> }>>;
}

export type PqsVariante = "75_solo" | "90_certificado_ul";

export type AccionTrabajo = "venta" | "recarga" | "mantenimiento";

export interface HojaMeta {
  filtroAgente: string;
  filtroEstado: string;
  pqsVariante: PqsVariante;
  plantillaId: string | null;
  plantillaNombre: string;
}

export interface HojaGuardada {
  meta: HojaMeta;
  datos: CertificadoDatos;
}
