import type { Socket } from "socket.io-client";
import { guardarLocal, leerLocal } from "./almacenLocal";

type Oyente = (...args: any[]) => void;

export type Operacion = {
  id: string;
  evento: string;
  datos: Record<string, any>;
  creadaEn: number;
  descripcion: string;
  error?: string;
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
};

export type ResumenSinSenal = {
  listo: boolean;
  conectado: boolean;
  sincronizando: boolean;
  pendientes: number;
  fallidas: Operacion[];
  empresasDisponibles: Set<string>;
  catalogos: any | null;
};

const estadoVacio = (): EstadoLocal => ({
  empresas: [], empresa: {}, sedes: {}, extintores: {}, servicios: {}, traslados: {},
  evidencias: {}, catalogos: null, cola: [], fallidas: [], filasReales: {},
});

const ESCRITURAS_SIN_SENAL = new Set([
  "extintor:add", "extintor:update", "extintor:delete",
  "servicio:save", "servicio:addExtintor", "servicio:removeExtintor", "servicio:setExtintorEstado", "servicio:updateDatos", "servicio:delete",
  "empresa:save", "sede:save",
]);

const LECTURAS_SIN_SENAL = new Set([
  "empresa:list", "empresa:get", "sede:list", "extintor:list", "extintor:listGlobal", "servicio:list", "servicio:listByExtintor",
  "extintor:scan", "extintor:evidencia:get", "traslado:list", "catalog:list", "voz:correcciones:list", "auth:verify",
]);

const EVENTOS_RESERVADOS = new Set(["disconnect", "connect_error"]);

const LISTAS_DEL_SERVIDOR = new Set([
  "empresa:list", "empresa:data", "empresa:data:updated", "sede:list",
  "extintor:updated", "extintor:updated:global", "servicio:list", "servicio:listByExtintor",
]);

const SIN_CONEXION = "Esta acción necesita conexión a internet. Inténtalo cuando vuelva la señal.";
const ESPERA_RESPUESTA_MS = 30000;

const nuevoId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

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

  constructor(real: Socket, usuarioId: string) {
    this.real = real;
    this.clave = `estado-${usuarioId}`;
    this.real.onAny(this.recibirDelServidor);
    this.real.on("connect", this.alConectar);
    this.real.on("disconnect", this.notificar);
  }

  async iniciar() {
    const guardado = await leerLocal<EstadoLocal>(this.clave);
    if (guardado) this.estado = { ...estadoVacio(), ...guardado };
    this.listo = true;
    this.notificar();
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
    this.real.off("disconnect", this.notificar);
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
        conectado: this.real.connected,
        sincronizando: this.sincronizando,
        pendientes: this.estado.cola.length,
        fallidas: this.estado.fallidas,
        empresasDisponibles: new Set(Object.keys(this.estado.extintores)),
        catalogos: this.estado.catalogos,
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

    if (alDia) {
      if (evento === "extintor:list" && datos.sedeId) {
        this.real.emit(evento, { id: datos.id }, ...args.slice(1));
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

  private encolar(evento: string, datos: Record<string, any>, descripcion: string) {
    this.estado.cola.push({ id: nuevoId(), evento, datos, creadaEn: Date.now(), descripcion });
  }

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
        const uid = nuevoId();
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
        respuesta = { success: true, sinSenal: true, uid, rowIndex };
        break;
      }
      case "extintor:update": {
        const encontrado = this.buscarFila(d.rowIndex);
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
          e.cola = e.cola.filter((o) => o.datos.uid !== fila.uid);
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
        const id = nuevoId();
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
          if (fila?.estadoExtintor === "De Baja") return { success: false, error: "No se puede asociar un extintor De Baja a un servicio" };
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
      default:
        return;
    }
  }

  private prepararEnvio(op: Operacion) {
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

  private async sincronizar() {
    if (this.sincronizando || !this.real.connected) return;
    this.sincronizando = true;
    this.notificar();
    let enviados = 0;
    let fallidos = 0;

    while (this.estado.cola.length > 0 && this.real.connected) {
      const op = this.estado.cola[0];
      const datos = this.prepararEnvio(op);
      if (typeof datos.rowIndex === "number" && datos.rowIndex < 0) {
        this.estado.cola.shift();
        this.estado.fallidas.push({ ...op, error: "El extintor original no llegó al servidor" });
        fallidos += 1;
        this.persistir();
        continue;
      }
      const { respondio, res } = await this.enviar(op.evento, datos);
      if (!respondio || res?.sesionInvalida) break;
      this.estado.cola.shift();
      if (res?.success === false) {
        this.estado.fallidas.push({ ...op, error: res.error || "El servidor rechazó el cambio" });
        fallidos += 1;
      } else {
        enviados += 1;
        if (op.evento === "extintor:add" && typeof res?.rowIndex === "number") {
          this.estado.filasReales[op.datos.uid] = res.rowIndex;
        }
      }
      this.persistir();
    }

    this.sincronizando = false;
    if (this.estado.cola.length === 0) {
      this.estado.filasReales = {};
      this.persistir();
      this.real.emit("empresa:list");
      this.despachar("connect");
      if (enviados + fallidos > 0) this.alTerminarSincronizacion?.(enviados, fallidos);
    } else {
      this.notificar();
    }
  }
}
