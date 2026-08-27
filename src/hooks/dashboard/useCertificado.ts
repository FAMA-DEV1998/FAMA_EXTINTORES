import { useMemo, useState } from "react";
import { MESES } from "../../constants";
import { formatVencimPH, formatRealizadoPH } from "../../utils/helpers";
import type { CertificadoDatos, CertificadoItem, Denominacion, TipoCertificado, TipoIdentificacion } from "../../components/certificados/CertificadoTemplate";

export type PqsVariante = "75" | "90";

const FAMILIA_LABEL_FIJA: Record<string, string> = {
  co2: "CO2",
  pqs: "PQS",
  acetato: "Acetato de Potasio",
  h2o_desmineralizado: "H2O Desmineralizado",
  h2o_presurizado: "H2O Presurizado",
};

export const formatearAgente = (agente: string): string =>
  (agente || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => (palabra === "h2o" ? "H2O" : palabra.charAt(0).toUpperCase() + palabra.slice(1)))
    .join(" ");

export const clasificarAgente = (agente: string): string => {
  const a = (agente || "").toLowerCase();
  if (a.includes("co2") || a.includes("carbónico") || a.includes("carbonico")) return "co2";
  if (a.includes("pqs") || a.includes("polvo")) return "pqs";
  if (a.includes("acetato")) return "acetato";
  if (a.includes("h2o") && a.includes("desmineral")) return "h2o_desmineralizado";
  if (a.includes("h2o") && a.includes("presuriz")) return "h2o_presurizado";
  return a.trim();
};

const PQS_LABEL: Record<PqsVariante, string> = {
  "75": "polvo químico seco (PQS) 75%",
  "90": "polvo químico seco (PQS) 90% UL",
};

export const PQS_TIPO_LABEL: Record<PqsVariante, string> = {
  "75": "PQS 75%",
  "90": "PQS 90% UL",
};

export const DENOMINACION_LABEL: Record<Denominacion, string> = {
  portatiles_rodantes: "EXTINTORES PORTATILES Y RODANTES",
  portatiles: "EXTINTORES PORTATILES",
  rodantes: "EXTINTORES RODANTES",
  extintores: "EXTINTORES",
};

export const DENOMINACION_LABEL_PARRAFO: Record<Denominacion, string> = {
  portatiles_rodantes: "extintores portátiles y rodantes",
  portatiles: "extintores portátiles",
  rodantes: "extintores rodantes",
  extintores: "extintores",
};

const construirAgentesTexto = (agentesPresentes: string[], familias: string[], pqsVariante: PqsVariante) => {
  const partes: string[] = [];
  if (familias.includes("co2")) partes.push("gas carbónico CO2");
  if (familias.includes("pqs")) partes.push(PQS_LABEL[pqsVariante]);
  if (familias.includes("acetato")) partes.push("acetato de potasio");
  if (familias.includes("h2o_desmineralizado")) partes.push("H2O Desmineralizado");
  if (familias.includes("h2o_presurizado")) partes.push("H2O Presurizado");
  const conocidas = ["co2", "pqs", "acetato", "h2o_desmineralizado", "h2o_presurizado"];
  const otros = Array.from(new Set(
    familias
      .filter((f) => !conocidas.includes(f))
      .map((f) => formatearAgente(agentesPresentes.find((a) => clasificarAgente(a) === f) || f))
      .filter(Boolean)
  ));
  partes.push(...otros);
  if (partes.length === 0) return "extintores";
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
};

export const ESTADO_NUEVO_VENTA = "Nuevo - Venta";

export type AccionTrabajo = "venta" | "recarga" | "mantenimiento";

const ACCION_ORDEN: AccionTrabajo[] = ["venta", "recarga", "mantenimiento"];

const ACCION_ARTICULO: Record<AccionTrabajo, string> = {
  venta: "la venta",
  recarga: "la recarga",
  mantenimiento: "el mantenimiento",
};

const ACCION_NOMBRE: Record<AccionTrabajo, string> = {
  venta: "venta",
  recarga: "recarga",
  mantenimiento: "mantenimiento",
};

const construirTextoAccion = (acciones: Record<AccionTrabajo, boolean>): string => {
  const seleccion = ACCION_ORDEN.filter((a) => acciones[a]);
  if (seleccion.length === 0) return ACCION_ARTICULO.recarga;
  const [primero, ...resto] = seleccion;
  if (resto.length === 0) return ACCION_ARTICULO[primero];
  const nombres = resto.map((a) => ACCION_NOMBRE[a]);
  if (nombres.length === 1) return `${ACCION_ARTICULO[primero]} y/o ${nombres[0]}`;
  const ultimo = nombres[nombres.length - 1];
  const previos = nombres.slice(0, -1);
  return `${ACCION_ARTICULO[primero]}, ${previos.join(", ")} y/o ${ultimo}`;
};

