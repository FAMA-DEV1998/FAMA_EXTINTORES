import type { Extintor } from "./extintor";

export type Servicio = {
  id: string;
  empresaId: string;
  sedeId: string | null;
  fechaRetiro: string;
  fechaEntrega: string;
  extintorUids: string[];
  extintorEstados?: Record<string, Partial<Extintor>>;
  notas?: string;
  secuencia?: number;
  createdAt?: string;
};

export type TrasladoSede = {
  id: string;
  extintorUid: string;
  empresaId: string;
  sedeOrigenId: string | null;
  sedeDestinoId: string | null;
  fecha: string;
  motivo?: string;
  secuencia?: number;
  createdAt?: string;
};
