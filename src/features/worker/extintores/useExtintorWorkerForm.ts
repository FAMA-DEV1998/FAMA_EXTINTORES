import { useState } from "react";
import type { Socket } from "socket.io-client";
import type { Extintor, ExtintorFormData, WorkerView as View } from "../../../types";
import { emptyExtintorForm, getCamposFaltantes } from "../../../utils/extintores";
import { confirmar, toastAviso } from "../../../components/ui/Notificaciones";
import { estadoBloqueaServicio, estadoBloqueaServicioExtra, estadoBloqueaComponentes, estadoSoloPermiteRecarga } from "../../../utils/estadosExtintor";
import { calcularVencimientoPH } from "../../../utils/pruebaHidrostatica";

export function useExtintorWorkerForm(
    socket: Socket | null,
    role: string,
    activeId: string,
    setView: (v: View) => void,
    showToast: (msg: string, type?: "ok" | "err") => void,
    setSaving: (v: boolean) => void,
    clearFormBackup: () => void,
    activeSedeId?: string | null
) {
    const [form, setForm] = useState<ExtintorFormData>(emptyExtintorForm());
    const [editingRow, setEditingRow] = useState<number | null>(null);
    const [returnView, setReturnView] = useState<View>("todos");
    const [coincidencias, setCoincidencias] = useState<{ uid: string; rowIndex: number; nSerie: string; nInterno: string; marca: string; agenteExtintor: string; peso: string; unidadPeso: string; fechaFabricacion: string; mesRealizadoPH: string; realizadoPH: string; sedeId: string | null; estadoExtintor: string; nivel: "fuerte" | "sospechosa"; camposCoincidentes: string[] }[] | null>(null);
    const [lastSavedExtintor, setLastSavedExtintor] = useState<{ uid: string; isNew: boolean; estado: Record<string, any> } | null>(null);
    const clearLastSavedExtintor = () => setLastSavedExtintor(null);

    const handleRealizadoPH = (val: string) => {
        setForm((p) => ({
            ...p,
            realizadoPH: val,
            vencimPH: calcularVencimientoPH(p.mesRealizadoPH, val),
        }));
    };

    const handleMesRealizadoPH = (val: string) => {
        setForm((p) => ({
            ...p,
            mesRealizadoPH: val,
            vencimPH: calcularVencimientoPH(val, p.realizadoPH),
        }));
    };

    const ejecutarGuardado = (confirmarDuplicado: boolean) => {
        if (!socket || !activeId) return;
        setSaving(true);
        const { evidencias, ...formWithoutEvidencias } = form;
        const soloRecargaGuardado = estadoSoloPermiteRecarga(form.estadoExtintor);
        const bloqueado = estadoBloqueaServicio(form.estadoExtintor) && !soloRecargaGuardado;
        const componentesBloqueados = estadoBloqueaComponentes(form.estadoExtintor);
        const payload = {
            ...formWithoutEvidencias, id: activeId,
            sedeId: editingRow !== null ? form.sedeId : (form.sedeId ?? activeSedeId ?? null),
            nSerie: form.nSerie.trim() === "" ? "S/N" : form.nSerie.trim().toUpperCase(),
            nInterno: form.nInterno.trim().toUpperCase(),
            ma: (bloqueado || soloRecargaGuardado) ? "" : (form.ma ? "SI" : ""),
            ph: (bloqueado || soloRecargaGuardado) ? "" : (form.ph ? "SI" : ""),
            recarga: bloqueado ? "" : form.recarga,
            servicioExtra: estadoBloqueaServicioExtra(form.estadoExtintor) ? "" : form.servicioExtra, motivoBaja: form.motivoBaja,
            valvula: componentesBloqueados ? "" : form.valvula,
            manguera: componentesBloqueados ? "" : form.manguera,
            manometro: componentesBloqueados ? "" : form.manometro,
            tobera: componentesBloqueados ? "" : form.tobera,
            evidencia: JSON.stringify(evidencias || []),
        };
        const estadoSnapshot = {
            nSerie: payload.nSerie,
            estadoExtintor: payload.estadoExtintor,
            realizadoPH: payload.realizadoPH,
            mesRealizadoPH: payload.mesRealizadoPH,
            vencimPH: payload.vencimPH,
            ma: payload.ma,
            ph: payload.ph,
            recarga: payload.recarga,
            valvula: payload.valvula,
            manguera: payload.manguera,
            manometro: payload.manometro,
            tobera: payload.tobera,
            observaciones: payload.observaciones,
            servicioExtra: payload.servicioExtra,
            motivoBaja: payload.motivoBaja,
            evidencia: payload.evidencia,
        };
        const faltantes = getCamposFaltantes(payload as unknown as Extintor);
        const notificarGuardado = (mensaje: string) => {
            if (faltantes.length > 0) toastAviso(`${mensaje}, pero falta: ${faltantes.join(", ")}`);
            else showToast(mensaje);
        };
        if (editingRow !== null) {
            socket.emit("extintor:update", { ...payload, rowIndex: editingRow }, (res: any) => {
                setSaving(false);
                if (res?.success) {
                    notificarGuardado("Extintor actualizado");
                    clearFormBackup();
                    if (form.uid) setLastSavedExtintor({ uid: form.uid, isNew: false, estado: estadoSnapshot });
                    setView(returnView);
                    setEditingRow(null);
                    setForm(emptyExtintorForm());
                } else showToast(res?.error || "Error", "err");
            }
            );
        } else {
            socket.emit("extintor:add", { ...payload, confirmarDuplicado }, (res: any) => {
                setSaving(false);
                if (res?.success) {
                    notificarGuardado("Extintor guardado");
                    clearFormBackup();
                    if (res.uid) setLastSavedExtintor({ uid: res.uid, isNew: true, estado: estadoSnapshot });
                    setCoincidencias(null);
                    setView(returnView);
                    setForm(emptyExtintorForm());
                } else if (res?.coincidencias) {
                    setCoincidencias(res.coincidencias);
                } else showToast(res?.error || "Error", "err");
            });
        }
    };

    const handleExtintorSave = () => ejecutarGuardado(false);

    const confirmarYGuardar = () => ejecutarGuardado(true);

    const handleEdit = (ext: Extintor, from: View = "todos") => {
        setReturnView(from);
        setCoincidencias(null);
        const loadForm = () => {
            setForm({
                nSerie: ext.nSerie, nInterno: ext.nInterno, marca: ext.marca,
                fechaFabricacion: ext.fechaFabricacion, realizadoPH: ext.realizadoPH,
                mesRealizadoPH: ext.mesRealizadoPH || "",
                vencimPH: ext.vencimPH, estadoExtintor: ext.estadoExtintor,
                agenteExtintor: ext.agenteExtintor, peso: ext.peso,
                unidadPeso: (ext.unidadPeso as "KG" | "LB" | "LT" | "GAL") || "KG",
                ma: ext.ma === "SI", recarga: ext.recarga, ph: ext.ph === "SI",
                valvula: ext.valvula, manguera: ext.manguera, manometro: ext.manometro,
                tobera: ext.tobera, observaciones: ext.observaciones, servicioExtra: ext.servicioExtra || "",
                motivoBaja: ext.motivoBaja || "",
                sedeId: ext.sedeId ?? null,
                uid: ext.uid,
                evidencias: [],
            });
            setEditingRow(ext.rowIndex);
            setView("form");
        };

        if (ext.evidencia === "__HAS_EVIDENCIA__" && socket) {
            socket.emit("extintor:evidencia:get", { rowIndex: ext.rowIndex }, (res: any) => {
                if (res?.success) {
                    try {
                        const arr = JSON.parse(res.evidencia || "[]");
                        setForm(prev => ({ ...prev, evidencias: Array.isArray(arr) ? arr : [] }));
                    } catch { }
                }
            });
        }

        loadForm();
    };

    const openCrearExtintor = (from: View) => {
        setReturnView(from);
        setForm(emptyExtintorForm());
        setEditingRow(null);
        setCoincidencias(null);
        setView("form");
    };

    const emitDelete = (rowIndex: number, onDone?: (ok: boolean) => void) => {
        if (!socket) return;
        socket.emit("extintor:delete", { id: activeId, rowIndex, role }, (res: any) => {
            if (res?.success) showToast("Extintor eliminado");
            else showToast("Error al eliminar", "err");
            onDone?.(!!res?.success);
        }
        );
    };

    const handleDelete = async (rowIndex: number) => {
        const ok = await confirmar({
            titulo: "¿Eliminar este extintor?",
            mensaje: "Se moverá a Archivados y un administrador podrá restaurarlo.",
            textoConfirmar: "Eliminar",
            peligro: true,
        });
        if (!ok) return;
        emitDelete(rowIndex);
    };

    const setF = (k: keyof ExtintorFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

    const cerrarAvisoDuplicado = () => setCoincidencias(null);

    return {
        form,
        setForm,
        editingRow,
        setEditingRow,
        returnView,
        coincidencias,
        cerrarAvisoDuplicado,
        confirmarYGuardar,
        lastSavedExtintor,
        clearLastSavedExtintor,
        handleRealizadoPH,
        handleMesRealizadoPH,
        handleExtintorSave,
        handleEdit,
        openCrearExtintor,
        handleDelete,
        deleteExtintorSilent: emitDelete,
        setF,
    };
}
