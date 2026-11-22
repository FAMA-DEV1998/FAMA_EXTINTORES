import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { BACKEND_URL, cargarBackendUrl } from "../config/backend";
import { tokenSesion } from "../config/sesion";

export type Catalogs = {
    marcas: { id: number; type: string; value: string }[];
    agentes: { id: number; type: string; value: string }[];
    recargas: { id: number; type: string; value: string }[];
    motivosBaja: { id: number; type: string; value: string }[];
    serviciosExtra: { id: number; type: string; value: string }[];
    categoriasInventario: { id: number; type: string; value: string }[];
    capacidades: { id: number; type: string; value: string }[];
    etiquetasCertificado: { id: number; type: string; value: string }[];
};

const AVISO_DESCONEXION_MS = 5000;

export function useSocket(userId: string, onLogout: () => void, modoSinSenal = false) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [url, setUrl] = useState(BACKEND_URL);
    const [connected, setConnected] = useState(false);
    const [catalogs, setCatalogs] = useState<Catalogs>({ marcas: [], agentes: [], recargas: [], motivosBaja: [], serviciosExtra: [], categoriasInventario: [], capacidades: [], etiquetasCertificado: [] });

    useEffect(() => {
        const s = io(url, { auth: (cb) => cb({ token: tokenSesion() }) });
        setSocket(s);

        let seDesconecto = false;
        let avisoDesconexion: ReturnType<typeof setTimeout> | null = null;

        let ultimaConsulta = 0;
        s.on("connect_error", () => {
            if (Date.now() - ultimaConsulta < 20000) return;
            ultimaConsulta = Date.now();
            cargarBackendUrl().then((cambio) => { if (cambio) setUrl(BACKEND_URL); });
        });

        s.on("connect", () => {
            setConnected(true);
            if (avisoDesconexion) {
                clearTimeout(avisoDesconexion);
                avisoDesconexion = null;
            } else if (seDesconecto) {
                toast.success("Conexión restablecida", { id: "estado-conexion" });
            }
            seDesconecto = false;
            s.emit("empresa:list");
            s.emit("catalog:list", {}, (res: any) => {
                if (res?.success) setCatalogs({ marcas: res.marcas, agentes: res.agentes, recargas: res.recargas, motivosBaja: res.motivosBaja, serviciosExtra: res.serviciosExtra, categoriasInventario: res.categoriasInventario, capacidades: res.capacidades, etiquetasCertificado: res.etiquetasCertificado });
            });
            s.emit("auth:verify", { id: userId }, (res: any) => {
                if (res && res.valid === false) {
                    toast("Por seguridad, vuelve a iniciar sesión.", { id: "sesion-invalida" });
                    onLogout();
                }
            });
        });

        s.on("disconnect", (motivo) => {
            if (motivo === "io client disconnect") {
                setConnected(false);
                return;
            }
            seDesconecto = true;
            if (avisoDesconexion) clearTimeout(avisoDesconexion);
            avisoDesconexion = setTimeout(() => {
                avisoDesconexion = null;
                setConnected(false);
                if (modoSinSenal) toast("Sin señal. Puedes seguir trabajando: los cambios se enviarán al volver la conexión.", { id: "estado-conexion", duration: 6000 });
                else toast.loading("Sin conexión. Reintentando…", { id: "estado-conexion" });
            }, AVISO_DESCONEXION_MS);
        });

        s.on("auth:force_logout", (data: { userId: string }) => {
            if (data.userId === userId) onLogout();
        });

        s.on("auth:sesion_invalida", () => {
            toast.error("Tu sesión expiró. Vuelve a iniciar sesión.", { id: "sesion-invalida" });
            onLogout();
        });

        s.on("catalog:updated", (data: Catalogs) => {
            setCatalogs(data);
        });

        return () => {
            if (avisoDesconexion) clearTimeout(avisoDesconexion);
            toast.dismiss("estado-conexion");
            s.disconnect();
        };
    }, [userId, onLogout, modoSinSenal, url]);

    return { socket, connected, catalogs };
}
