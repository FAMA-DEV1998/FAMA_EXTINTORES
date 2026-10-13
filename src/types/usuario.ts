export type RolUsuario = "worker" | "admin" | "boss";

export type Usuario = { id: string; username: string; role: RolUsuario; displayName: string; token?: string };
