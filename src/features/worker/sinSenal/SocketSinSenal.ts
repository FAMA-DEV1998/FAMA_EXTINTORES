import type { Socket } from "socket.io-client";
import { nuevoUid } from "../../../utils/extintores";
import { guardarLocal, leerLocal } from "./almacenLocal";

type Oyente = (...args: any[]) => void;

export type Operacion = {
  id: string;
  evento: string;
  datos: Record<string, any>;
  creadaEn: number;
  descripcion: string;
  error?: string;
  envio?: { id: string; firma: string; enviadas: number };
};

type EstadoLocal = {
  empresas: any[];
  empresa: Record<string, any>;
  sedes: Record<string, any[]>;
  extintores: Record<string, any[]>;
  servicios: Record<string, any[]>;
  traslados: Record<string, any[]>;
  evidencias: Record<string, string>;
  catalogos: any | null;
  cola: Operacion[];
  fallidas: Operacion[];
  filasReales: Record<string, number>;
  ubicaciones: Record<string, any>;
  enVuelo: Operacion[];
  inspecciones: Record<string, any>;
  inspDisponibles: any[];
};

export type ResumenSinSenal = {
  listo: boolean;
  conectado: boolean;
  sincronizando: boolean;
  pendientes: number;
  fallidas: Operacion[];
  empresasDisponibles: Set<string>;
  catalogos: any | null;
  senalDebil: boolean;
  progreso: { descripcion: string; enviadas: number; total: number } | null;
};

const estadoVacio = (): EstadoLocal => ({
  empresas: [], empresa: {}, sedes: {}, extintores: {}, servicios: {}, traslados: {},
  evidencias: {}, catalogos: null, cola: [], fallidas: [], filasReales: {}, ubicaciones: {}, enVuelo: [], inspecciones: {}, inspDisponibles: [],
});

const ESCRITURAS_SIN_SENAL = new Set([
  "extintor:add", "extintor:update", "extintor:delete",
  "servicio:save", "servicio:addExtintor", "servicio:removeExtintor", "servicio:setExtintorEstado", "servicio:updateDatos", "servicio:delete",
  "empresa:save", "sede:save",
  "ubicacion:registrar", "ubicacion:foto", "ubicacion:anular",
  "insp:registrar",
]);

const LECTURAS_SIN_SENAL = new Set([
  "empresa:list", "empresa:get", "sede:list", "extintor:list", "extintor:listGlobal", "servicio:list", "servicio:listByExtintor",
  "extintor:scan", "extintor:evidencia:get", "traslado:list", "catalog:list", "voz:correcciones:list", "auth:verify",
  "ubicacion:sede", "ubicacion:extintor", "ubicacion:foto:get",
  "insp:disponibles", "insp:detalle", "insp:foto:get",
]);

const DIFERIBLES = new Set(["ubicacion:foto"]);
const LIMITE_DIRECTO = 48 * 1024;
const TAM_TROZO = 24 * 1024;
const ESPERA_TROZO_MS = 45000;
const ESPERA_ESCANEO_MS = 12000;
const INTERVALO_SENAL_MS = 15000;
const SENAL_LENTA_MS = 2500;
const SENAL_BUENA_MS = 1200;

