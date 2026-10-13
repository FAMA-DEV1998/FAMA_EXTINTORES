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
  tipoCliente?: string | null;
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
  servicioWeightOrder?: string[];
  servicioEstadoOrder?: string[];
  servicioAgenteOrder?: string[];
  sedeOrder?: string[];
  servicioSedeOrder?: string[];
  slug?: string;
  sedes?: Sede[];
  tipoCliente?: string | null;
};
