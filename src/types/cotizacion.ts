export type CotizacionItem = {
  codigo: string;
  descripcion: string;
  detalle: string;
  um: string;
  cantidad: number;
  precioUnit: number;
};

export type Cotizacion = {
  id: string;
  numero: string;
  fecha: string;
  cliente: string;
  tipoDestinatario?: "empresa" | "persona";
  ruc: string;
  tipoDocumento?: "ruc" | "dni";
  direccion: string;
  sede?: string;
  guia?: string;
  atencion: string;
  observacionesMes?: string;
  formaPago?: "contado" | "credito";
  diasCredito?: string;
  items: CotizacionItem[];
  createdAt?: string;
};
