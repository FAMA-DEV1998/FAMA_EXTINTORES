export type EmpresaItem = {
  id: string;
  razonSocial: string;
  ruc?: string;
  distrito?: string;
  nombresApellidos?: string;
  celular?: string;
  fechaRetiro?: string;
  fechaEntrega?: string;
  slug: string;
  sedes?: Sede[];
};

export type Sede = {
  id: string;
  empresaId: string;
  nombre: string;
  slug: string;
  direccion?: string;
  distrito?: string;
};

export type EmpresaData = {
  id?: string;
  razonSocial: string;
  direccion: string;
  distrito: string;
  ruc: string;
  nombresApellidos: string;
  celular: string;
  nOrdenTrabajo: string;
  fechaRetiro: string;
  fechaEntrega: string;
  weightOrder?: string[];
  estadoOrder?: string[];
  agenteOrder?: string[];
  slug?: string;
  sedes?: Sede[];
};

export type Extintor = {
  rowIndex: number;
  n?: string;
  nSerie: string;
  nInterno: string;
  marca: string;
  fechaFabricacion: string;
  realizadoPH: string;
  vencimPH: string;
  estadoExtintor: string;
  agenteExtintor: string;
  peso: string;
  unidadPeso: string;
  ma: string;
  recarga: string;
  ph: string;
  valvula: string;
  manguera: string;
  manometro: string;
  tobera: string;
  observaciones: string;
  servicioExtra: string;
  motivoBaja: string;
  evidencia?: string; 
  evidenciaCount?: number; 
  uid: string;
  sedeId: string | null;
};

export type FormData = {
  nSerie: string;
  nInterno: string;
  marca: string;
  fechaFabricacion: string;
  realizadoPH: string;
  vencimPH: string;
  estadoExtintor: string;
  agenteExtintor: string;
  peso: string;
  unidadPeso: "KG" | "LB" | "LT" | "GAL";
  ma: boolean;
  recarga: string;
  ph: boolean;
  valvula: string;
  manguera: string;
  manometro: string;
  tobera: string;
  observaciones: string;
  servicioExtra: string;
  motivoBaja: string;
  evidencias: string[]; 
  sedeId?: string | null; 
};


// Tipos específicos para las vistas
export type WorkerView = "home" | "empresa" | "lista" | "form";
export type DashView = "list" | "detail";

export type Servicio = {
  id: string;
  empresaId: string;
  sedeId: string | null;
  fechaRetiro: string;
  fechaEntrega: string;
  extintorUids: string[];
  extintorEstados?: Record<string, Partial<Extintor>>;
  notas?: string;
  createdAt?: string;
};