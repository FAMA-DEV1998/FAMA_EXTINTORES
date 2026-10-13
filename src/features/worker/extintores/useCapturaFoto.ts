import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ExtintorFormData } from "../../../types";
import { compressImage } from "../../../utils/archivos";

const MAX_EVIDENCIAS = 5;

export function useCapturaFoto(
    setForm: Dispatch<SetStateAction<ExtintorFormData>>,
    showToast: (msg: string, type?: "ok" | "err") => void,
    cantidadActual: number
) {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [compressingPhoto, setCompressingPhoto] = useState(false);

    const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivos = Array.from(e.target.files || []);
        if (archivos.length === 0) return;

        setCompressingPhoto(true);
        try {
            const espacio = Math.max(0, MAX_EVIDENCIAS - cantidadActual);
            const fotos = await Promise.all(archivos.slice(0, espacio).map((f) => compressImage(f, 800, 0.5)));
            if (fotos.length > 0) {
                setForm((p) => ({ ...p, evidencias: [...p.evidencias, ...fotos].slice(0, MAX_EVIDENCIAS) }));
                showToast(fotos.length === 1 ? "Foto agregada" : `${fotos.length} fotos agregadas`);
            }
            if (archivos.length > espacio) showToast(`Máximo ${MAX_EVIDENCIAS} fotos permitidas`, "err");
        } catch {
            showToast("Error al procesar la foto", "err");
        } finally {
            setCompressingPhoto(false);
            e.target.value = "";
        }
    };

    const removeEvidencia = (index: number) => {
        setForm((p) => ({
            ...p,
            evidencias: p.evidencias.filter((_, i) => i !== index),
        }));
        showToast("Foto eliminada");
    };

    return {
        cameraInputRef,
        galleryInputRef,
        compressingPhoto,
        handleCameraCapture,
        removeEvidencia,
        MAX_EVIDENCIAS,
    };
}
