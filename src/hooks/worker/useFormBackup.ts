import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import type { FormData, WorkerView as View } from "../../types";

const FORM_STORAGE_KEY = "fama_worker_form_backup";

export function useFormBackup(
    socket: Socket | null,
    form: FormData,
    editingRow: number | null,
    activeIdRef: { current: string },
    view: View,
    empresaRazonSocial: string,
    changeActiveId: (id: string) => void,
    setForm: (f: FormData) => void,
    setEditingRow: (r: number | null) => void,
    setView: (v: View) => void,
    showToast: (msg: string, type?: "ok" | "err") => void
) {
    const persistFormState = () => {
        try {
            const snapshot = {
                form,
                editingRow,
                activeId: activeIdRef.current,
                view,
                empresaRazonSocial,
            };
            sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(snapshot));
        } catch { /* sessionStorage lleno o no disponible */ }
    };

    const clearFormBackup = () => {
        try { sessionStorage.removeItem(FORM_STORAGE_KEY); } catch { /* ignore */ }
    };

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(FORM_STORAGE_KEY);
            if (!raw) return;
            const snapshot = JSON.parse(raw);

            if (snapshot.form && snapshot.view === "form") {
                setForm(snapshot.form);
                setEditingRow(snapshot.editingRow ?? null);

                if (snapshot.activeId) {
                    changeActiveId(snapshot.activeId);
                    if (socket) {
                        socket.emit("empresa:get", { id: snapshot.activeId });
                        socket.emit("extintor:list", { id: snapshot.activeId });
                    }
                }

                setView("form");

                clearFormBackup();

                showToast("Formulario restaurado ✓");
            } else {
                clearFormBackup();
            }
        } catch {
            clearFormBackup();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket]);

    return { persistFormState, clearFormBackup };
}