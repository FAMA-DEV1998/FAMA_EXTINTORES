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
    clearFormBackup: () => void
) {
    const [form, setForm] = useState<FormData>(emptyForm());
    const [editingRow, setEditingRow] = useState<number | null>(null);

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
            nSerie: form.nSerie.trim() === "" ? "S/N" : form.nSerie.trim().toUpperCase(),
            nInterno: form.nInterno.trim().toUpperCase(),
            ma: (bloqueado || soloRecargaGuardado) ? "" : (form.ma ? "SI" : ""),
            ph: (bloqueado || soloRecargaGuardado) ? "" : (form.ph ? "SI" : ""),
            recarga: bloqueado ? "" : form.recarga,
            servicioExtra: estadoBloqueaServicioExtra(form.estadoExtintor) ? "" : form.servicioExtra, motivoBaja: form.motivoBaja,
            evidencia: JSON.stringify(evidencias || []),
        };
        if (editingRow !== null) {
            socket.emit("extintor:update", { ...payload, rowIndex: editingRow }, (res: any) => {
                setSaving(false);
                if (res?.success) {
                    showToast("Actualizado ✓");
                    clearFormBackup();
                    setView("lista");
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
                    setView("lista");
                    setForm(emptyForm());
                } else showToast(res?.error || "Error", "err");
            });
        }
    };

    const handleEdit = (ext: Extintor) => {
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

    const handleDelete = (rowIndex: number) => {
        if (!socket || !confirm("¿Estás seguro de eliminar este extintor?")) return;
        socket.emit("extintor:delete", { id: activeId, rowIndex, role }, (res: any) => {
            if (res?.success) showToast("Extintor eliminado");
            else showToast("Error al eliminar", "err");
        }
        );
    };

    const setF = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

    return {
        form,
        setForm,
        editingRow,
        setEditingRow,
        handleRealizadoPH,
        handleExtintorSave,
        handleEdit,
        handleDelete,
        setF,
    };
}