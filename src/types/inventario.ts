export type InventarioItem = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  operacion?: string | null;
  precioTotal: number;
  stock: number;
  estado: string;
  marca?: string | null;
  capacidad?: string | null;
  agente?: string | null;
  peso?: string | null;
  createdAt?: string;
};