const firmaDe = (texto: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${texto.length}-${(h >>> 0).toString(36)}`;
};

const EVENTOS_RESERVADOS = new Set(["disconnect", "connect_error"]);

const LISTAS_DEL_SERVIDOR = new Set([
  "empresa:list", "empresa:data", "empresa:data:updated", "sede:list",
  "extintor:updated", "extintor:updated:global", "servicio:list", "servicio:listByExtintor",
]);

const SIN_CONEXION = "Esta acción necesita conexión a internet. Inténtalo cuando vuelva la señal.";
const ESPERA_RESPUESTA_MS = 30000;
const ESPERA_ESCRITURA_MS = 15000;
const AVISO_DESCONEXION_MS = 5000;

const nuevoId = nuevoUid;

const claveSede = (sedeId?: string | null): string =>
  sedeId === undefined ? "__todas__" : sedeId === null ? "__sin_sede__" : sedeId;

const perteneceAFiltro = (servicio: any, filtro: string) =>
  filtro === "__todas__" || (filtro === "__sin_sede__" ? !servicio.sedeId : servicio.sedeId === filtro);

const ordenarServicios = (lista: any[]) =>
  [...lista].sort((a, b) => (b.fechaRetiro || "").localeCompare(a.fechaRetiro || "") || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

const contarFotos = (evidencia: unknown): number => {
  if (typeof evidencia !== "string" || evidencia === "__HAS_EVIDENCIA__") return 0;
  try {
    const lista = JSON.parse(evidencia || "[]");
    return Array.isArray(lista) ? lista.length : 0;
  } catch {
    return 0;
  }
};

const normalizar = (v: unknown) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const slugify = (texto: string) =>
  (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "item";

const SIN_CAMPOS_TECNICOS = (datos: Record<string, any>) => {
  const { id: _id, rowIndex: _row, confirmarDuplicado: _c, role: _r, ...resto } = datos;
  return resto;
};

export class SocketSinSenal {
  private oyentes = new Map<string, Set<Oyente>>();
  private estado: EstadoLocal = estadoVacio();
  private suscriptores = new Set<() => void>();
  private sincronizando = false;
  private listo = false;
  private guardadoPendiente: ReturnType<typeof setTimeout> | null = null;
  private contadorFilas = 0;
  private readonly clave: string;
  private readonly real: Socket;
  private resumenCache: ResumenSinSenal | null = null;
  private alTerminarSincronizacion: ((enviados: number, fallidos: number) => void) | null = null;
  private senalDebil = false;
  private soportaPartes = false;
  private buenasSeguidas = 0;
  private medidorSenal: ReturnType<typeof setInterval> | null = null;
  private progreso: ResumenSinSenal["progreso"] = null;

  constructor(real: Socket, usuarioId: string) {
    this.real = real;
    this.clave = `estado-${usuarioId}`;
    this.real.onAny(this.recibirDelServidor);
    this.real.on("connect", this.alConectar);
    this.real.on("disconnect", this.alDesconectar);
    if (!this.real.connected) this.alDesconectar();
  }

  private desconexionVisible = false;
  private temporizadorDesconexion: ReturnType<typeof setTimeout> | null = null;

  private alDesconectar = () => {
    if (this.temporizadorDesconexion) clearTimeout(this.temporizadorDesconexion);
    this.temporizadorDesconexion = setTimeout(() => {
      this.temporizadorDesconexion = null;
      this.desconexionVisible = true;
      this.notificar();
    }, AVISO_DESCONEXION_MS);
  };

  private marcarConectado() {
    if (this.temporizadorDesconexion) clearTimeout(this.temporizadorDesconexion);
    this.temporizadorDesconexion = null;
    this.desconexionVisible = false;
  }

  async iniciar() {
    const guardado = await leerLocal<EstadoLocal>(this.clave);
    if (guardado) this.estado = { ...estadoVacio(), ...guardado };
    this.recuperarEnVuelo();
    this.listo = true;
    this.medirSenal();
    this.medidorSenal = setInterval(this.medirSenal, INTERVALO_SENAL_MS);
    this.notificar();
    document.addEventListener("visibilitychange", this.alOcultar);
    window.addEventListener("pagehide", this.guardarAhora);
    void navigator.storage?.persist?.().catch(() => false);
    if (this.real.connected) {
      this.pedirCatalogos();
      if (this.estado.cola.length > 0) this.sincronizar();
    } else {
      this.despachar("empresa:list", this.estado.empresas);
    }
    return this;
  }

  destruir() {
    this.real.offAny(this.recibirDelServidor);
    this.real.off("connect", this.alConectar);
    this.real.off("disconnect", this.alDesconectar);
    document.removeEventListener("visibilitychange", this.alOcultar);
    window.removeEventListener("pagehide", this.guardarAhora);
    if (this.temporizadorDesconexion) clearTimeout(this.temporizadorDesconexion);
    if (this.medidorSenal) clearInterval(this.medidorSenal);
    this.oyentes.forEach((conjunto, evento) => {
      if (EVENTOS_RESERVADOS.has(evento)) conjunto.forEach((fn) => this.real.off(evento, fn));
    });
    this.oyentes.clear();
    if (this.guardadoPendiente) {
      clearTimeout(this.guardadoPendiente);
      void guardarLocal(this.clave, this.estado);
    }
  }

  get connected() {
    return this.real.connected;
  }

  get id() {
    return this.real.id;
  }

  timeout(ms: number) {
    return this.real.timeout(ms);
  }

  disconnect() {
    this.real.disconnect();
    return this;
  }

  alSincronizar(fn: (enviados: number, fallidos: number) => void) {
    this.alTerminarSincronizacion = fn;
  }

  suscribir = (fn: () => void) => {
    this.suscriptores.add(fn);
    return () => { this.suscriptores.delete(fn); };
  };

  resumen = (): ResumenSinSenal => {
    if (!this.resumenCache) {
      this.resumenCache = {
        listo: this.listo,
        conectado: this.real.connected || !this.desconexionVisible,
        sincronizando: this.sincronizando,
        pendientes: this.estado.cola.length,
        fallidas: this.estado.fallidas,
        empresasDisponibles: new Set(Object.keys(this.estado.extintores)),
        catalogos: this.estado.catalogos,
        senalDebil: this.real.connected && this.senalDebil,
        progreso: this.progreso,
      };
    }
    return this.resumenCache;
  };

  descartarFallida(id: string) {
    this.estado.fallidas = this.estado.fallidas.filter((o) => o.id !== id);
    this.persistir();
  }

  reintentarFallidas() {
    this.estado.cola = [...this.estado.fallidas.map(({ error: _e, ...op }) => op), ...this.estado.cola];
    this.estado.fallidas = [];
    this.persistir();
    if (this.real.connected) this.sincronizar();
  }

  on(evento: string, fn: Oyente) {
    if (!this.oyentes.has(evento)) this.oyentes.set(evento, new Set());
    this.oyentes.get(evento)!.add(fn);
    if (EVENTOS_RESERVADOS.has(evento)) this.real.on(evento, fn);
    if (evento === "empresa:list" && this.listo && !this.real.connected) {
      setTimeout(() => { if (this.oyentes.get(evento)?.has(fn)) fn(this.estado.empresas); }, 0);
    }
    return this;
  }

  off(evento: string, fn?: Oyente) {
    if (fn) {
      this.oyentes.get(evento)?.delete(fn);
      if (EVENTOS_RESERVADOS.has(evento)) this.real.off(evento, fn);
    } else {
      if (EVENTOS_RESERVADOS.has(evento)) this.oyentes.get(evento)?.forEach((f) => this.real.off(evento, f));
      this.oyentes.delete(evento);
    }
    return this;
  }

  once(evento: string, fn: Oyente) {
    const envoltura = (...args: any[]) => {
      this.off(evento, envoltura);
      fn(...args);
    };
    return this.on(evento, envoltura);
  }

  emit(evento: string, ...args: any[]) {
    const ultimo = args[args.length - 1];
    const ack: Oyente | null = typeof ultimo === "function" ? ultimo : null;
    const datos = (typeof args[0] === "object" && args[0] !== null ? args[0] : {}) as Record<string, any>;
    const enLinea = this.real.connected && this.listo;
    const alDia = enLinea && !this.sincronizando && this.estado.cola.length === 0;

    if (ESCRITURAS_SIN_SENAL.has(evento)) {
      if (evento === "extintor:add" && !datos.uid) datos.uid = nuevoId();
      if (evento === "servicio:save" && !datos.id) datos.id = nuevoId();
    }

    if (alDia) {
      if (evento === "extintor:list" && datos.sedeId) {
        this.real.emit(evento, { id: datos.id }, ...args.slice(1));
        return this;
      }
      if (ESCRITURAS_SIN_SENAL.has(evento) && ack) {
        if (this.soportaPartes && (this.senalDebil || JSON.stringify(datos).length > LIMITE_DIRECTO)) {
          const respuesta = this.aplicarEscritura(evento, datos);
          setTimeout(() => ack(respuesta), 0);
          void this.sincronizar();
          return this;
        }
        this.escribirConRespaldo(evento, this.prepararEnvio({ datos }), ack);
        return this;
      }
      if (evento === "extintor:scan" && ack) {
        this.real.timeout(ESPERA_ESCANEO_MS).emit(evento, datos, (err: Error | null, res: any) => {
          if (err) this.responderLectura(evento, datos, ack);
          else ack(res);
        });
        return this;
      }
      if ((evento === "ubicacion:sede" || evento === "ubicacion:extintor" || evento === "insp:disponibles" || evento === "insp:detalle") && ack) {
        this.real.timeout(ESPERA_ESCANEO_MS).emit(evento, datos, (err: Error | null, res: any) => {
          if (err) {
            this.responderLectura(evento, datos, ack);
            return;
          }
          this.cachearUbicaciones(evento, res);
          ack(res);
        });
        return this;
      }
      this.real.emit(evento, ...args);
      return this;
    }

    if (LECTURAS_SIN_SENAL.has(evento)) {
      setTimeout(() => this.responderLectura(evento, datos, ack), 0);
      return this;
    }

    if (ESCRITURAS_SIN_SENAL.has(evento)) {
      const respuesta = this.aplicarEscritura(evento, datos);
      setTimeout(() => ack?.(respuesta), 0);
      return this;
    }

    if (enLinea) {
      this.real.emit(evento, ...args);
      return this;
    }

    setTimeout(() => ack?.({ success: false, error: SIN_CONEXION }), 0);
    return this;
  }

  private reintento: ReturnType<typeof setInterval> | null = null;

  private programarReintento() {
    if (this.reintento) return;
    this.reintento = setInterval(() => {
      if (this.estado.cola.length === 0) {
        if (this.reintento) clearInterval(this.reintento);
        this.reintento = null;
        return;
      }
      if (this.real.connected) void this.sincronizar();
    }, 20000);
  }

  private escribirConRespaldo(evento: string, datos: Record<string, any>, ack: Oyente) {
    let resuelto = false;
    const diario: Operacion = { id: nuevoId(), evento, datos, creadaEn: Date.now(), descripcion: "" };
    this.estado.enVuelo.push(diario);
    this.guardarAhora();
    const cerrarDiario = () => {
      this.estado.enVuelo = this.estado.enVuelo.filter((o) => o.id !== diario.id);
      this.persistir();
    };
    const respaldo = setTimeout(() => {
      if (resuelto) return;
      resuelto = true;
      this.marcarSenal(false);
      cerrarDiario();
      const respuesta = this.aplicarEscritura(evento, { ...datos, confirmarDuplicado: true });
      this.programarReintento();
      ack(respuesta);
    }, ESPERA_ESCRITURA_MS);
    this.real.emit(evento, datos, (res: any) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(respaldo);
      cerrarDiario();
      if (res?.success && evento === "ubicacion:registrar" && res.actual) this.guardarUbicacionLocal(datos.extintorUid, res.actual);
      ack(res);
    });
  }

  private recuperarEnVuelo() {
    const pendientes = this.estado.enVuelo;
    this.estado.enVuelo = [];
    pendientes.forEach((op) => {
      try {
        this.aplicarEscritura(op.evento, { ...op.datos, confirmarDuplicado: true });
      } catch (err) {
        console.error(err);
      }
    });
    if (pendientes.length > 0) this.guardarAhora();
  }

  private medirSenal = () => {
    if (!this.real.connected || !this.listo) return;
    const inicio = Date.now();
    this.real.timeout(8000).emit("senal:ping", {}, (err: Error | null, res: any) => {
      if (err || !res?.ok) {
        if (this.soportaPartes) this.marcarSenal(false);
        return;
      }
      this.soportaPartes = true;
      const demora = Date.now() - inicio;
      if (demora > SENAL_LENTA_MS) this.marcarSenal(false);
      else if (demora < SENAL_BUENA_MS) this.marcarSenal(true);
    });
  };

  private marcarSenal(buena: boolean) {
    const antes = this.senalDebil;
    if (buena) {
      this.buenasSeguidas += 1;
      if (this.buenasSeguidas >= 2) this.senalDebil = false;
    } else {
      this.buenasSeguidas = 0;
      this.senalDebil = true;
    }
    if (antes !== this.senalDebil) this.notificar();
  }

  private guardarUbicacionLocal(uid: string, actual: any) {
    if (!uid) return;
    if (actual) this.estado.ubicaciones[uid] = actual;
    else if (!this.estado.cola.some((o) => o.evento === "ubicacion:registrar" && o.datos.extintorUid === uid)) delete this.estado.ubicaciones[uid];
    this.persistir();
  }

  private cachearUbicaciones(evento: string, res: any) {
    if (!res?.success) return;
    if (evento === "insp:disponibles" && Array.isArray(res.lista)) {
      this.estado.inspDisponibles = res.lista;
      this.persistir();
      return;
    }
    if (evento === "insp:detalle" && res.campana?.id) {
      const { success: _s, ...detalle } = res;
      this.estado.inspecciones[res.campana.id] = detalle;
      this.persistir();
      return;
    }
    if (evento === "ubicacion:sede" && Array.isArray(res.extintores)) {
      res.extintores.forEach((x: any) => {
        if (x?.uid && x.ubicacion) this.estado.ubicaciones[x.uid] = x.ubicacion;
        else if (x?.uid && !this.estado.cola.some((o) => o.evento === "ubicacion:registrar" && o.datos.extintorUid === x.uid)) delete this.estado.ubicaciones[x.uid];
      });
      this.persistir();
    } else if (evento === "ubicacion:extintor" && res.uid) {
      this.guardarUbicacionLocal(res.uid, res.actual);
    }
  }

  private notificar = () => {
    this.resumenCache = null;
    this.suscriptores.forEach((fn) => fn());
  };

  private persistir() {
    this.notificar();
    if (this.guardadoPendiente) clearTimeout(this.guardadoPendiente);
    this.guardadoPendiente = setTimeout(() => {
      this.guardadoPendiente = null;
      void guardarLocal(this.clave, this.estado);
    }, 400);
  }

  private despachar(evento: string, ...args: any[]) {
    const conjunto = this.oyentes.get(evento);
    if (!conjunto) return;
    [...conjunto].forEach((fn) => {
      try {
        fn(...args);
      } catch (err) {
        console.error(err);
      }
    });
  }

  private pedirCatalogos() {
    this.real.emit("catalog:list", {}, (res: any) => {
      if (res?.success) {
        this.estado.catalogos = res;
        this.persistir();
      }
    });
  }

  private alConectar = () => {
    this.marcarConectado();
    this.notificar();
    if (!this.listo) return;
    this.pedirCatalogos();
    if (this.estado.cola.length > 0) this.sincronizar();
    else this.despachar("connect");
  };

  private recibirDelServidor = (evento: string, ...args: any[]) => {
    const hayCambiosPorEnviar = this.sincronizando || this.estado.cola.length > 0;
    if (hayCambiosPorEnviar && LISTAS_DEL_SERVIDOR.has(evento)) return;
    this.cachearDelServidor(evento, args[0]);
    this.despachar(evento, ...args);
  };

  private cachearDelServidor(evento: string, carga: any) {
    const e = this.estado;
    let cambio = true;
    switch (evento) {
      case "empresa:list":
        if (Array.isArray(carga)) e.empresas = carga;
        break;
      case "empresa:data":
      case "empresa:data:updated":
        if (carga?.id) e.empresa[carga.id] = { ...(e.empresa[carga.id] || {}), ...carga };
        break;
      case "sede:list":
        if (carga?.empresaId) e.sedes[carga.empresaId] = carga.list || [];
        break;
      case "extintor:updated:global":
      case "extintor:updated":
        if (carga?.id) e.extintores[carga.id] = carga.rows || [];
        break;
      case "servicio:list": {
        if (!carga?.empresaId) break;
        const filtro = carga.filtro || claveSede(carga.sedeId);
        const actuales = e.servicios[carga.empresaId] || [];
        e.servicios[carga.empresaId] = filtro === "__todas__"
          ? carga.list || []
          : [...actuales.filter((s) => !perteneceAFiltro(s, filtro)), ...(carga.list || [])];
        break;
      }
      case "traslado:list":
        if (carga?.extintorUid) e.traslados[carga.extintorUid] = carga.list || [];
        break;
      case "catalog:updated":
        e.catalogos = { success: true, ...carga };
        break;
      default:
        cambio = false;
    }
    if (cambio) this.persistir();
  }

  private filasDe(empresaId: string) {
    if (!this.estado.extintores[empresaId]) this.estado.extintores[empresaId] = [];
    return this.estado.extintores[empresaId];
  }

  private serviciosDe(empresaId: string) {
    if (!this.estado.servicios[empresaId]) this.estado.servicios[empresaId] = [];
    return this.estado.servicios[empresaId];
  }

  private buscarFila(rowIndex: number) {
    for (const [empresaId, filas] of Object.entries(this.estado.extintores)) {
      const fila = filas.find((f) => f.rowIndex === rowIndex);
      if (fila) return { empresaId, fila };
    }
    return null;
  }

  private buscarPorUid(uid: string) {
    for (const [empresaId, filas] of Object.entries(this.estado.extintores)) {
      const fila = filas.find((f) => f.uid === uid);
      if (fila) return { empresaId, fila };
    }
    return null;
  }

  private difundirExtintores(empresaId: string) {
    const rows = this.filasDe(empresaId);
    this.despachar("extintor:updated", { id: empresaId, rows });
    this.despachar("extintor:updated:global", { id: empresaId, rows });
  }

  private difundirServicios(empresaId: string) {
    const lista = this.serviciosDe(empresaId);
    const filtros = new Set(["__todas__", "__sin_sede__", ...(this.estado.sedes[empresaId] || []).map((s) => s.id), ...lista.map((s) => s.sedeId).filter(Boolean)]);
    filtros.forEach((filtro) => {
      this.despachar("servicio:list", {
        empresaId,
        sedeId: filtro === "__todas__" || filtro === "__sin_sede__" ? null : filtro,
        filtro,
        list: ordenarServicios(lista.filter((s) => perteneceAFiltro(s, filtro))),
      });
    });
  }

  private estadoAnterior(empresaId: string, uid: string, servicio: any): string | null {
    const previo = this.serviciosDe(empresaId)
      .filter((s) => s.id !== servicio.id && (s.extintorUids || []).includes(uid) && s.extintorEstados?.[uid]?.estadoExtintor !== undefined && (s.fechaRetiro || "") <= (servicio.fechaRetiro || ""))
      .sort((a, b) => (b.fechaRetiro || "").localeCompare(a.fechaRetiro || ""))[0];
    return previo ? previo.extintorEstados[uid].estadoExtintor : null;
  }

  private encolar(evento: string, datos: Record<string, any>, descripcion: string) {
    this.estado.cola.push({ id: nuevoId(), evento, datos, creadaEn: Date.now(), descripcion });
    queueMicrotask(() => this.guardarAhora());
  }

  private guardarAhora = () => {
    if (this.guardadoPendiente) clearTimeout(this.guardadoPendiente);
    this.guardadoPendiente = null;
    void guardarLocal(this.clave, this.estado);
  };

  private alOcultar = () => {
    if (document.visibilityState === "hidden" && this.guardadoPendiente) this.guardarAhora();
  };

  private addPendiente(uid: string) {
    return this.estado.cola.find((o) => o.evento === "extintor:add" && o.datos.uid === uid);
  }

  private nombreExtintor(fila: any) {
    return fila?.nSerie || fila?.nInterno || "S/N";
  }

  private coincidenciasLocales(filas: any[], datos: Record<string, any>) {
    const serie = normalizar(datos.nSerie);
    const interno = normalizar(datos.nInterno);
    if (!serie && !interno) return [];
    return filas
      .filter((f) => f.estadoExtintor !== "De Baja" && (f.sedeId || null) === (datos.sedeId || null))
      .map((f) => {
        const mSerie = !!serie && serie === normalizar(f.nSerie);
        const mInterno = !!interno && interno === normalizar(f.nInterno);
        if (!mSerie && !mInterno) return null;
        return {
          uid: f.uid, rowIndex: f.rowIndex, nSerie: f.nSerie, nInterno: f.nInterno, marca: f.marca, agenteExtintor: f.agenteExtintor,
          peso: f.peso, unidadPeso: f.unidadPeso, fechaFabricacion: f.fechaFabricacion, mesRealizadoPH: f.mesRealizadoPH,
          realizadoPH: f.realizadoPH, sedeId: f.sedeId, estadoExtintor: f.estadoExtintor,
          nivel: mSerie && mInterno ? "fuerte" : "sospechosa",
          camposCoincidentes: [mSerie && "nSerie", mInterno && "nInterno"].filter(Boolean),
        };
      })
      .filter(Boolean)
      .slice(0, 5);
  }

  private aplicarEscritura(evento: string, d: Record<string, any>): any {
    const e = this.estado;
    let respuesta: any = { success: true, sinSenal: true };

    switch (evento) {
      case "extintor:add": {
        const empresaId = d.id;
        const filas = this.filasDe(empresaId);
        if (!d.confirmarDuplicado) {
          const coincidencias = this.coincidenciasLocales(filas, d);
          if (coincidencias.length > 0) {
            return {
              success: false,
              error: (coincidencias[0] as any).nivel === "fuerte" ? "Ya existe un extintor con datos idénticos registrado" : "Existe un extintor similar ya registrado",
              coincidencias,
            };
          }
        }
        const uid = typeof d.uid === "string" && d.uid ? d.uid : nuevoId();
        if (filas.some((f) => f.uid === uid)) return { success: true, sinSenal: true, uid, rowIndex: filas.find((f) => f.uid === uid)!.rowIndex };
        this.contadorFilas += 1;
        const rowIndex = -(Date.now() * 10 + (this.contadorFilas % 10));
        const fotos = contarFotos(d.evidencia);
        if (fotos > 0) e.evidencias[uid] = d.evidencia;
        filas.push({
          ...SIN_CAMPOS_TECNICOS(d), uid, rowIndex, empresaId, sedeId: d.sedeId ?? null,
          evidencia: fotos > 0 ? "__HAS_EVIDENCIA__" : "", evidenciaCount: fotos, createdAt: new Date().toISOString(),
        });
        this.encolar(evento, { ...d, uid, confirmarDuplicado: true }, `Nuevo extintor ${d.nSerie || d.nInterno || "S/N"}`);
        this.difundirExtintores(empresaId);
        const servicioDestino = d.servicioId ? this.serviciosDe(empresaId).find((s) => s.id === d.servicioId) : null;
        if (servicioDestino) {
          servicioDestino.extintorUids = Array.from(new Set([...(servicioDestino.extintorUids || []), uid]));
          if (d.estadoServicio) servicioDestino.extintorEstados = { ...(servicioDestino.extintorEstados || {}), [uid]: d.estadoServicio };
          this.difundirServicios(empresaId);
        }
        respuesta = { success: true, sinSenal: true, uid, rowIndex, enServicio: !!servicioDestino };
        break;
      }
      case "extintor:update": {
        const encontrado = this.buscarFila(d.rowIndex) ?? (typeof d.uid === "string" && d.uid ? this.buscarPorUid(d.uid) : null);
        if (!encontrado) return { success: false, error: "No se encontró el extintor en este teléfono" };
        const { empresaId, fila } = encontrado;
        const fotos = contarFotos(d.evidencia);
        if (typeof d.evidencia === "string" && d.evidencia !== "__HAS_EVIDENCIA__") {
          if (fotos > 0) e.evidencias[fila.uid] = d.evidencia;
          else delete e.evidencias[fila.uid];
        }
        Object.assign(fila, SIN_CAMPOS_TECNICOS(d), {
          evidencia: fotos > 0 ? "__HAS_EVIDENCIA__" : d.evidencia === "__HAS_EVIDENCIA__" ? fila.evidencia : "",
          evidenciaCount: fotos > 0 ? fotos : d.evidencia === "__HAS_EVIDENCIA__" ? fila.evidenciaCount : 0,
        });
        const pendiente = this.addPendiente(fila.uid);
        if (pendiente) Object.assign(pendiente.datos, SIN_CAMPOS_TECNICOS(d));
        else this.encolar(evento, { ...d, uid: fila.uid }, `Cambios en extintor ${this.nombreExtintor(fila)}`);
        this.difundirExtintores(empresaId);
        break;
      }
      case "extintor:delete": {
        const encontrado = this.buscarFila(d.rowIndex);
        if (!encontrado) return { success: false, error: "No se encontró el extintor en este teléfono" };
        const { empresaId, fila } = encontrado;
        e.extintores[empresaId] = this.filasDe(empresaId).filter((f) => f.uid !== fila.uid);
        if (this.addPendiente(fila.uid)) {
          e.cola = e.cola.filter((o) => o.datos.uid !== fila.uid && o.datos.extintorUid !== fila.uid);
          Object.values(e.servicios).forEach((lista) => lista.forEach((s) => {
            s.extintorUids = (s.extintorUids || []).filter((u: string) => u !== fila.uid);
            if (s.extintorEstados) delete s.extintorEstados[fila.uid];
          }));
          this.difundirServicios(empresaId);
        } else {
          this.encolar(evento, { ...d, uid: fila.uid }, `Eliminar extintor ${this.nombreExtintor(fila)}`);
        }
        this.difundirExtintores(empresaId);
        break;
      }
      case "servicio:save": {
        const lista = this.serviciosDe(d.empresaId);
        const id = typeof d.id === "string" && d.id ? d.id : nuevoId();
        if (lista.some((s) => s.id === id)) return { success: true, sinSenal: true, id };
        lista.push({
          id, empresaId: d.empresaId, sedeId: d.sedeId ?? null, fechaRetiro: d.fechaRetiro || "", fechaEntrega: d.fechaEntrega || "",
          extintorUids: d.extintorUids || [], extintorEstados: {}, notas: d.notas || "",
          secuencia: lista.reduce((m, s) => Math.max(m, s.secuencia || 0), 0) + 1, createdAt: new Date().toISOString(),
        });
        this.encolar(evento, { ...d, id }, `Nuevo servicio del ${(d.fechaRetiro || "").split("-").reverse().join("/") || "—"}`);
        this.difundirServicios(d.empresaId);
        respuesta = { success: true, sinSenal: true, id };
        break;
      }
      case "servicio:addExtintor":
      case "servicio:removeExtintor":
      case "servicio:setExtintorEstado":
      case "servicio:updateDatos": {
        const servicio = this.serviciosDe(d.empresaId).find((s) => s.id === d.id);
        if (!servicio) return { success: false, error: "No se encontró el servicio en este teléfono" };
        const fila = d.uid ? this.buscarPorUid(d.uid)?.fila : null;
        let descripcion = "";
        if (evento === "servicio:addExtintor") {
          if (this.estadoAnterior(d.empresaId, d.uid, servicio) === "De Baja") return { success: false, error: "No se puede asociar un extintor De Baja a un servicio" };
          servicio.extintorUids = Array.from(new Set([...(servicio.extintorUids || []), d.uid]));
          descripcion = `Asociar ${this.nombreExtintor(fila)} al servicio`;
        } else if (evento === "servicio:removeExtintor") {
          servicio.extintorUids = (servicio.extintorUids || []).filter((u: string) => u !== d.uid);
          if (servicio.extintorEstados) delete servicio.extintorEstados[d.uid];
          descripcion = `Quitar ${this.nombreExtintor(fila)} del servicio`;
        } else if (evento === "servicio:setExtintorEstado") {
          servicio.extintorEstados = { ...(servicio.extintorEstados || {}), [d.uid]: d.estado };
          descripcion = `Datos de ${this.nombreExtintor(fila)} en el servicio`;
        } else {
          Object.assign(servicio, { fechaRetiro: d.fechaRetiro, fechaEntrega: d.fechaEntrega, notas: d.notas || "" });
          descripcion = "Fechas del servicio";
        }
        this.encolar(evento, d, descripcion);
        this.difundirServicios(d.empresaId);
        break;
      }
      case "servicio:delete": {
        e.servicios[d.empresaId] = this.serviciosDe(d.empresaId).filter((s) => s.id !== d.id);
        const guardadoPendiente = e.cola.some((o) => o.evento === "servicio:save" && o.datos.id === d.id);
        if (guardadoPendiente) e.cola = e.cola.filter((o) => !(o.evento.startsWith("servicio:") && o.datos.id === d.id));
        else this.encolar(evento, d, "Eliminar servicio");
        this.difundirServicios(d.empresaId);
        break;
      }
      case "empresa:save": {
        const existente = d.id ? e.empresas.find((x) => x.id === d.id) : null;
        const id = existente ? d.id : nuevoId();
        const datos = { ...SIN_CAMPOS_TECNICOS(d), id };
        if (existente) Object.assign(existente, datos);
        else e.empresas = [{ ...datos, slug: slugify(d.razonSocial), sedes: [], createdAt: new Date().toISOString() }, ...e.empresas];
        e.empresa[id] = { ...(e.empresa[id] || {}), ...datos };
        if (!e.extintores[id]) e.extintores[id] = [];
        if (!e.servicios[id]) e.servicios[id] = [];
        this.encolar(evento, { ...d, id }, existente ? `Datos de ${d.razonSocial}` : `Nueva empresa ${d.razonSocial}`);
        this.despachar("empresa:list", e.empresas);
        this.despachar("empresa:data:updated", e.empresa[id]);
        respuesta = { success: true, sinSenal: true, id, slug: slugify(d.razonSocial) };
        break;
      }
      case "ubicacion:registrar": {
        if (!d.id || !d.extintorUid) return { success: false, error: "Ubicación incompleta" };
        const previa = e.ubicaciones[d.extintorUid];
        e.ubicaciones[d.extintorUid] = {
          id: d.id, lat: d.lat, lng: d.lng, precision: d.precision, altitud: d.altitud ?? null,
          referencia: d.referencia || previa?.referencia || "", fotoId: previa?.fotoId ?? null, origen: d.origen || "escaneo",
          usuarioNombre: "Tú", capturadaEn: d.capturadaEn || new Date().toISOString(), lecturas: 1, movido: null, pendiente: true,
        };
        const enCola = e.cola.find((o) => o.evento === evento && o.datos.id === d.id);
        if (enCola) {
          enCola.datos = { ...SIN_CAMPOS_TECNICOS(d), id: d.id };
          queueMicrotask(() => this.guardarAhora());
        } else {
          const fila = this.buscarPorUid(d.extintorUid)?.fila;
          this.encolar(evento, { ...SIN_CAMPOS_TECNICOS(d), id: d.id }, `Ubicación de ${this.nombreExtintor(fila)}`);
        }
        respuesta = { success: true, sinSenal: true, actual: e.ubicaciones[d.extintorUid] };
        break;
      }
      case "insp:registrar": {
        const detalle = e.inspecciones[d.campanaId];
        if (!d.id || !d.extintorUid) return { success: false, error: "Inspección incompleta" };
        const pendiente = e.cola.find((o) => o.evento === evento && o.datos.id === d.id);
        const fotos = { ...(pendiente?.datos.fotos || {}), ...(d.fotos || {}) };
        const completar = { ...(pendiente?.datos.completar || {}), ...(d.completar || {}) };
        const anteriores: string[] = detalle?.registros?.find((r: any) => r.id === d.id)?.fotos || [];
        if (d.estado === "inspeccionado" && ["panoramica", "frontal", "posterior"].some((t) => !fotos[t] && !anteriores.includes(t))) {
          return { success: false, error: "Faltan fotos obligatorias" };
        }
        const datos = { ...SIN_CAMPOS_TECNICOS(d), id: d.id, fotos, completar };
        if (detalle) {
          const { fotos: _f, completar: _c, ...registro } = datos;
          const resto = (detalle.registros || []).filter((r: any) => r.id !== d.id);
          detalle.registros = [...resto, { ...registro, hallazgos: d.hallazgos || [], usuarioNombre: "Tú", levantado: false, fotos: Array.from(new Set([...anteriores, ...Object.keys(fotos)])), pendiente: true }];
          const ext = (detalle.extintores || []).find((x: any) => x.uid === d.extintorUid);
          if (ext) Object.entries(completar).forEach(([k, v]) => { if (v) ext[k] = v; });
          const disp = e.inspDisponibles.find((c: any) => c.id === d.campanaId);
          if (disp) {
            disp.inspeccionados = detalle.registros.filter((r: any) => r.estado === "inspeccionado").length;
            disp.noEncontrados = detalle.registros.filter((r: any) => r.estado === "no_encontrado").length;
          }
        }
        const encontrado = this.buscarPorUid(d.extintorUid);
        if (encontrado && Object.keys(completar).length) {
          Object.entries(completar).forEach(([k, v]) => { if (v) encontrado.fila[k] = v; });
          this.difundirExtintores(encontrado.empresaId);
        }
        if (pendiente) {
          pendiente.datos = datos;
          queueMicrotask(() => this.guardarAhora());
        } else {
          const ext = detalle?.extintores?.find((x: any) => x.uid === d.extintorUid);
          this.encolar(evento, datos, `Inspección de ${ext?.nInterno || ext?.nSerie || "extintor"}`);
        }
        this.despachar("insp:cambio", { campanaId: d.campanaId, local: true });
        break;
      }
      case "ubicacion:anular": {
        const pendiente = e.cola.find((o) => o.evento === "ubicacion:registrar" && o.datos.id === d.id);
        Object.entries(e.ubicaciones).forEach(([uid, u]) => { if (u?.id === d.id) delete e.ubicaciones[uid]; });
        if (pendiente) e.cola = e.cola.filter((o) => o.datos.id !== d.id);
        else this.encolar(evento, { id: d.id }, "Anular ubicación");
        break;
      }
      case "ubicacion:foto": {
        if (!d.id || typeof d.foto !== "string") return { success: false, error: "Foto incompleta" };
        e.cola = e.cola.filter((o) => !(o.evento === evento && o.datos.id === d.id));
        this.encolar(evento, { id: d.id, foto: d.foto }, "Foto del lugar de un extintor");
        break;
      }
      case "sede:save": {
        const sedes = e.sedes[d.empresaId] || (e.sedes[d.empresaId] = []);
        const existente = d.id ? sedes.find((s) => s.id === d.id) : null;
        const id = existente ? d.id : nuevoId();
        const datos = { ...SIN_CAMPOS_TECNICOS(d), id, slug: slugify(d.nombre) };
        if (existente) Object.assign(existente, datos);
        else sedes.push({ ...datos, createdAt: new Date().toISOString() });
        const empresa = e.empresas.find((x) => x.id === d.empresaId);
        if (empresa) empresa.sedes = sedes;
        this.encolar(evento, { ...d, id }, existente ? `Datos de la sede ${d.nombre}` : `Nueva sede ${d.nombre}`);
        this.despachar("sede:list", { empresaId: d.empresaId, list: sedes });
        this.despachar("empresa:list", e.empresas);
        respuesta = { success: true, sinSenal: true, id, slug: datos.slug };
        break;
      }
    }

    this.persistir();
    return respuesta;
  }

  private responderLectura(evento: string, d: Record<string, any>, ack: Oyente | null) {
    const e = this.estado;
    switch (evento) {
      case "empresa:list":
        this.despachar("empresa:list", e.empresas);
        return;
      case "empresa:get": {
        const empresa = e.empresa[d.id] || e.empresas.find((x) => x.id === d.id);
        if (empresa) this.despachar("empresa:data", empresa);
        return;
      }
      case "sede:list":
        this.despachar("sede:list", { empresaId: d.empresaId, list: e.sedes[d.empresaId] || [] });
        return;
      case "extintor:list":
        this.despachar("extintor:updated", { id: d.id, rows: e.extintores[d.id] || [] });
        return;
      case "extintor:listGlobal":
        this.despachar("extintor:updated:global", { id: d.id, rows: e.extintores[d.id] || [] });
        return;
      case "servicio:list": {
        const filtro = claveSede(d.sedeId);
        const lista = (e.servicios[d.empresaId] || []).filter((s) => perteneceAFiltro(s, filtro));
        this.despachar("servicio:list", { empresaId: d.empresaId, sedeId: d.sedeId ?? null, filtro, list: ordenarServicios(lista) });
        return;
      }
      case "servicio:listByExtintor": {
        const lista = (e.servicios[d.empresaId] || []).filter((s) => (s.extintorUids || []).includes(d.uid));
        this.despachar("servicio:listByExtintor", { empresaId: d.empresaId, uid: d.uid, list: ordenarServicios(lista) });
        return;
      }
      case "traslado:list":
        this.despachar("traslado:list", { extintorUid: d.extintorUid, list: e.traslados[d.extintorUid] || [] });
        return;
      case "extintor:scan": {
        const encontrado = this.buscarPorUid(d.uid);
        if (!encontrado) {
          ack?.({ success: false, error: "Este extintor no está guardado en el teléfono. Escanéalo cuando vuelva la señal." });
          return;
        }
        const empresa = e.empresas.find((x) => x.id === encontrado.empresaId);
        const sede = (e.sedes[encontrado.empresaId] || []).find((s) => s.id === encontrado.fila.sedeId);
        ack?.({
          success: true,
          extintor: encontrado.fila,
          empresa: { id: encontrado.empresaId, razonSocial: empresa?.razonSocial || "Empresa" },
          sede: sede ? { id: sede.id, nombre: sede.nombre } : null,
          servicios: ordenarServicios((e.servicios[encontrado.empresaId] || []).filter((s) => (s.extintorUids || []).includes(d.uid))),
          traslados: e.traslados[d.uid] || [],
        });
        return;
      }
      case "extintor:evidencia:get": {
        const fila = this.buscarFila(d.rowIndex)?.fila;
        const evidencia = fila ? e.evidencias[fila.uid] : null;
        ack?.(evidencia
          ? { success: true, evidencia }
          : { success: false, error: "Las fotos anteriores de este extintor se verán cuando vuelva la señal" });
        return;
      }
      case "catalog:list":
        ack?.(e.catalogos || { success: false, error: SIN_CONEXION });
        return;
      case "voz:correcciones:list":
        ack?.({ success: true, correcciones: {} });
        return;
      case "ubicacion:sede": {
        const filas = (e.extintores[d.empresaId] || []).filter((f) => d.sedeId === undefined || (d.sedeId === null ? !f.sedeId : f.sedeId === d.sedeId));
        ack?.({
          success: true, sinSenal: true, empresaId: d.empresaId, sedeId: d.sedeId,
          extintores: filas.map((f) => ({
            uid: f.uid, rowIndex: f.rowIndex, nSerie: f.nSerie, nInterno: f.nInterno, marca: f.marca, area: f.area, estadoExtintor: f.estadoExtintor,
            agenteExtintor: f.agenteExtintor, peso: f.peso, unidadPeso: f.unidadPeso, sedeId: f.sedeId ?? null, ubicacion: e.ubicaciones[f.uid] ?? null,
          })),
        });
        return;
      }
      case "ubicacion:extintor":
        ack?.({ success: true, sinSenal: true, uid: d.uid, actual: e.ubicaciones[d.uid] ?? null, historial: [] });
        return;
      case "ubicacion:foto:get":
        ack?.({ success: false, error: "La foto del lugar se verá cuando vuelva la señal" });
        return;
      case "insp:disponibles":
        ack?.({ success: true, sinSenal: true, lista: e.inspDisponibles });
        return;
      case "insp:detalle": {
        const detalle = e.inspecciones[d.id];
        ack?.(detalle ? { success: true, sinSenal: true, ...detalle } : { success: false, error: "Abre esta inspección una vez con señal para poder usarla sin señal." });
        return;
      }
      case "insp:foto:get":
        ack?.({ success: false, error: "Las fotos se verán cuando vuelva la señal" });
        return;
      default:
        return;
    }
  }

  private prepararEnvio(op: Pick<Operacion, "datos">) {
    const datos = { ...op.datos };
    if (typeof datos.rowIndex === "number" && datos.rowIndex < 0 && datos.uid) {
      const real = this.estado.filasReales[datos.uid] ?? this.buscarPorUid(datos.uid)?.fila?.rowIndex;
      if (typeof real === "number" && real > 0) datos.rowIndex = real;
    }
    return datos;
  }

  private enviar(evento: string, datos: Record<string, any>) {
    return new Promise<{ respondio: boolean; res?: any }>((resolver) => {
      this.real.timeout(ESPERA_RESPUESTA_MS).emit(evento, datos, (err: Error | null, res: any) => {
        resolver(err ? { respondio: false } : { respondio: true, res });
      });
    });
  }

  private quitarDeCola(op: Operacion) {
    this.estado.cola = this.estado.cola.filter((o) => o !== op);
  }

  private async enviarPorPartes(op: Operacion, datos: Record<string, any>) {
    const texto = JSON.stringify(datos);
    const firma = firmaDe(texto);
    if (!op.envio || op.envio.firma !== firma) op.envio = { id: nuevoId(), firma, enviadas: 0 };
    const envio = op.envio;
    const total = Math.ceil(texto.length / TAM_TROZO);
    let reinicios = 0;
    let ultimoGuardado = Date.now();
    while (envio.enviadas < total) {
      if (!this.real.connected) return { respondio: false };
      this.progreso = { descripcion: op.descripcion, enviadas: envio.enviadas, total };
      this.notificar();
      const inicio = Date.now();
      const parte = texto.slice(envio.enviadas * TAM_TROZO, (envio.enviadas + 1) * TAM_TROZO);
      const r = await new Promise<{ respondio: boolean; res?: any }>((resolver) => {
        this.real.timeout(ESPERA_TROZO_MS).emit("envio:trozo", { envioId: envio.id, evento: op.evento, indice: envio.enviadas, total, parte }, (err: Error | null, res: any) => {
          resolver(err ? { respondio: false } : { respondio: true, res });
        });
      });
      if (!r.respondio) {
        this.marcarSenal(false);
        return { respondio: false };
      }
      const res = r.res;
      if (res?.reiniciar) {
        reinicios += 1;
        if (reinicios > 3) return { respondio: false };
        envio.enviadas = 0;
        continue;
      }
      if (res?.success === false) return { respondio: true, res };
      if (res?.completo) return { respondio: true, res: res.respuesta };
      envio.enviadas += 1;
      this.marcarSenal(Date.now() - inicio < SENAL_BUENA_MS * 2);
      if (Date.now() - ultimoGuardado > 3000) {
        ultimoGuardado = Date.now();
        this.guardarAhora();
      }
    }
    return { respondio: false };
  }

  private enviarOperacion(op: Operacion, datos: Record<string, any>) {
    if (this.soportaPartes && JSON.stringify(datos).length > TAM_TROZO * 2) return this.enviarPorPartes(op, datos);
    return this.enviar(op.evento, datos);
  }

  private async sincronizar() {
    if (this.sincronizando || !this.real.connected) return;
    this.sincronizando = true;
    this.notificar();
    let enviados = 0;
    let fallidos = 0;

    while (this.estado.cola.length > 0 && this.real.connected) {
      const op = this.estado.cola.find((o) => !DIFERIBLES.has(o.evento)) || this.estado.cola[0];
      const datos = this.prepararEnvio(op);
      if (typeof datos.rowIndex === "number" && datos.rowIndex < 0) {
        this.quitarDeCola(op);
        this.estado.fallidas.push({ ...op, error: "El extintor original no llegó al servidor" });
        fallidos += 1;
        this.persistir();
        continue;
      }
      const firmaAntes = firmaDe(JSON.stringify(op.datos));
      const { respondio, res } = await this.enviarOperacion(op, datos);
      this.progreso = null;
      if (!respondio || res?.sesionInvalida) {
        if (!respondio) this.programarReintento();
        this.persistir();
        break;
      }
      const cambioMientrasSeEnviaba = res?.success !== false && firmaDe(JSON.stringify(op.datos)) !== firmaAntes;
      if (cambioMientrasSeEnviaba && op.evento === "extintor:add" && typeof res?.rowIndex === "number") {
        const { servicioId: _s, estadoServicio: _e, confirmarDuplicado: _c, ...resto } = op.datos;
        this.estado.filasReales[op.datos.uid] = res.rowIndex;
        op.evento = "extintor:update";
        op.datos = { ...resto, rowIndex: res.rowIndex };
        op.envio = undefined;
        enviados += 1;
        this.persistir();
        continue;
      }
      if (cambioMientrasSeEnviaba && op.evento !== "extintor:add") {
        op.envio = undefined;
        this.persistir();
        continue;
      }
      this.quitarDeCola(op);
      if (res?.success === false) {
        this.estado.fallidas.push({ ...op, error: res.error || "El servidor rechazó el cambio" });
        fallidos += 1;
      } else {
        enviados += 1;
        if (op.evento === "extintor:add" && typeof res?.rowIndex === "number") {
          this.estado.filasReales[op.datos.uid] = res.rowIndex;
        }
        if (op.evento === "ubicacion:registrar" && res?.actual) this.estado.ubicaciones[op.datos.extintorUid] = res.actual;
      }
      this.persistir();
    }

    this.sincronizando = false;
    if (this.estado.cola.length === 0) {
      if (Object.keys(this.estado.filasReales).length > 300) this.estado.filasReales = {};
      this.persistir();
      this.real.emit("empresa:list");
      this.despachar("connect");
      if (enviados + fallidos > 0) this.alTerminarSincronizacion?.(enviados, fallidos);
    } else {
      this.notificar();
    }
  }
}
