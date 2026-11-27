import type { Socket } from "socket.io-client";
import { nuevoUid } from "../../../utils/extintores";
import { CapturadorGPS, type ResumenCaptura } from "./CapturadorGPS";

type Origen = "escaneo" | "formulario";

type Sesion = {
  id: string;
  uid: string | null;
  origen: Origen;
  servicioId: string | null;
  referencia: string;
  foto: string;
  fotoEnviada: boolean;
  guardar: boolean;
  registrada: boolean;
  precisionRegistrada: number;
  empezo: number;
};

export type ResumenRastreo = {
  activa: boolean;
  uid: string | null;
  origen: Origen | null;
  guardar: boolean;
  referencia: string;
  foto: string;
  registrada: boolean;
  captura: ResumenCaptura;
};

const ESPERA_AUTOREGISTRO_MS = 25_000;
const VIGENCIA_ESCANEO_MS = 15 * 60_000;

class RastreoUbicacion {
  private sesion: Sesion | null = null;
  private socket: Socket | null = null;
  private oyentes = new Set<() => void>();
  private cache: ResumenRastreo | null = null;
  private autoregistro: ReturnType<typeof setTimeout> | null = null;
  private capturador = new CapturadorGPS(() => this.alCambiarCaptura());

  conectar(socket: Socket | null) {
    this.socket = socket;
  }

  suscribir = (fn: () => void) => {
    this.oyentes.add(fn);
    return () => { this.oyentes.delete(fn); };
  };

  resumen = (): ResumenRastreo => {
    if (!this.cache) {
      const s = this.sesion;
      this.cache = {
        activa: !!s, uid: s?.uid ?? null, origen: s?.origen ?? null, guardar: s?.guardar ?? false,
        referencia: s?.referencia ?? "", foto: s?.foto ?? "", registrada: s?.registrada ?? false,
        captura: this.capturador.resumen(),
      };
    }
    return this.cache;
  };

  alEscanear(uid: string, servicioId?: string | null) {
    if (this.sesion?.uid === uid && Date.now() - this.sesion.empezo < VIGENCIA_ESCANEO_MS) {
      if (!this.capturador.activo && !this.capturador.lectura()) this.capturador.iniciar();
      return;
    }
    this.cerrar();
    this.nueva(uid, "escaneo", true, servicioId ?? null);
    this.programarAutoregistro();
  }

  alAbrirFormulario(uid: string | null, esNuevo: boolean, servicioId?: string | null) {
    const s = this.sesion;
    if (s && uid && s.uid === uid && Date.now() - s.empezo < VIGENCIA_ESCANEO_MS) {
      if (servicioId) s.servicioId = servicioId;
      if (!this.capturador.activo && !this.capturador.lectura()) this.capturador.iniciar();
      this.notificar();
      return;
    }
    this.cerrar();
    this.nueva(uid, "formulario", esNuevo, servicioId ?? null);
  }

  alCancelarFormulario() {
    if (this.sesion?.origen === "formulario") this.cerrar();
  }

  alGuardarExtintor(uid: string) {
    const s = this.sesion;
    if (!s) return;
    if (s.uid && s.uid !== uid) return;
    s.uid = uid;
    if (s.guardar) this.registrar("guardado");
    this.cerrar();
  }

  setGuardar(valor: boolean) {
    if (!this.sesion) return;
    this.sesion.guardar = valor;
    if (!valor && this.sesion.registrada) {
      this.socket?.emit("ubicacion:anular", { id: this.sesion.id }, () => undefined);
      this.sesion.registrada = false;
      this.sesion.fotoEnviada = false;
      this.sesion.precisionRegistrada = Infinity;
      this.sesion.id = nuevoUid();
    }
    if (valor && !this.capturador.activo && !this.capturador.lectura()) this.capturador.iniciar();
    this.notificar();
  }

  setReferencia(texto: string) {
    if (!this.sesion) return;
    this.sesion.referencia = texto.slice(0, 300);
    this.notificar();
  }

  setFoto(foto: string) {
    if (!this.sesion) return;
    this.sesion.foto = foto;
    this.sesion.fotoEnviada = false;
    this.notificar();
  }

  afinar() {
    if (!this.sesion) return;
    this.sesion.guardar = true;
    this.capturador.iniciar();
    this.notificar();
  }

  private nueva(uid: string | null, origen: Origen, guardar: boolean, servicioId: string | null) {
    this.sesion = { id: nuevoUid(), uid, origen, servicioId, referencia: "", foto: "", fotoEnviada: false, guardar, registrada: false, precisionRegistrada: Infinity, empezo: Date.now() };
    this.capturador.iniciar();
    this.notificar();
  }

  private cerrar() {
    if (this.autoregistro) clearTimeout(this.autoregistro);
    this.autoregistro = null;
    const s = this.sesion;
    const lectura = this.capturador.lectura();
    const pendiente = !!s && (!s.registrada || (!!s.foto && !s.fotoEnviada) || (!!lectura && lectura.precision < s.precisionRegistrada - 0.5));
    if (s && s.origen === "escaneo" && s.guardar && s.uid && pendiente) this.registrar("escaneo");
    this.capturador.detener();
    this.sesion = null;
    this.notificar();
  }

  private programarAutoregistro() {
    if (this.autoregistro) clearTimeout(this.autoregistro);
    this.autoregistro = setTimeout(() => {
      this.autoregistro = null;
      if (this.sesion && this.sesion.guardar && !this.sesion.registrada) this.registrar("escaneo");
    }, ESPERA_AUTOREGISTRO_MS);
  }

  private alCambiarCaptura() {
    const s = this.sesion;
    const lectura = this.capturador.lectura();
    if (s && s.origen === "escaneo" && s.guardar && lectura) {
      const mejoro = s.registrada && !this.capturador.activo && lectura.precision < s.precisionRegistrada - 0.5;
      if (mejoro) this.registrar("escaneo");
    }
    this.notificar();
  }

  private registrar(origen: "escaneo" | "guardado") {
    const s = this.sesion;
    const lectura = this.capturador.lectura();
    if (!s || !s.uid || !lectura || !this.socket) return;
    this.socket.emit("ubicacion:registrar", {
      id: s.id, extintorUid: s.uid, ...lectura, referencia: s.referencia, origen, servicioId: s.servicioId, capturadaEn: new Date().toISOString(),
    }, () => undefined);
    if (s.foto && !s.fotoEnviada) {
      this.socket.emit("ubicacion:foto", { id: s.id, foto: s.foto }, () => undefined);
      s.fotoEnviada = true;
    }
    s.registrada = true;
    s.precisionRegistrada = lectura.precision;
  }

  private notificar() {
    this.cache = null;
    this.oyentes.forEach((fn) => fn());
  }
}

export const rastreoUbicacion = new RastreoUbicacion();
