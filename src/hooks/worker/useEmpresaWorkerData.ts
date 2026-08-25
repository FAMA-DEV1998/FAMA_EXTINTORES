import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { EmpresaItem, EmpresaData, Extintor, WorkerView as View } from "../../types";
import { emptyEmpresa } from "../../utils/helpers";

export function useEmpresaWorkerData(
    socket: Socket | null,
    setView: (v: View) => void,
    showToast: (msg: string, type?: "ok" | "err") => void,
    setSaving: (v: boolean) => void
) {
    const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
    const [activeId, setActiveId] = useState("");
    const activeIdRef = useRef("");
    const [empresa, setEmpresa] = useState<EmpresaData>(emptyEmpresa());
    const [extintores, setExtintores] = useState<Extintor[]>([]);
    const [extintoresGlobal, setExtintoresGlobal] = useState<Extintor[]>([]);
    const [activeSedeId, setActiveSedeId] = useState<string | null>(null);
    const activeSedeIdRef = useRef<string | null>(null);

    const changeActiveId = useCallback((name: string) => {
        activeIdRef.current = name;
        setActiveId(name);
    }, []);

    // ── socket ───────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const onEmpresaList = (list: EmpresaItem[]) => {
            setEmpresas(list);
            if (activeIdRef.current) {
                const stillExists = list.some((e) => e.id === activeIdRef.current);
                if (!stillExists) {
                    changeActiveId("");
                    setView("home");
                    showToast("La empresa activa fue eliminada", "err");
                }
            }
        };

        const onEmpresaDataUpdated = (data: EmpresaData) => {
            if (data.id === activeIdRef.current) setEmpresa((p) => ({ ...p, ...data }));
            setEmpresas((prev) => prev.map((e) => e.id === data.id ? { ...e, razonSocial: data.razonSocial || e.razonSocial } : e));
        };

        const onEmpresaData = (data: EmpresaData) => {
            if (data.id === activeIdRef.current) setEmpresa({ ...emptyEmpresa(), ...data });
        };

        const onExtintorUpdated = ({ id, rows }: { id: string; rows: Extintor[] }) => {
            if (id !== activeIdRef.current) return;
            const scoped = activeSedeIdRef.current
                ? rows.filter((r) => r.sedeId === activeSedeIdRef.current)
                : rows;
            setExtintores(scoped);
        };

        const onExtintorUpdatedGlobal = ({ id, rows }: { id: string; rows: Extintor[] }) => {
            if (id === activeIdRef.current) setExtintoresGlobal(rows);
        };

        socket.on("empresa:list", onEmpresaList);
        socket.on("empresa:data:updated", onEmpresaDataUpdated);
        socket.on("empresa:data", onEmpresaData);
        socket.on("extintor:updated", onExtintorUpdated);
        socket.on("extintor:updated:global", onExtintorUpdatedGlobal);

        return () => {
            socket.off("empresa:list", onEmpresaList);
            socket.off("empresa:data:updated", onEmpresaDataUpdated);
            socket.off("empresa:data", onEmpresaData);
            socket.off("extintor:updated", onExtintorUpdated);
            socket.off("extintor:updated:global", onExtintorUpdatedGlobal);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, changeActiveId]);

    const selectEmpresa = (id: string) => {
        if (!socket) return;
        changeActiveId(id);
        activeSedeIdRef.current = null;
        setActiveSedeId(null);
        socket.emit("empresa:get", { id });
        socket.emit("extintor:list", { id });
        socket.emit("extintor:listGlobal", { id });
        setView("todos");
    };

    const changeActiveSede = (sedeId: string | null) => {
        activeSedeIdRef.current = sedeId;
        setActiveSedeId(sedeId);
        if (!socket || !activeIdRef.current) return;
        socket.emit("extintor:list", sedeId ? { id: activeIdRef.current, sedeId } : { id: activeIdRef.current });
    };

    const handleEmpresaSave = () => {
        if (!socket) return;
        setSaving(true);
        const payload = { ...empresa, ...(activeIdRef.current ? { id: activeIdRef.current } : {}) };
        socket.emit("empresa:save", payload, (res: any) => {
            setSaving(false);
            if (res?.success) {
                showToast("Empresa guardada ✓");
                changeActiveId(res.id);
                socket.emit("extintor:list", { id: res.id });
                socket.emit("extintor:listGlobal", { id: res.id });
                setView("todos");
            } else showToast(res?.error || "Error al guardar", "err");
        });
    };

    return {
        empresas,
        activeId,
        activeIdRef,
        empresa,
        setEmpresa,
        extintores,
        extintoresGlobal,
        activeSedeId,
        changeActiveSede,
        changeActiveId,
        selectEmpresa,
        handleEmpresaSave,
    };
}