const presionPSIPorDefecto = (familia: string): string => {
  if (familia === "co2") return "3000";
  if (familia === "pqs") return "600";
  return "";
};

const tipoExtintorLabel = (familia: string, agenteOriginal: string): string => {
  if (familia === "pqs") return "PQS";
  if (familia === "co2") return "CO2";
  if (familia === "acetato") return "K";
  if (familia === "h2o_desmineralizado") return "H2O DES";
  if (familia === "h2o_presurizado") return "H2O PRE";
  return formatearAgente(agenteOriginal) || "—";
};

const UNIDAD_PESO_LABEL: Record<string, string> = {
  KG: "Kg", LB: "Lbs", LT: "Lts", GAL: "Gls",
};

const formatCapacidad = (peso: string, unidadPeso: string): string => {
  if (!peso) return "";
  const unidad = UNIDAD_PESO_LABEL[unidadPeso] || unidadPeso || "";
  return `${peso}${unidad}`;
};

const tipoServicioItem = (e: any): string => {
  if (e.ma === "SI") return "Mantenimiento";
  if (e.recarga) return "Recarga";
  return "—";
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
  const [filtroAgente, setFiltroAgente] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [pqsVariante, setPqsVariante] = useState<PqsVariante>("75");
  const [ratingsPorUid, setRatingsPorUid] = useState<Record<string, string>>({});

  const familiasDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    (extintoresDelServicio || []).forEach((e) => {
      const key = clasificarAgente(e.agenteExtintor);
      if (!key || mapa.has(key)) return;
      mapa.set(key, FAMILIA_LABEL_FIJA[key] || formatearAgente(e.agenteExtintor));
    });
    return Array.from(mapa.entries()).map(([key, label]) => ({ key, label }));
  }, [extintoresDelServicio]);

  const estadosDisponibles = useMemo(() => {
    const set = new Set<string>();
    (extintoresDelServicio || []).forEach((e) => { if (e.estadoExtintor) set.add(e.estadoExtintor); });
    return Array.from(set);
  }, [extintoresDelServicio]);

  const hayPqs = familiasDisponibles.some((f) => f.key === "pqs");

  const filtrarExtintores = (tipoCertificado: TipoCertificado, filtro: string, filtroEstadoVal: string) =>
    (extintoresDelServicio || []).filter((e) => {
      if (tipoCertificado === "ph" && e.ph !== "SI") return false;
      if (filtro !== "todos" && clasificarAgente(e.agenteExtintor) !== filtro) return false;
      if (filtroEstadoVal !== "todos" && e.estadoExtintor !== filtroEstadoVal) return false;
      return true;
    });

  const construirItems = (tipoCertificado: TipoCertificado, filtro: string, filtroEstadoVal: string): CertificadoItem[] => {
    const fechaServicio = parseFecha(servicio?.fechaRetiro || "");
    const vencimientoRecarga = fechaServicio ? formatMesAnio(addMonths(fechaServicio, 12)) : "—";

    return filtrarExtintores(tipoCertificado, filtro, filtroEstadoVal).map((e, i) => {
      const familia = clasificarAgente(e.agenteExtintor);
      return {
        uid: e.uid,
        item: String(i + 1).padStart(2, "0"),
        serie: e.nSerie || "—",
        nInterno: e.nInterno || "—",
        marca: e.marca || "—",
        tipo: tipoExtintorLabel(familia, e.agenteExtintor),
        capacidad: formatCapacidad(e.peso, e.unidadPeso),
        tipoServicio: tipoServicioItem(e),
        estanqueidad: "Conforme",
        vencimientoRecarga,
        anioFabricacion: e.fechaFabricacion || "—",
        realizadoPH: formatRealizadoPH(e.mesRealizadoPH, e.realizadoPH) || "—",
        vencimientoPH: formatVencimPH(e.vencimPH) || "—",
        presionPSI: presionPSIPorDefecto(familia),
        rating: ratingsPorUid[e.uid] || "",
        condicion: e.estadoExtintor || "—",
      };
    });
  };

  const construirAgentesTextoPara = (tipoCertificado: TipoCertificado, filtro: string, variante: PqsVariante, filtroEstadoVal: string) => {
    const base = filtrarExtintores(tipoCertificado, filtro, filtroEstadoVal);
    const familias = Array.from(new Set(base.map((e) => clasificarAgente(e.agenteExtintor))));
    return construirAgentesTexto(base.map((e) => e.agenteExtintor || ""), familias, variante);
  };

  const datosIniciales = useMemo<CertificadoDatos>(() => {
    const ubicacion = [activeSede?.direccion || empresa?.direccion, activeSede?.distrito || empresa?.distrito]
      .filter(Boolean)
      .join(", ");
    const tipoIdentificacion: TipoIdentificacion = empresa?.tipoCliente === "persona" ? "dni" : "ruc";
    const hoy = new Date();
    const accionesTrabajo = { venta: false, recarga: true, mantenimiento: false };

    return {
      tipoCertificado: "garantia",
      denominacion: "portatiles_rodantes",
      tipoIdentificacion,
      nombre: empresa?.razonSocial || "",
      numeroIdentificacion: empresa?.ruc || "",
      dniAdicional: "",
      ubicacion,
      diaFecha: String(hoy.getDate()),
      mesFecha: String(hoy.getMonth() + 1),
      anioFecha: String(hoy.getFullYear()),
      agentesTexto: construirAgentesTextoPara("garantia", "todos", "75", "todos"),
      items: construirItems("garantia", "todos", "todos"),
      columnas: { item: false, nInterno: false, marca: false, tipoServicio: false, rating: false },
      accionesTrabajo,
      textoAccion: construirTextoAccion(accionesTrabajo),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa, activeSede, servicio, extintoresDelServicio]);

  const [datos, setDatos] = useState<CertificadoDatos>(datosIniciales);

  const cacheInicial = () => ({
    ruc: empresa?.tipoCliente !== "persona" ? (empresa?.ruc || "") : "",
    dni: empresa?.tipoCliente === "persona" ? (empresa?.ruc || "") : "",
    placa: "",
    placa_sola: "",
  });

  const [cacheIdentificacion, setCacheIdentificacion] = useState<{ ruc: string; dni: string; placa: string; placa_sola: string }>(cacheInicial);

  const abrir = () => {
    setFiltroAgente("todos");
    setFiltroEstado("todos");
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
      items: construirItems(tipo, filtroAgente, filtroEstado),
      agentesTexto: construirAgentesTextoPara(tipo, filtroAgente, pqsVariante, filtroEstado),
    }));
  };

  const cambiarDenominacion = (denominacion: Denominacion) => actualizar({ denominacion });

  const cambiarFiltroAgente = (filtro: string) => {
    setFiltroAgente(filtro);
    setDatos((p) => ({
      ...p,
      items: construirItems(p.tipoCertificado, filtro, filtroEstado),
      agentesTexto: construirAgentesTextoPara(p.tipoCertificado, filtro, pqsVariante, filtroEstado),
    }));
  };

  const cambiarFiltroEstado = (filtro: string) => {
    setFiltroEstado(filtro);
    setDatos((p) => {
      const forzarVenta = filtro === ESTADO_NUEVO_VENTA;
      const accionesTrabajo = forzarVenta ? { venta: true, recarga: false, mantenimiento: false } : p.accionesTrabajo;
      return {
        ...p,
        items: construirItems(p.tipoCertificado, filtroAgente, filtro),
        agentesTexto: construirAgentesTextoPara(p.tipoCertificado, filtroAgente, pqsVariante, filtro),
        accionesTrabajo,
        textoAccion: construirTextoAccion(accionesTrabajo),
      };
    });
  };

  const cambiarPqsVariante = (variante: PqsVariante) => {
    setPqsVariante(variante);
    setDatos((p) => ({
      ...p,
      items: construirItems(p.tipoCertificado, filtroAgente, filtroEstado),
      agentesTexto: construirAgentesTextoPara(p.tipoCertificado, filtroAgente, variante, filtroEstado),
    }));
  };

  const actualizarRating = (uid: string, valor: string) => {
    setRatingsPorUid((prev) => ({ ...prev, [uid]: valor }));
    setDatos((p) => ({ ...p, items: p.items.map((it) => (it.uid === uid ? { ...it, rating: valor } : it)) }));
  };

  const cambiarColumna = (columna: "item" | "nInterno" | "marca" | "tipoServicio" | "rating", valor: boolean) => {
    setDatos((p) => ({ ...p, columnas: { ...p.columnas, [columna]: valor } }));
  };

  const cambiarAccionTrabajo = (accion: AccionTrabajo, valor: boolean) => {
    setDatos((p) => {
      const accionesTrabajo = { ...p.accionesTrabajo, [accion]: valor };
      return { ...p, accionesTrabajo, textoAccion: construirTextoAccion(accionesTrabajo) };
    });
  };

  const cambiarTipoIdentificacion = (tipo: TipoIdentificacion) => {
    setDatos((p) => {
      const cacheActualizada = { ...cacheIdentificacion, [p.tipoIdentificacion]: p.numeroIdentificacion };
      setCacheIdentificacion(cacheActualizada);
      return { ...p, tipoIdentificacion: tipo, numeroIdentificacion: cacheActualizada[tipo] || "" };
    });
  };

  return {
    modal, setModal, datos, actualizar, abrir,
    filtroAgente, cambiarFiltroAgente, cambiarTipoCertificado, cambiarTipoIdentificacion,
    familiasDisponibles, hayPqs, pqsVariante, cambiarPqsVariante,
    cambiarDenominacion, actualizarRating, cambiarColumna,
    filtroEstado, cambiarFiltroEstado, estadosDisponibles, cambiarAccionTrabajo,
  };
}