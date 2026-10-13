export const descargarBlob = (blob: Blob, nombreArchivo: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

export const downloadBase64 = (b64: string, fileName: string, mimeType: string) => {
    const byteChars = atob(b64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
    }
    descargarBlob(new Blob([byteArray], { type: mimeType }), fileName);
};

export const compressImage = (
    file: File | Blob,
    maxWidth = 800,
    quality = 0.5
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let w = img.width;
                let h = img.height;

                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject(new Error("No canvas context"));
                ctx.drawImage(img, 0, 0, w, h);

                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                const b64 = dataUrl.split(",")[1];
                resolve(b64);
            };
            img.onerror = () => reject(new Error("Error cargando imagen"));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Error leyendo archivo"));
        reader.readAsDataURL(file);
    });
};

export const downloadEvidenciaAsPng = (b64Jpeg: string, fileName: string) => {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
            if (!blob) return;
            descargarBlob(blob, fileName.endsWith(".png") ? fileName : `${fileName}.png`);
        }, "image/png");
    };
    img.src = `data:image/jpeg;base64,${b64Jpeg}`;
};

export const parseEvidencias = (raw?: string): string[] => {
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
};
