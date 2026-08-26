import { useMemo, useState } from "react";
import { MESES } from "../../constants";
import { formatVencimPH } from "../../utils/helpers";
import type { CertificadoDatos, CertificadoItem, TipoCertificado, TipoIdentificacion } from "../../components/certificados/CertificadoTemplate";

export type FamiliaAgente = "co2" | "pqs" | "acetato" | "otro";
export type PqsVariante = "75" | "90";

export const clasificarAgente = (agente: string): FamiliaAgente => {
  const a = (agente || "").toLowerCase();
  if (a.includes("co2") || a.includes("carbónico") || a.includes("carbonico")) return "co2";
  if (a.includes("pqs") || a.includes("polvo")) return "pqs";
  if (a.includes("acetato")) return "acetato";
  return "otro";
};

const PQS_LABEL: Record<PqsVariante, string> = {
  "75": "polvo químico seco (PQS) 75%",
  "90": "polvo químico seco (PQS) 90% UL",
};

export const PQS_TIPO_LABEL: Record<PqsVariante, string> = {
  "75": "PQS 75%",
  "90": "PQS 90% UL",
};

export const FAMILIA_FILTRO_LABEL: Record<FamiliaAgente, string> = {
  co2: "CO2",
  pqs: "PQS",
  acetato: "Acetato de Potasio",
  otro: "Otros",
};

const construirAgentesTexto = (agentesPresentes: string[], familias: FamiliaAgente[], pqsVariante: PqsVariante) => {
  const partes: string[] = [];
  if (familias.includes("co2")) partes.push("gas carbónico CO2");
  if (familias.includes("pqs")) partes.push(PQS_LABEL[pqsVariante]);
  if (familias.includes("acetato")) partes.push("acetato de potasio");
  const otros = Array.from(new Set(agentesPresentes.filter((a) => clasificarAgente(a) === "otro" && a)));
  partes.push(...otros);
  if (partes.length === 0) return "extintores portátiles";
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
};

const presionPSIPorDefecto = (familia: FamiliaAgente): string => (familia === "co2" ? "3000" : "");

const tipoExtintorLabel = (familia: FamiliaAgente, agenteOriginal: string): string => {
  if (familia === "pqs") return "PQS";
  if (familia === "co2") return "CO2";
  return agenteOriginal || "—";
};

const parseFecha = (fecha: string): Date | null => {
  const [anio, mes, dia] = (fecha || "").split("-").map((p) => parseInt(p, 10));
  if (!anio || !mes) return null;
  return new Date(anio, mes - 1, dia || 1);
};

const addMonths = (fecha: Date, meses: number): Date => {
  const copia = new Date(fecha);
  copia.setMonth(copia.getMonth() + meses);
  return copia;
};

const formatMesAnio = (fecha: Date): string => `${MESES[fecha.getMonth()].label} ${fecha.getFullYear()}`;

