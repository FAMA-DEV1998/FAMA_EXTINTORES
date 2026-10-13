import type { EmpresaData, Sede, EmpresaItem } from "../types";

export const emptyEmpresa = (): EmpresaData => ({
    razonSocial: "", direccion: "", distrito: "", ruc: "", nombresApellidos: "",
    celular: "", nOrdenTrabajo: "", fechaRetiro: "", fechaEntrega: "",
    weightOrder: [], estadoOrder: [], agenteOrder: [],
});

export const TIPO_CLIENTE_LABELS: Record<string, string> = {
    persona: "Persona (DNI)",
    ruc10: "RUC 10",
    ruc20: "RUC 20",
};

export type ClasificacionFiltro = "" | "persona" | "ruc10" | "ruc20" | "multisede" | "sin_clasificar";

export const CLASIFICACION_FILTROS: { value: ClasificacionFiltro; label: string }[] = [
    { value: "", label: "Todas" },
    { value: "persona", label: "Persona" },
    { value: "ruc10", label: "RUC 10" },
    { value: "ruc20", label: "RUC 20" },
    { value: "multisede", label: "Multisede" },
    { value: "sin_clasificar", label: "Sin clasificar" },
];

export const filtrarPorClasificacion = <T extends { tipoCliente?: string | null; sedes?: Sede[] }>(
    lista: T[],
    filtro: ClasificacionFiltro,
): T[] => {
    if (!filtro) return lista;
    if (filtro === "multisede") return lista.filter((e) => esMultisede(e));
    if (filtro === "sin_clasificar") return lista.filter((e) => !e.tipoCliente);
    return lista.filter((e) => e.tipoCliente === filtro);
};

export const esMultisede = (e: { sedes?: Sede[] }): boolean => (e.sedes?.length || 0) > 0;

export const validarRucPorTipo = (tipoCliente: string, ruc: string): string | null => {
    const valor = (ruc || "").trim();
    if (tipoCliente === "persona") {
        if (valor.length > 0 && valor.length !== 8) return "El DNI debe tener 8 dígitos";
        return null;
    }
    if (tipoCliente === "ruc10" || tipoCliente === "ruc20") {
        if (!/^\d{11}$/.test(valor)) return "El RUC debe tener 11 dígitos";
        if (tipoCliente === "ruc20" && !valor.startsWith("20")) return "El RUC 20 debe iniciar en 20";
        if (tipoCliente === "ruc10" && !valor.startsWith("10")) return "El RUC 10 debe iniciar en 10";
    }
    return null;
};

export const detectarTipoClientePorRuc = (ruc: string): "ruc10" | "ruc20" | null => {
    const valor = (ruc || "").trim();
    if (valor.startsWith("10")) return "ruc10";
    if (valor.startsWith("20")) return "ruc20";
    return null;
};

export function getAvailableYears(empresas: EmpresaItem[]): number[] {
  return [...new Set(
    empresas
      .filter((e) => e.fechaEntrega)
      .map((e) => {
        const [y] = (e.fechaEntrega ?? "").split("-");
        return parseInt(y);
      })
      .filter((y) => !isNaN(y))
  )].sort((a, b) => b - a);
}

export function filterEmpresas(
  empresas: EmpresaItem[],
  search: string,
  fMonth: string,
  fYear: string
): EmpresaItem[] {
  return empresas.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      const coincide =
        e.razonSocial.toLowerCase().includes(q) ||
        (e.ruc || "").toLowerCase().includes(q) ||
        (e.nombresApellidos || "").toLowerCase().includes(q);
      if (!coincide) return false;
    }
    if (fYear || fMonth) {
      if (!e.fechaEntrega) return false;
      const [y, m] = e.fechaEntrega.split("-");
      if (fYear && parseInt(y) !== parseInt(fYear)) return false;
      if (fMonth && parseInt(m) !== parseInt(fMonth)) return false;
    }
    return true;
  });
}
