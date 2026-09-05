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

export const exportarHojasPdf = async (elementIds: string[], nombreArchivo: string) => {
    const elementos = elementIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
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
        const imgData = canvas.toDataURL("image/png");
        const pageHeight = Math.min(pageHeightMax, (canvas.height * pageWidth) / canvas.width);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
    }
    pdf.save(nombreArchivo);
};