import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import type { TipoCertificado, TipoIdentificacion, CertificadoItem, CertificadoDatos, PqsVariante, AccionTrabajo, HojaMeta, HojaGuardada } from "../types";
import { detectarDenominacion } from "../utils/denominacion";
import { sincronizarCamposParrafo } from "../utils/parrafo";
import { FAMILIA_LABEL_FIJA, formatearAgente, clasificarAgente, construirAgentesTexto, construirAgentesTextoCorto, presionPSIPorDefecto, tipoExtintorLabelCertificado } from "../utils/agentes";
import { ESTADO_NUEVO_VENTA, construirTextoAccion } from "../utils/trabajo";
import { marcaCertificado, formatCapacidad, tipoServicioItem, parseFecha, addMonths, formatMesAnio } from "../utils/items";
import { metaPorDefecto, normalizarHojasGuardadas, serializarHojas } from "../utils/hojas";
import { MESES } from "../../../constants";
import { formatVencimPH, formatRealizadoPH } from "../../../utils/pruebaHidrostatica";
import toast from "react-hot-toast";
import { consultarCertificadoWeb, publicarCertificadoWeb } from "../utils/web";

/** id del contenedor oculto que usa CertificadoEditorModal para imprimir / generar el PDF */
export const CONTENEDOR_IMPRESION = "certificado-print-container";

interface CacheTab {
  numero: string;
  nombre: string;
  ubicacion: string;
  distrito: string;
}

