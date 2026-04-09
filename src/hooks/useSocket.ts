import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL
    || (import.meta.env.DEV ? `http://${window.location.hostname}:3001` : "");

export function useSocket(userId: string, onLogout: () => void) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const s = io(BACKEND);
        setSocket(s);

        s.on("connect", () => {
            setConnected(true);
            s.emit("empresa:list");
            s.emit("auth:verify", { id: userId }, (res: any) => {
                if (res && res.valid === false) onLogout();
            });
        });

        s.on("disconnect", () => {
            setConnected(false);
        });

        s.on("auth:force_logout", (data: { userId: string }) => {
            if (data.userId === userId) onLogout();
        });

        return () => {
            s.disconnect();
        };
    }, [userId, onLogout]);

    return { socket, connected };
}