

export const exportarElementoPdf = async (elementId: string, nombreArchivo: string) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error("No se encontró el contenido a exportar");

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
    ]);

    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
    pdf.save(nombreArchivo);
};

const generarHojasPdf = async (containerId: string) => {
    const contenedor = document.getElementById(containerId);
    if (!contenedor) throw new Error("No se encontró el contenido a exportar");
    const elementos = Array.from(contenedor.querySelectorAll<HTMLElement>(".certificado-print-page"));
    if (elementos.length === 0) throw new Error("No se encontró el contenido a exportar");

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
    ]);

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeightMax = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < elementos.length; i++) {
        const canvas = await html2canvas(elementos[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pageHeight = Math.min(pageHeightMax, (canvas.height * pageWidth) / canvas.width);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
    }
    return pdf;
};

export const exportarHojasPdf = async (containerId: string, nombreArchivo: string) => {
    const pdf = await generarHojasPdf(containerId);
    pdf.save(nombreArchivo);
};

/** PDF de las hojas en base64 (sin el prefijo data:), para publicarlo en la web. */
export const hojasPdfBase64 = async (containerId: string): Promise<string> => {
    const pdf = await generarHojasPdf(containerId);
    return pdf.output("datauristring").split(",")[1];
};
