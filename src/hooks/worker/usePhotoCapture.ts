import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FormData } from "../../types";
import { compressImage } from "../../utils/helpers";

const MAX_EVIDENCIAS = 5;

export function usePhotoCapture(
    setForm: Dispatch<SetStateAction<FormData>>,
    showToast: (msg: string, type?: "ok" | "err") => void
) {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [compressingPhoto, setCompressingPhoto] = useState(false);

    const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCompressingPhoto(true);
        try {
            const b64 = await compressImage(file, 800, 0.5);
            setForm((p) => {
                if (p.evidencias.length >= MAX_EVIDENCIAS) {
                    showToast(`Máximo ${MAX_EVIDENCIAS} fotos permitidas`, "err");
                    return p;
                }
                return { ...p, evidencias: [...p.evidencias, b64] };
            });
            showToast("Foto capturada ✓");
        } catch (err) {
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