export const STICKER_TEMPLATE_URL = "/templates/sticker-extintor-v2.svg";

export type StickerData = {
    uid: string;
    nSerie: string;
    nInterno: string;
    empresaReceptora: string;
    capacidad: string;
    marca: string;
    fechaFab: string;
    ultimoPh: string;
    proximoPh: string;
};

let templateCache: string | null = null;

const getTemplate = async (): Promise<string> => {
    if (templateCache) return templateCache;
    const res = await fetch(STICKER_TEMPLATE_URL);
    if (!res.ok) throw new Error("No se pudo cargar el template de stickers");
    templateCache = await res.text();
    return templateCache;
};

const svgToDataUri = (svgTexto: string): string => {
    const encoded = encodeURIComponent(svgTexto)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
};

const escapeXml = (valor: string): string =>
    (valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const rellenarPlantilla = (svgTexto: string, data: StickerData): string => {
    const reemplazos: Record<string, string> = {
        "{{empresa_receptora}}": escapeXml(data.empresaReceptora || ""),
        "{{serie}}": escapeXml(data.nSerie || data.nInterno || ""),
        "{{capacidad}}": escapeXml(data.capacidad || ""),
        "{{marca}}": escapeXml(data.marca || ""),
        "{{fecha_fab}}": escapeXml(data.fechaFab || ""),
        "{{ultimo_ph}}": escapeXml(data.ultimoPh || ""),
        "{{proximo_ph}}": escapeXml(data.proximoPh || ""),
    };
    let resultado = svgTexto;
    for (const [marcador, valor] of Object.entries(reemplazos)) {
        resultado = resultado.split(marcador).join(valor);
    }
    return resultado;
};

export const generarStickerPng = async (data: StickerData): Promise<Blob> => {
    const [{ default: QRCode }, svgTemplate] = await Promise.all([
        import("qrcode"),
        getTemplate(),
    ]);

    const svgTexto = rellenarPlantilla(svgTemplate, data);

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgTexto, "image/svg+xml");
    const placeholder = doc.getElementById("qr-placeholder");
    if (!placeholder) throw new Error("No se encontró qr-placeholder en el template");

    const x = placeholder.getAttribute("x") || "0";
    const y = placeholder.getAttribute("y") || "0";
    const width = placeholder.getAttribute("width") || "135";
    const height = placeholder.getAttribute("height") || "135";

    const qrDataUrl = await QRCode.toDataURL(data.uid, { margin: 0, width: 512 });

    const image = doc.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("x", x);
    image.setAttribute("y", y);
    image.setAttribute("width", width);
    image.setAttribute("height", height);
    image.setAttributeNS("http://www.w3.org/1999/xlink", "href", qrDataUrl);
    image.setAttribute("href", qrDataUrl);
    placeholder.parentNode?.replaceChild(image, placeholder);

    doc.querySelectorAll("image").forEach((el) => {
        if (el === image) return;
        const href = el.getAttribute("href") || el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
        if (href && !href.startsWith("data:") && !/^https?:\/\//i.test(href)) {
            const absoluta = new URL(href, window.location.origin).href;
            el.setAttribute("href", absoluta);
            el.setAttributeNS("http://www.w3.org/1999/xlink", "href", absoluta);
        }
    });

    const svgRoot = doc.documentElement as unknown as SVGSVGElement;
    const svgWidth = parseFloat(svgRoot.getAttribute("width") || "0") || svgRoot.viewBox.baseVal.width || 1000;
    const svgHeight = parseFloat(svgRoot.getAttribute("height") || "0") || svgRoot.viewBox.baseVal.height || 1000;

    const svgSerializado = new XMLSerializer().serializeToString(doc);
    const svgDataUri = svgToDataUri(svgSerializado);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = svgDataUri;
    });

    const canvas = document.createElement("canvas");
    canvas.width = svgWidth;
    canvas.height = svgHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear el contexto de canvas");
    ctx.drawImage(img, 0, 0, svgWidth, svgHeight);

    let pngBlob: Blob | null;
    try {
        pngBlob = await new Promise<Blob | null>((resolve, reject) => {
            try {
                canvas.toBlob((b) => resolve(b), "image/png");
            } catch (err) {
                reject(err);
            }
        });
    } catch {
        throw new Error("El canvas quedó contaminado (Tainted Canvas). Revisa que todas las imágenes del template sean del mismo origen.");
    }
    if (!pngBlob) throw new Error("No se pudo generar el PNG");
    return pngBlob;
};

export const generarStickersZip = async (
    extintores: StickerData[],
    onProgreso?: (hecho: number, total: number) => void
): Promise<Blob> => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const usados = new Set<string>();

    for (let i = 0; i < extintores.length; i++) {
        const ext = extintores[i];
        const png = await generarStickerPng(ext);
        let nombre = (ext.nSerie || ext.nInterno || ext.uid).trim().replace(/[\\/:*?"<>|]/g, "-") || ext.uid;
        if (usados.has(nombre)) nombre = `${nombre}-${ext.uid.slice(0, 6)}`;
        usados.add(nombre);
        zip.file(`${nombre}.png`, png);
        onProgreso?.(i + 1, extintores.length);
    }

    return zip.generateAsync({ type: "blob" });
};

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