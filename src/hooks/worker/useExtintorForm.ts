import { useState } from "react";
import type { Socket } from "socket.io-client";
import type { Extintor, FormData, WorkerView as View } from "../../types";
import { emptyForm, estadoBloqueaServicio, estadoBloqueaServicioExtra, estadoSoloPermiteRecarga } from "../../utils/helpers";

export function useExtintorForm(
    socket: Socket | null,
    role: string,
    activeId: string,
    setView: (v: View) => void,
    showToast: (msg: string, type?: "ok" | "err") => void,
    setSaving: (v: boolean) => void,
    clearFormBackup: () => void,
    activeSedeId?: string | null
) {
    const [form, setForm] = useState<FormData>(emptyForm());
    const [editingRow, setEditingRow] = useState<number | null>(null);
    const [returnView, setReturnView] = useState<View>("todos");
    const [lastSavedExtintor, setLastSavedExtintor] = useState<{ uid: string; isNew: boolean; estado: Record<string, any> } | null>(null);
    const clearLastSavedExtintor = () => setLastSavedExtintor(null);

    const handleRealizadoPH = (val: string) => {
        const yr = parseInt(val);
        setForm((p) => ({
            ...p,
            realizadoPH: val,
            vencimPH: !isNaN(yr) && val.length === 4 ? String(yr + 5) : p.vencimPH,
        }));
    };

    const handleExtintorSave = () => {
        if (!socket || !activeId) return;
        setSaving(true);
        const { evidencias, ...formWithoutEvidencias } = form;
        const soloRecargaGuardado = estadoSoloPermiteRecarga(form.estadoExtintor);
        const bloqueado = estadoBloqueaServicio(form.estadoExtintor) && !soloRecargaGuardado;
        const payload = {
            ...formWithoutEvidencias, id: activeId,
            sedeId: editingRow !== null ? form.sedeId : (form.sedeId ?? activeSedeId ?? null),
            nSerie: form.nSerie.trim() === "" ? "S/N" : form.nSerie.trim().toUpperCase(),
            nInterno: form.nInterno.trim().toUpperCase(),
            ma: (bloqueado || soloRecargaGuardado) ? "" : (form.ma ? "SI" : ""),
            ph: (bloqueado || soloRecargaGuardado) ? "" : (form.ph ? "SI" : ""),
            recarga: bloqueado ? "" : form.recarga,
            servicioExtra: estadoBloqueaServicioExtra(form.estadoExtintor) ? "" : form.servicioExtra, motivoBaja: form.motivoBaja,
            evidencia: JSON.stringify(evidencias || []),
        };
        const estadoSnapshot = {
            nSerie: payload.nSerie,
            estadoExtintor: payload.estadoExtintor,
            realizadoPH: payload.realizadoPH,
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
        if (editingRow !== null) {
            socket.emit("extintor:update", { ...payload, rowIndex: editingRow }, (res: any) => {
                setSaving(false);
                if (res?.success) {
                    showToast("Actualizado ✓");
                    clearFormBackup();
                    if (form.uid) setLastSavedExtintor({ uid: form.uid, isNew: false, estado: estadoSnapshot });
                    setView(returnView);
                    setEditingRow(null);
                    setForm(emptyForm());
                } else showToast(res?.error || "Error", "err");
            }
            );
        } else {
            socket.emit("extintor:add", payload, (res: any) => {
                setSaving(false);
                if (res?.success) {
                    showToast("Extintor guardado ✓");
                    clearFormBackup();
                    if (res.uid) setLastSavedExtintor({ uid: res.uid, isNew: true, estado: estadoSnapshot });
                    setView(returnView);
                    setForm(emptyForm());
                } else showToast(res?.error || "Error", "err");
            });
        }
    };

    const handleEdit = (ext: Extintor, from: View = "todos") => {
        setReturnView(from);
        const loadForm = () => {
            setForm({
                nSerie: ext.nSerie, nInterno: ext.nInterno, marca: ext.marca,
                fechaFabricacion: ext.fechaFabricacion, realizadoPH: ext.realizadoPH,
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
                    } catch { /* ignore parse error */ }
                }
            });
        }

        loadForm();
    };

    const openCrearExtintor = (from: View) => {
        setReturnView(from);
        setForm(emptyForm());
        setEditingRow(null);
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

    const handleDelete = (rowIndex: number) => {
        if (!confirm("¿Estás seguro de eliminar este extintor?")) return;
        emitDelete(rowIndex);
    };

    const setF = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

    return {
        form,
        setForm,
        editingRow,
        setEditingRow,
        returnView,
        lastSavedExtintor,
        clearLastSavedExtintor,
        handleRealizadoPH,
        handleExtintorSave,
        handleEdit,
        openCrearExtintor,
        handleDelete,
        deleteExtintorSilent: emitDelete,
        setF,
    };
}