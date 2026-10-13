import { io } from "socket.io-client";
import type { Usuario } from "../types";
import { BACKEND_URL } from "./backend";

const SESION_STORAGE_KEY = "fama_user";

export const leerSesion = (): Usuario | null => {
  const stored = localStorage.getItem(SESION_STORAGE_KEY);
  if (!stored) return null;
  try {
    const usuario = JSON.parse(stored) as Usuario;
    if (!usuario?.token) {
      localStorage.removeItem(SESION_STORAGE_KEY);
      return null;
    }
    return usuario;
  } catch {
    localStorage.removeItem(SESION_STORAGE_KEY);
    return null;
  }
};

export const guardarSesion = (usuario: Usuario) => localStorage.setItem(SESION_STORAGE_KEY, JSON.stringify(usuario));

export const tokenSesion = (): string | undefined => leerSesion()?.token;

export const cerrarSesion = () => {
  const token = tokenSesion();
  localStorage.removeItem(SESION_STORAGE_KEY);
  if (!token) return;
  const s = io(BACKEND_URL, { auth: { token }, reconnection: false, timeout: 4000 });
  const terminar = () => s.disconnect();
  s.on("connect", () => s.emit("auth:logout", {}, terminar));
  s.on("connect_error", terminar);
  setTimeout(terminar, 5000);
};
