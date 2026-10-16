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

export function useSocket(userId: string, onLogout: () => void, modoSinSenal = false) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [url, setUrl] = useState(BACKEND_URL);
    const [connected, setConnected] = useState(false);
    const [catalogs, setCatalogs] = useState<Catalogs>({ marcas: [], agentes: [], recargas: [], motivosBaja: [], serviciosExtra: [], categoriasInventario: [], capacidades: [], etiquetasCertificado: [] });

    useEffect(() => {
        const s = io(url, { auth: (cb) => cb({ token: tokenSesion() }) });
        setSocket(s);

        let seDesconecto = false;

        // Si el servidor se reinició, su túnel tiene otra dirección: se consulta y se reconecta solo
        let ultimaConsulta = 0;
        s.on("connect_error", () => {
            if (Date.now() - ultimaConsulta < 20000) return;
            ultimaConsulta = Date.now();
            cargarBackendUrl().then((cambio) => { if (cambio) setUrl(BACKEND_URL); });
        });

        s.on("connect", () => {
            setConnected(true);
            if (seDesconecto) {
                toast.success("Conexión restablecida", { id: "estado-conexion" });
                seDesconecto = false;
            }
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
            setConnected(false);
            if (motivo === "io client disconnect") return;
            seDesconecto = true;
            if (modoSinSenal) toast("Sin señal. Puedes seguir trabajando: los cambios se enviarán al volver la conexión.", { id: "estado-conexion", duration: 6000 });
            else toast.loading("Sin conexión. Reintentando…", { id: "estado-conexion" });
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
            toast.dismiss("estado-conexion");
            s.disconnect();
        };
    }, [userId, onLogout, modoSinSenal, url]);

    return { socket, connected, catalogs };
}
