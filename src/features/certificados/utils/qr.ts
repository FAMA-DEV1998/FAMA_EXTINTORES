import QRCode from "qrcode";

export const URL_RESENAS: string = import.meta.env.VITE_URL_RESENAS || "https://search.google.com/local/writereview?placeid=ChIJAZEIws3RBZER5r-fVpEmqhc";

const cache = new Map<string, string>();

export const qrPngDataUrl = (texto: string, color = "#111827", escala = 10): string => {
  const clave = `${texto}|${color}|${escala}`;
  const guardado = cache.get(clave);
  if (guardado) return guardado;
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const borde = 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = (n + borde * 2) * escala;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules.get(y, x)) ctx.fillRect((x + borde) * escala, (y + borde) * escala, escala, escala);
    }
  }
  const url = canvas.toDataURL("image/png");
  cache.set(clave, url);
  return url;
};