export function useCertificado(empresa: any, activeSede: any, servicio: any, extintoresDelServicio: any[]) {
  const [modal, setModal] = useState(false);
  const [filtroAgente, setFiltroAgente] = useState<"todos" | FamiliaAgente>("todos");
  const [pqsVariante, setPqsVariante] = useState<PqsVariante>("75");

  const familiasDisponibles = useMemo<FamiliaAgente[]>(() => {
    const set = new Set<FamiliaAgente>();
    (extintoresDelServicio || []).forEach((e) => set.add(clasificarAgente(e.agenteExtintor)));
    return Array.from(set);
  }, [extintoresDelServicio]);

  const hayPqs = familiasDisponibles.includes("pqs");

  const filtrarExtintores = (tipoCertificado: TipoCertificado, filtro: "todos" | FamiliaAgente) =>
    (extintoresDelServicio || []).filter((e) => {
      if (tipoCertificado === "ph" && e.ph !== "SI") return false;
      if (filtro !== "todos" && clasificarAgente(e.agenteExtintor) !== filtro) return false;
      return true;
    });

  const construirItems = (tipoCertificado: TipoCertificado, filtro: "todos" | FamiliaAgente): CertificadoItem[] => {
    const fechaServicio = parseFecha(servicio?.fechaRetiro || "");
    const vencimientoRecarga = fechaServicio ? formatMesAnio(addMonths(fechaServicio, 12)) : "—";

    return filtrarExtintores(tipoCertificado, filtro).map((e, i) => {
      const familia = clasificarAgente(e.agenteExtintor);
      return {
        item: String(i + 1).padStart(2, "0"),
        serie: e.nSerie || "—",
        tipo: tipoExtintorLabel(familia, e.agenteExtintor),
        capacidad: [e.peso, e.unidadPeso].filter(Boolean).join(""),
        estanqueidad: "Conforme",
        vencimientoRecarga,
        anioFabricacion: e.fechaFabricacion || "—",
        vencimientoPH: formatVencimPH(e.vencimPH) || "—",
        presionPSI: presionPSIPorDefecto(familia),
        condicion: e.estadoExtintor || "—",
      };
    });
  };

  const construirAgentesTextoPara = (tipoCertificado: TipoCertificado, filtro: "todos" | FamiliaAgente, variante: PqsVariante) => {
    const base = filtrarExtintores(tipoCertificado, filtro);
    const familias = Array.from(new Set(base.map((e) => clasificarAgente(e.agenteExtintor))));
    return construirAgentesTexto(base.map((e) => e.agenteExtintor || ""), familias, variante);
  };

  const datosIniciales = useMemo<CertificadoDatos>(() => {
    const ubicacion = [activeSede?.direccion || empresa?.direccion, activeSede?.distrito || empresa?.distrito]
      .filter(Boolean)
      .join(", ");
    const tipoIdentificacion: TipoIdentificacion = empresa?.tipoCliente === "persona" ? "dni" : "ruc";
    const hoy = new Date();

    return {
      tipoCertificado: "garantia",
      tipoIdentificacion,
      nombre: empresa?.razonSocial || "",
      numeroIdentificacion: empresa?.ruc || "",
      dniAdicional: "",
      ubicacion,
      diaFecha: String(hoy.getDate()),
      mesFecha: String(hoy.getMonth() + 1),
      anioFecha: String(hoy.getFullYear()),
      agentesTexto: construirAgentesTextoPara("garantia", "todos", "75"),
      items: construirItems("garantia", "todos"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa, activeSede, servicio, extintoresDelServicio]);

  const [datos, setDatos] = useState<CertificadoDatos>(datosIniciales);

  const cacheInicial = () => ({
    ruc: empresa?.tipoCliente !== "persona" ? (empresa?.ruc || "") : "",
    dni: empresa?.tipoCliente === "persona" ? (empresa?.ruc || "") : "",
  });

  const [cacheIdentificacion, setCacheIdentificacion] = useState<{ ruc: string; dni: string }>(cacheInicial);

  const abrir = () => {
    setFiltroAgente("todos");
    setPqsVariante("75");
    setDatos(datosIniciales);
    setCacheIdentificacion(cacheInicial());
    setModal(true);
  };

  const actualizar = (cambios: Partial<CertificadoDatos>) => setDatos((p) => ({ ...p, ...cambios }));

  const cambiarTipoCertificado = (tipo: TipoCertificado) => {
    setDatos((p) => ({
      ...p,
      tipoCertificado: tipo,
      items: construirItems(tipo, filtroAgente),
      agentesTexto: construirAgentesTextoPara(tipo, filtroAgente, pqsVariante),
    }));
  };

  const cambiarFiltroAgente = (filtro: "todos" | FamiliaAgente) => {
    setFiltroAgente(filtro);
    setDatos((p) => ({
      ...p,
      items: construirItems(p.tipoCertificado, filtro),
      agentesTexto: construirAgentesTextoPara(p.tipoCertificado, filtro, pqsVariante),
    }));
  };

  const cambiarPqsVariante = (variante: PqsVariante) => {
    setPqsVariante(variante);
    setDatos((p) => ({
      ...p,
      items: construirItems(p.tipoCertificado, filtroAgente),
      agentesTexto: construirAgentesTextoPara(p.tipoCertificado, filtroAgente, variante),
    }));
  };

  const cambiarTipoIdentificacion = (tipo: TipoIdentificacion) => {
    setDatos((p) => {
      const cacheActualizada = p.tipoIdentificacion === "ruc" || p.tipoIdentificacion === "dni"
        ? { ...cacheIdentificacion, [p.tipoIdentificacion]: p.numeroIdentificacion }
        : cacheIdentificacion;
      setCacheIdentificacion(cacheActualizada);
      const numeroNuevo = tipo === "placa" ? "" : cacheActualizada[tipo] || "";
      return { ...p, tipoIdentificacion: tipo, numeroIdentificacion: numeroNuevo };
    });
  };

  return {
    modal, setModal, datos, actualizar, abrir,
    filtroAgente, cambiarFiltroAgente, cambiarTipoCertificado, cambiarTipoIdentificacion,
    familiasDisponibles, hayPqs, pqsVariante, cambiarPqsVariante,
  };
}