export function useCertificadoEditor(socket: Socket | null, empresa: any, activeSede: any, servicio: any, extintoresDelServicio: any[]) {
  const [modal, setModal] = useState(false);
  const [hojaActivaIdx, setHojaActivaIdx] = useState(0);
  const [ratingsPorUid, setRatingsPorUid] = useState<Record<string, string>>({});
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [certificadoGuardadoId, setCertificadoGuardadoId] = useState<string | null>(null);
  const [guardandoCertificado, setGuardandoCertificado] = useState(false);
  const [ultimoGuardadoSerializado, setUltimoGuardadoSerializado] = useState<string | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  // Publicación en la web pública (descarga por código)
  const [codigoWeb, setCodigoWeb] = useState<string | null>(null);
  const [publicandoWeb, setPublicandoWeb] = useState(false);

  const empresaId: string | undefined = empresa?.id;
  const sedeId: string | null = servicio?.sedeId ?? activeSede?.id ?? null;

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
        marca: marcaCertificado(e.marca),
        tipo: tipoExtintorLabelCertificado(familia, e.agenteExtintor),
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

  const construirAgentesTextoCortoPara = (tipoCertificado: TipoCertificado, filtro: string, filtroEstadoVal: string) => {
    const base = filtrarExtintores(tipoCertificado, filtro, filtroEstadoVal);
    const familias = Array.from(new Set(base.map((e) => clasificarAgente(e.agenteExtintor))));
    return construirAgentesTextoCorto(base.map((e) => e.agenteExtintor || ""), familias);
  };

  const ubicacionBase = activeSede?.direccion || empresa?.direccion || "";
  const distritoBase = activeSede?.distrito || empresa?.distrito || "";

  const metaInicial = (): HojaMeta => metaPorDefecto();

  const crearDatosBase = (): CertificadoDatos => {
    const tipoIdentificacion: TipoIdentificacion = empresa?.tipoCliente === "persona" ? "dni" : "ruc";
    const hoy = new Date();
    const accionesTrabajo = { venta: false, recarga: true, mantenimiento: false };
    const items = construirItems("garantia", "todos", "todos");

    return {
      tipoCertificado: "garantia",
      denominacion: detectarDenominacion(items),
      tipoIdentificacion,
      nombre: empresa?.razonSocial || "",
      numeroIdentificacion: empresa?.ruc || "",
      dniAdicional: "",
      ubicacion: ubicacionBase,
      distrito: distritoBase,
      diaFecha: String(hoy.getDate()),
      mesFecha: String(hoy.getMonth() + 1),
      anioFecha: String(hoy.getFullYear()),
      agentesTexto: construirAgentesTextoPara("garantia", "todos", "75_solo", "todos"),
      agentesTextoCorto: construirAgentesTextoCortoPara("garantia", "todos", "todos"),
      items,
      columnas: { item: false, nInterno: false, marca: false, tipoServicio: false, rating: false },
      accionesTrabajo,
      textoAccion: construirTextoAccion(accionesTrabajo),
      etiquetasAdicionales: [],
      parrafoPersonalizado: "",
      segmentosSincronizados: {},
      parrafosPorTipo: {},
    };
  };

  const recalcularHoja = (datos: CertificadoDatos, meta: HojaMeta): CertificadoDatos => {
    const items = construirItems(datos.tipoCertificado, meta.filtroAgente, meta.filtroEstado);
    return {
    ...datos,
    items,
    denominacion: detectarDenominacion(items),
    agentesTexto: construirAgentesTextoPara(datos.tipoCertificado, meta.filtroAgente, meta.pqsVariante, meta.filtroEstado),
    agentesTextoCorto: construirAgentesTextoCortoPara(datos.tipoCertificado, meta.filtroAgente, meta.filtroEstado),
    };
  };

  const [hojas, setHojas] = useState<HojaGuardada[]>(() => [{ meta: metaInicial(), datos: crearDatosBase() }]);

  const cacheInicial = (): Record<TipoIdentificacion, CacheTab> => ({
    ruc: {
      numero: empresa?.tipoCliente !== "persona" ? (empresa?.ruc || "") : "",
      nombre: empresa?.tipoCliente !== "persona" ? (empresa?.razonSocial || "") : "",
      ubicacion: ubicacionBase,
      distrito: distritoBase,
    },
    dni: {
      numero: empresa?.tipoCliente === "persona" ? (empresa?.ruc || "") : "",
      nombre: empresa?.tipoCliente === "persona" ? (empresa?.razonSocial || "") : "",
      ubicacion: ubicacionBase,
      distrito: distritoBase,
    },
    placa: { numero: "", nombre: "", ubicacion: ubicacionBase, distrito: distritoBase },
  });

  const [cacheIdentificacion, setCacheIdentificacion] = useState<Record<TipoIdentificacion, CacheTab>>(cacheInicial);

  const actualizarHoja = (idx: number, updater: (h: HojaGuardada) => HojaGuardada) => {
    setHojas((prev) => prev.map((h, i) => {
      if (i !== idx) return h;
      const nuevo = updater(h);
      const parrafoSinCambiar = nuevo.datos.parrafoPersonalizado === h.datos.parrafoPersonalizado;
      if (nuevo.datos.parrafoPersonalizado && parrafoSinCambiar) {
        const { html, segmentos } = sincronizarCamposParrafo(nuevo.datos.parrafoPersonalizado, nuevo.datos, nuevo.datos.segmentosSincronizados || {});
        return { ...nuevo, datos: { ...nuevo.datos, parrafoPersonalizado: html, segmentosSincronizados: segmentos } };
      }
      return nuevo;
    }));
  };

  const cargarPlantillas = () => {
    if (!socket || !empresaId) return;
    socket.emit("certificados:plantillas", { empresaId, sedeId }, (res: any) => {
      if (res?.success) setPlantillas(res.plantillas || []);
    });
  };

  useEffect(() => {
    if (!socket) return;
    cargarPlantillas();
    socket.on("certificados:changed", cargarPlantillas);
    return () => { socket.off("certificados:changed", cargarPlantillas); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, empresaId, sedeId]);

  const abrir = () => {
    setHojas([{ meta: metaInicial(), datos: crearDatosBase() }]);
    setHojaActivaIdx(0);
    setCacheIdentificacion(cacheInicial());
    setCertificadoGuardadoId(null);
    setUltimoGuardadoSerializado(null);
    setModoEdicion(false);
    setCodigoWeb(null);
    cargarPlantillas();
    setModal(true);
    if (socket && servicio?.id) {
      socket.emit("certificados:porServicio", { servicioId: servicio.id }, (res: any) => {
        if (res?.success && res.certificado) cargarCertificadoGenerado(res.certificado);
      });
    }
  };

  const usarModoEstandar = () => {
    actualizarHoja(hojaActivaIdx, () => ({ meta: metaInicial(), datos: crearDatosBase() }));
  };

  const agregarHoja = () => {
    setHojas((prev) => {
      const nuevas = [...prev, { meta: metaInicial(), datos: crearDatosBase() }];
      setHojaActivaIdx(nuevas.length - 1);
      return nuevas;
    });
  };

  const duplicarHojaActual = () => {
    setHojas((prev) => {
      const actual = prev[hojaActivaIdx];
      if (!actual) return prev;
      const nuevas = [...prev, { meta: { ...actual.meta }, datos: { ...actual.datos, items: [...actual.datos.items] } }];
      setHojaActivaIdx(nuevas.length - 1);
      return nuevas;
    });
  };

  const eliminarHoja = (idx: number) => {
    if (hojas.length <= 1) return;
    const nuevas = hojas.filter((_, i) => i !== idx);
    setHojas(nuevas);
    setHojaActivaIdx((prevIdx) => Math.min(prevIdx >= idx ? Math.max(0, prevIdx - 1) : prevIdx, nuevas.length - 1));
  };

  const cargarPlantilla = (plantilla: any) => {
    const hojasGuardadas = normalizarHojasGuardadas(plantilla.datos);
    if (hojasGuardadas.length === 0) return;
    const hg = hojasGuardadas[0];
    actualizarHoja(hojaActivaIdx, () => ({
      meta: { ...hg.meta, plantillaId: plantilla.id, plantillaNombre: plantilla.nombre || "" },
      datos: recalcularHoja(hg.datos, hg.meta),
    }));
  };

  const cargarCertificadoGenerado = (certificadoGuardado: any) => {
    const hojasGuardadas = normalizarHojasGuardadas(certificadoGuardado.datos);
    if (hojasGuardadas.length === 0) return false;
    setHojas(hojasGuardadas.map((hg) => ({ meta: hg.meta, datos: recalcularHoja(hg.datos, hg.meta) })));
    setHojaActivaIdx(0);
    setCacheIdentificacion(cacheInicial());
    setCertificadoGuardadoId(certificadoGuardado.id);
    setUltimoGuardadoSerializado(serializarHojas(hojasGuardadas));
    setModoEdicion(true);
    setModal(true);
    setCodigoWeb(null);
    if (socket) consultarCertificadoWeb(socket, certificadoGuardado.id).then((c) => setCodigoWeb(c?.codigo ?? null)).catch(() => {});
    return true;
  };

  const crearEtiquetaCertificado = (valor: string, onDone?: (ok: boolean) => void) => {
    if (!socket || !valor.trim()) return;
    socket.emit("catalog:create", { role: "worker", type: "etiqueta_certificado", value: valor.trim() }, (res: any) => {
      onDone?.(!!res?.success);
    });
  };

  const guardarComoPlantilla = (nombre: string, onDone?: (ok: boolean) => void) => {
    if (!socket || !empresaId || !nombre.trim()) return;
    setGuardandoPlantilla(true);
    const idxGuardado = hojaActivaIdx;
    socket.emit("certificados:guardar", {
      empresaId,
      sedeId,
      servicioId: null,
      tipoCertificado: hojas[idxGuardado]?.datos.tipoCertificado || "garantia",
      esPlantilla: true,
      nombre: nombre.trim(),
      datos: serializarHojas([hojas[idxGuardado]]),
    }, (res: any) => {
      setGuardandoPlantilla(false);
      if (res?.success) {
        cargarPlantillas();
        actualizarHoja(idxGuardado, (h) => ({ ...h, meta: { ...h.meta, plantillaId: res.certificado?.id || null, plantillaNombre: nombre.trim() } }));
      }
      onDone?.(!!res?.success);
    });
  };

  const actualizarPlantilla = (onDone?: (ok: boolean) => void) => {
    const plantillaId = hojas[hojaActivaIdx]?.meta.plantillaId;
    if (!socket || !empresaId || !plantillaId) return;
    setGuardandoPlantilla(true);
    socket.emit("certificados:guardar", {
      id: plantillaId,
      empresaId,
      sedeId,
      servicioId: null,
      tipoCertificado: hojas[hojaActivaIdx]?.datos.tipoCertificado || "garantia",
      esPlantilla: true,
      nombre: hojas[hojaActivaIdx]?.meta.plantillaNombre || "",
      datos: serializarHojas([hojas[hojaActivaIdx]]),
    }, (res: any) => {
      setGuardandoPlantilla(false);
      if (res?.success) cargarPlantillas();
      onDone?.(!!res?.success);
    });
  };

  const serializadoActual = useMemo(() => serializarHojas(hojas), [hojas]);
  const hayCambiosPendientes = ultimoGuardadoSerializado === null || serializadoActual !== ultimoGuardadoSerializado;

  const guardarCertificado = (onDone?: (ok: boolean) => void) => {
    if (!socket || !empresaId || guardandoCertificado) return;
    const activa = hojas[hojaActivaIdx]?.datos;
    if (!activa) return;
    setGuardandoCertificado(true);
    const mesEtiqueta = (servicio?.fechaRetiro || "").slice(0, 7) || new Date().toISOString().slice(0, 7);
    const nombre = `${activa.tipoCertificado === "ph" ? "Prueba Hidrostática" : "Garantía y Operatividad"} — ${MESES.find((m) => m.value === activa.mesFecha)?.label || ""} ${activa.anioFecha}${hojas.length > 1 ? ` (${hojas.length} hojas)` : ""}`;
    socket.emit("certificados:guardar", {
      id: certificadoGuardadoId ?? undefined,
      empresaId,
      sedeId,
      servicioId: servicio?.id ?? null,
      tipoCertificado: activa.tipoCertificado,
      esPlantilla: false,
      nombre,
      mesEtiqueta,
      datos: serializadoActual,
    }, (res: any) => {
      setGuardandoCertificado(false);
      if (res?.success) {
        setCertificadoGuardadoId(res.certificado?.id || null);
        setUltimoGuardadoSerializado(serializadoActual);
        setModoEdicion(true);
        // Cada vez que se guarda, la copia descargable en la web se actualiza
        if (res.certificado?.id) publicarEnWeb(res.certificado.id);
      }
      onDone?.(!!res?.success);
    });
  };

  /** Genera el PDF (con el código impreso) y lo publica para descarga en extintoresfama.com/certificados. */
  const publicarEnWeb = async (id: string | null = certificadoGuardadoId) => {
    if (!socket || !id || publicandoWeb) return;
    setPublicandoWeb(true);
    const aviso = toast.loading("Publicando certificado en la web…");
    const codigoAnterior = codigoWeb;
    try {
      const codigo = await publicarCertificadoWeb({
        socket,
        certificadoId: id,
        hojas: hojas.map((h) => h.datos),
        containerId: CONTENEDOR_IMPRESION,
        aplicarCodigo: setCodigoWeb,
      });
      setCodigoWeb(codigo);
      toast.success(`Disponible en la web con el código ${codigo}`, { id: aviso, duration: 6000 });
    } catch (err) {
      setCodigoWeb(codigoAnterior);
      toast.error(`No se pudo publicar en la web: ${err instanceof Error ? err.message : "error"}`, { id: aviso });
    } finally {
      setPublicandoWeb(false);
    }
  };

  const actualizar = (cambios: Partial<CertificadoDatos>) =>
    actualizarHoja(hojaActivaIdx, (h) => ({ ...h, datos: { ...h.datos, ...cambios } }));

  const cambiarTipoCertificado = (tipo: TipoCertificado) =>
    actualizarHoja(hojaActivaIdx, (h) => {
      const anterior = h.datos.tipoCertificado;
      const stash = { ...(h.datos.parrafosPorTipo || {}) };
      if (h.datos.parrafoPersonalizado) {
        stash[anterior] = { texto: h.datos.parrafoPersonalizado, segmentos: h.datos.segmentosSincronizados || {} };
      }
      const restaurado = stash[tipo];
      const datosBase = {
        ...h.datos,
        tipoCertificado: tipo,
        parrafoPersonalizado: restaurado?.texto || "",
        segmentosSincronizados: restaurado?.segmentos || {},
        parrafosPorTipo: stash,
      };
      return { ...h, datos: recalcularHoja(datosBase, h.meta) };
    });

  const cambiarFiltroAgente = (filtro: string) =>
    actualizarHoja(hojaActivaIdx, (h) => {
      const meta = { ...h.meta, filtroAgente: filtro };
      return { meta, datos: recalcularHoja(h.datos, meta) };
    });

  const cambiarFiltroEstado = (filtro: string) =>
    actualizarHoja(hojaActivaIdx, (h) => {
      const meta = { ...h.meta, filtroEstado: filtro };
      const forzarVenta = filtro === ESTADO_NUEVO_VENTA;
      const accionesTrabajo = forzarVenta ? { venta: true, recarga: false, mantenimiento: false } : h.datos.accionesTrabajo;
      const datosBase = { ...h.datos, accionesTrabajo, textoAccion: construirTextoAccion(accionesTrabajo) };
      return { meta, datos: recalcularHoja(datosBase, meta) };
    });

  const cambiarPqsVariante = (variante: PqsVariante) =>
    actualizarHoja(hojaActivaIdx, (h) => {
      const meta = { ...h.meta, pqsVariante: variante };
      return { meta, datos: recalcularHoja(h.datos, meta) };
    });

  const actualizarRating = (uid: string, valor: string) => {
    setRatingsPorUid((prev) => ({ ...prev, [uid]: valor }));
    actualizarHoja(hojaActivaIdx, (h) => ({ ...h, datos: { ...h.datos, items: h.datos.items.map((it) => (it.uid === uid ? { ...it, rating: valor } : it)) } }));
  };

  const cambiarColumna = (columna: "item" | "nInterno" | "marca" | "tipoServicio" | "rating", valor: boolean) =>
    actualizarHoja(hojaActivaIdx, (h) => ({ ...h, datos: { ...h.datos, columnas: { ...h.datos.columnas, [columna]: valor } } }));

  const cambiarAccionTrabajo = (accion: AccionTrabajo, valor: boolean) =>
    actualizarHoja(hojaActivaIdx, (h) => {
      const accionesTrabajo = { ...h.datos.accionesTrabajo, [accion]: valor };
      return { ...h, datos: { ...h.datos, accionesTrabajo, textoAccion: construirTextoAccion(accionesTrabajo) } };
    });

  const cambiarTipoIdentificacion = (tipo: TipoIdentificacion) =>
    actualizarHoja(hojaActivaIdx, (h) => {
      const p = h.datos;
      const cacheActualizada: Record<TipoIdentificacion, CacheTab> = {
        ...cacheIdentificacion,
        [p.tipoIdentificacion]: { numero: p.numeroIdentificacion, nombre: p.nombre, ubicacion: p.ubicacion, distrito: p.distrito },
      };
      setCacheIdentificacion(cacheActualizada);
      const destino = cacheActualizada[tipo];
      return {
        ...h,
        datos: {
          ...p,
          tipoIdentificacion: tipo,
          numeroIdentificacion: destino?.numero || "",
          nombre: destino?.nombre || "",
          ubicacion: destino?.ubicacion || ubicacionBase,
          distrito: destino?.distrito || distritoBase,
        },
      };
    });

  const hojaActiva = hojas[hojaActivaIdx] || hojas[0];

  return {
    modal, setModal, datos: hojaActiva.datos, actualizar, abrir,
    filtroAgente: hojaActiva.meta.filtroAgente, cambiarFiltroAgente, cambiarTipoCertificado, cambiarTipoIdentificacion,
    familiasDisponibles, hayPqs, pqsVariante: hojaActiva.meta.pqsVariante, cambiarPqsVariante,
    actualizarRating, cambiarColumna,
    filtroEstado: hojaActiva.meta.filtroEstado, cambiarFiltroEstado, estadosDisponibles, cambiarAccionTrabajo,
    plantillas, cargarPlantilla, cargarCertificadoGenerado, guardarComoPlantilla, guardandoPlantilla, usarModoEstandar,
    hojas: hojas.map((h) => h.datos), hojasMeta: hojas.map((h) => h.meta), hojaActivaIdx, setHojaActivaIdx, agregarHoja, duplicarHojaActual, eliminarHoja,
    plantillaActivaId: hojaActiva.meta.plantillaId, plantillaActivaNombre: hojaActiva.meta.plantillaNombre, actualizarPlantilla,
    certificadoGuardadoId, guardandoCertificado, hayCambiosPendientes, guardarCertificado, modoEdicion,
    crearEtiquetaCertificado,
    web: { codigo: codigoWeb, publicando: publicandoWeb, publicar: () => publicarEnWeb() },
  };
}
