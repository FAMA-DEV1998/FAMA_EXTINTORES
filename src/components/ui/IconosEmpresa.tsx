import { Building2, LayoutGrid, Network, Store, TriangleAlert, User, type LucideIcon } from "lucide-react";
import type { Sede } from "../../types";
import { esMultisede, type ClasificacionFiltro } from "../../utils/empresas";

const ICONO_TIPO_CLIENTE: Record<string, LucideIcon> = {
  persona: User,
  ruc10: Store,
  ruc20: Building2,
};

export const ICONO_CLASIFICACION: Record<ClasificacionFiltro, LucideIcon> = {
  "": LayoutGrid,
  persona: User,
  ruc10: Store,
  ruc20: Building2,
  multisede: Network,
  sin_clasificar: TriangleAlert,
};

export function IconoEmpresa({ empresa, className }: { empresa: { tipoCliente?: string | null; sedes?: Sede[] }; className?: string }) {
  const Icono = esMultisede(empresa) ? Network : (empresa.tipoCliente && ICONO_TIPO_CLIENTE[empresa.tipoCliente]) || Building2;
  return <Icono className={className} />;
}

export function EtiquetaClasificacion({ value, label }: { value: ClasificacionFiltro; label: string }) {
  const Icono = ICONO_CLASIFICACION[value];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icono className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
