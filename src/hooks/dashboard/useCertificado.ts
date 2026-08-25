import { useMemo, useState } from "react";
import { MESES } from "../../constants";
import type { CertificadoDatos, CertificadoItem, TipoCertificado, TipoIdentificacion } from "../../components/certificados/CertificadoTemplate";

export type FamiliaAgente = "co2" | "pqs" | "acetato" | "otro";

export const clasificarAgente = (agente: string): FamiliaAgente => {
  const a = (agente || "").toLowerCase();
  if (a.includes("co2") || a.includes("carbónico") || a.includes("carbonico")) return "co2";
  if (a.includes("pqs") || a.includes("polvo")) return "pqs";
  if (a.includes("acetato")) return "acetato";
  return "otro";
};

const FAMILIA_LABEL: Record<FamiliaAgente, string> = {
  co2: "gas carbónico CO2",
  pqs: "polvo químico seco (PQS)",
  acetato: "acetato de potasio",
  otro: "",
};

export const FAMILIA_FILTRO_LABEL: Record<FamiliaAgente, string> = {
  co2: "CO2",
  pqs: "PQS",
  acetato: "Acetato de Potasio",
  otro: "Otros",
};

const construirAgentesTexto = (agentesPresentes: string[], familias: FamiliaAgente[]) => {
  const partes: string[] = [];
  if (familias.includes("co2")) partes.push(FAMILIA_LABEL.co2);
  if (familias.includes("pqs")) partes.push(FAMILIA_LABEL.pqs);
  if (familias.includes("acetato")) partes.push(FAMILIA_LABEL.acetato);
  const otros = Array.from(new Set(agentesPresentes.filter((a) => clasificarAgente(a) === "otro" && a)));
  partes.push(...otros);
  if (partes.length === 0) return "extintores portátiles";
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
};

const presionPSIPorDefecto = (familia: FamiliaAgente): string => (familia === "co2" ? "3000" : "");

const tipoExtintorLabel = (familia: FamiliaAgente, agenteOriginal: string): string => {
  if (familia === "pqs") return "PQS-ABC";
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

  const familiasDisponibles = useMemo<FamiliaAgente[]>(() => {
    const set = new Set<FamiliaAgente>();
    (extintoresDelServicio || []).forEach((e) => set.add(clasificarAgente(e.agenteExtintor)));
    return Array.from(set);
  }, [extintoresDelServicio]);

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
        vencimientoPH: e.vencimPH || "—",
        presionPSI: presionPSIPorDefecto(familia),
        condicion: e.estadoExtintor || "—",
      };
    });
  };

  const construirAgentesTextoPara = (tipoCertificado: TipoCertificado, filtro: "todos" | FamiliaAgente) => {
    const base = filtrarExtintores(tipoCertificado, filtro);
    const familias = Array.from(new Set(base.map((e) => clasificarAgente(e.agenteExtintor))));
    return construirAgentesTexto(base.map((e) => e.agenteExtintor || ""), familias);
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
      agentesTexto: construirAgentesTextoPara("garantia", "todos"),
      items: construirItems("garantia", "todos"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa, activeSede, servicio, extintoresDelServicio]);

  const [datos, setDatos] = useState<CertificadoDatos>(datosIniciales);

  const abrir = () => {
    setFiltroAgente("todos");
    setDatos(datosIniciales);
    setModal(true);
  };

  const actualizar = (cambios: Partial<CertificadoDatos>) => setDatos((p) => ({ ...p, ...cambios }));

  const cambiarTipoCertificado = (tipo: TipoCertificado) => {
    setDatos((p) => ({
      ...p,
      tipoCertificado: tipo,
      items: construirItems(tipo, filtroAgente),
      agentesTexto: construirAgentesTextoPara(tipo, filtroAgente),
    }));
  };

  const cambiarFiltroAgente = (filtro: "todos" | FamiliaAgente) => {
    setFiltroAgente(filtro);
    setDatos((p) => ({
      ...p,
      items: construirItems(p.tipoCertificado, filtro),
      agentesTexto: construirAgentesTextoPara(p.tipoCertificado, filtro),
    }));
  };

  const cambiarTipoIdentificacion = (tipo: TipoIdentificacion) => {
    setDatos((p) => ({ ...p, tipoIdentificacion: tipo, numeroIdentificacion: "", dniAdicional: "" }));
  };

  return {
    modal, setModal, datos, actualizar, abrir,
    filtroAgente, cambiarFiltroAgente, cambiarTipoCertificado, cambiarTipoIdentificacion,
    familiasDisponibles,
  };
}